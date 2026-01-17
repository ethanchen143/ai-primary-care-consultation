import { NextRequest, NextResponse } from "next/server";
import { ChatState, CounselorResult, Phase } from "@/lib/types";
import { normalizeTreatmentPlan } from "@/lib/counselorFormatting";
import {
  runDoctor,
  runSupervisor,
  runCounselor,
  escalate,
} from "@/lib/agents";

const MAX_SUPERVISOR_RETRIES = 3;

function formatCounselorResponse(counselor?: CounselorResult): string {
  if (!counselor) return "";
  if (counselor.mode === "answer") {
    return counselor.answer || "";
  }

  const assessment = counselor.assessment || "";
  const followUp = counselor.followUp || "";
  const planItems = counselor.treatmentPlan || [];
  const { items: normalizedPlanItems, closingLine } = normalizeTreatmentPlan(planItems, true);
  const planText = normalizedPlanItems
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");

  return [
    "ASSESSMENT:",
    assessment,
    "",
    "TREATMENT_PLAN:",
    planText,
    closingLine,
    "",
    "FOLLOW_UP:",
    followUp,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const { message, chatState, history } = await request.json();
    
    let state: ChatState = chatState || {
      phase: "collecting",
      collectedInfo: [],
    };

    const conversation = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Phase 1: Doctor collects info
    if (state.phase === "collecting") {
      let doctorDecision;
      let approved = false;
      let attempts = 0;
      let supervisorFeedback: string | undefined;

      // Run doctor with supervisor validation (max 3 attempts)
      while (!approved && attempts < MAX_SUPERVISOR_RETRIES) {
        attempts++;
        doctorDecision = await runDoctor(
          conversation,
          state.collectedInfo,
          supervisorFeedback
        );

        console.log(
          `Doctor output (attempt ${attempts}): ${JSON.stringify(doctorDecision)}`
        );

        if (doctorDecision.type === "ready" || doctorDecision.type === "emergency") {
          approved = true;
          break;
        }

        const supervisorResult = await runSupervisor(
          doctorDecision.response,
          doctorDecision.type,
          conversation,
          doctorDecision.assessment,
          doctorDecision.plan
        );
        
        approved = supervisorResult.approved;
        
        if (!approved) {
          console.log(`Supervisor rejected (attempt ${attempts}): ${supervisorResult.reason}`);
          supervisorFeedback = supervisorResult.reason || "Supervisor rejected. Ensure all constraints are met.";
        }
      }

      // If supervisor keeps rejecting, escalate
      if (!approved) {
        await escalate("Supervisor validation failed after 3 attempts");
        return NextResponse.json({
          response: "I want to make sure you get the best care possible. A human healthcare provider will be in touch with you shortly to continue this conversation.",
          newState: { ...state, phase: "escalated" as Phase },
          isEmergency: true,
          showPhaseTransition: false,
        });
      }

      // Handle doctor's decision
      if (doctorDecision!.type === "emergency") {
        await escalate(`Emergency symptoms detected: ${message}`);
        return NextResponse.json({
          response: doctorDecision!.response + "\n\nA human healthcare provider will be in touch with you shortly.",
          newState: { ...state, phase: "escalated" as Phase },
          isEmergency: true,
          showPhaseTransition: false,
        });
      }

      if (doctorDecision!.type === "ready") {
        const counselorResponse = await runCounselor(
          conversation,
          doctorDecision!.assessment || "",
          doctorDecision!.plan || ""
        );

        // Store assessment and plan, transition to Phase 2
        return NextResponse.json({
          response: formatCounselorResponse(counselorResponse),
          counselor: counselorResponse,
          newState: {
            ...state,
            phase: "counseling" as Phase,
            collectedInfo: [...state.collectedInfo, message],
            assessment: doctorDecision!.assessment,
            plan: doctorDecision!.plan,
          },
          isEmergency: false,
          showPhaseTransition: true,
        });
      }

      // Still probing
      return NextResponse.json({
        response: doctorDecision!.response,
        newState: {
          ...state,
          collectedInfo: [...state.collectedInfo, message],
        },
        isEmergency: false,
        showPhaseTransition: false,
      });
    }

    // Phase 2: Counselor explains and follows up
    if (state.phase === "counseling") {
      const counselorResponse = await runCounselor(
        conversation,
        state.assessment || "",
        state.plan || ""
      );

      return NextResponse.json({
        response: formatCounselorResponse(counselorResponse),
        counselor: counselorResponse,
        newState: state,
        isEmergency: false,
        showPhaseTransition: false,
      });
    }

    // Escalated or completed - no more responses
    return NextResponse.json({
      response: "This consultation has ended. Please contact a healthcare provider if you need further assistance.",
      newState: state,
      isEmergency: false,
      showPhaseTransition: false,
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({
      response: "I apologize, but I'm having trouble right now. If this is an emergency, please call 911 immediately.",
      newState: { phase: "escalated", collectedInfo: [] },
      isEmergency: true,
      showPhaseTransition: false,
    }, { status: 500 });
  }
}
