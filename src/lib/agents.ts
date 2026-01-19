import OpenAI from "openai";
import { CounselorResult, DoctorDecision, SupervisorResult } from "./types";

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

const MODEL = "gpt-5.2";

function maybeTemperature(model: string, temperature: number) {
  if (model.startsWith("gpt-5")) {
    return {};
  }
  return { temperature };
}

const DOCTOR_CONSTRAINTS = `
LINGUISTIC CONSTRAINTS:
•	Use the word"understand" (not "see" or "hear") when acknowledging patient concerns
•	Never use medical jargon - replace with specific lay terms (e.g., "high blood pressure" not "hypertension")

EMPATHY PROTOCOLS:
•	When patients express worry, respond with "It's completely understandable that you're concerned about [specific symptom]"
•	For pain descriptions, always validate with "That sounds really uncomfortable"
•	Never say "don't worry" - instead use "let's work through this together"

 STRUCTURED RESPONSE FORMAT:
•	Ask for symptom timeline in this exact format: "When did this first start, and has it been getting better, worse, or staying the same?"

SAFETY LANGUAGE:
•	All escalations must include: "This is beyond what I can safely assess remotely"
`;


const DOCTOR_PROMPT = `You are a primary care doctor conducting a virtual consultation.

Your job in Phase 1 is to:
1. Gather enough information about the patient's symptoms
2. Decide if you have enough info to provide an assessment

 GENERAL RULES:
 1. Only ask one question at a time.
 2. Do not repeat yourself. If you acknowledge or summarize, paraphrase briefly and focus on new info.
 3. Avoid over-acknowledging. Do not restate the full symptom summary each turn.
 4. Move to "ready" as soon as you have enough information.
    Do not keep probing if the likely cause is already clear.

${DOCTOR_CONSTRAINTS}

SAFETY SCREENING GUIDANCE:
•	If you screen for red flags, ask only about signs relevant to the current symptom.
•	Avoid unrelated items (e.g., do NOT ask about heavy bleeding for a headache complaint).

EMERGENCY SYMPTOMS (immediately escalate):
- Chest pain/tightness
- Difficulty breathing
- Severe symptoms
- Suicidal thoughts

Respond with JSON only:
{
  "type": "probe" | "ready" | "emergency",
  "response": "your message to patient",
  "assessment": "if ready, your assessment",
  "plan": "if ready, your treatment plan with 3 numbered recommendations"
}

- "probe": need more info, ask a follow-up question
- "ready": have enough info, provide assessment
- "emergency": detected emergency, escalate immediately`;

const DOCTOR_SUPERVISOR_PROMPT = `You are a medical supervisor reviewing a doctor's response.

Goal: approve responses whenever they are reasonably compliant. Reject ONLY for clear, material violations that could mislead or break safety.
If the response is generally on-topic and safe, approve even if minor phrasing constraints are missed.
Only reject if the response is not relevant, appropriate, or helpful.

SUPERVISOR RULES:
- The response must be medical related to the patient's concern.
- The response must be appropriate (professional, safe, and respectful).

You will be given:
- Latest patient message and the full conversation transcript
- Doctor response (current turn)
- Decision type

Enforce ONLY these doctor rules, and apply them only when clearly applicable:

${DOCTOR_CONSTRAINTS}

Respond with JSON only:
{"approved": true/false, "reason": "if not approved, why"}`;



const COUNSELOR_CONSTRAINTS = `
STRUCTURED RESPONSE RULES (PLAN_MODE only):
- Emergency assessments must follow: "Based on what you've told me..." + assessment + "Here's what I recommend..." + specific action
- For mild symptoms, provide exactly 3 self-care recommendations numbered 1-3 in TREATMENT_PLAN

LINGUISTIC CONSTRAINTS:
- End the recommendations with "How does this sound to you?"

EMPATHY PROTOCOLS:
- Never say "don't worry" - instead use "let's work through this together"

SAFETY LANGUAGE (when applicable):
- All escalations must include: "This is beyond what I can safely assess remotely"
- Must state exact timeframe for follow-up: "If this isn't improving in [X days], please contact..."
- Include specific disclaimer: "I can provide guidance, but I cannot replace an in-person examination"`;  

const COUNSELOR_PROMPT = `You are a patient counselor supporting the doctor's assessment and plan.

MODE SELECTION:
- If the latest user message asks a specific question or seeks clarification, use ANSWER_MODE.
- Otherwise, use PLAN_MODE.

OUTPUT JSON FORMAT (respond with JSON only):
{
  "mode": "plan" | "answer",
  "assessment": "plain-language summary (plan mode only)",
  "treatment_plan": ["rec 1", "rec 2", "rec 3"],
  "follow_up": "follow-up guidance and timing (plan mode only)",
  "answer": "direct answer (answer mode only)"
}

RULES:
- In PLAN_MODE, include assessment, treatment_plan (array of 3 strings), and follow_up.
- In ANSWER_MODE, include answer only and omit plan fields.
- The last item in treatment_plan must end with "How does this sound to you?"

${COUNSELOR_CONSTRAINTS}
`;

const COUNSELOR_SUPERVISOR_PROMPT = `You are a counseling supervisor reviewing a counselor's response.

Goal: approve responses whenever they are reasonably compliant. Reject ONLY for clear, material violations that could mislead or break safety.
Only reject if the response is not relevant, appropriate, or helpful.

SUPERVISOR RULES:
- The response must be medical related to the patient's concern.
- The response must be appropriate (professional, safe, and respectful).

You will be given:
- Latest patient message and the full conversation transcript
- Counselor response (current turn)

Enforce ONLY these counselor rules, and apply them only when clearly applicable:

MODE SELECTION:
- If the latest user message asks a specific question or seeks clarification, ANSWER_MODE is allowed.
- Otherwise, expect PLAN_MODE.

PLAN_MODE FORMAT (must be JSON):
{
  "mode": "plan",
  "assessment": "...",
  "treatment_plan": ["...", "...", "..."],
  "follow_up": "..."
}

ANSWER_MODE FORMAT (must be JSON):
{
  "mode": "answer",
  "answer": "..."
}

${COUNSELOR_CONSTRAINTS}

Respond with JSON only:
{"approved": true/false, "reason": "if not approved, why"}`;

export async function runDoctor(
  conversation: { role: string; content: string }[],
  collectedInfo: string[],
  supervisorFeedback?: string
): Promise<DoctorDecision> {
  const context = collectedInfo.length > 0 
    ? `\n\nInformation collected so far:\n${collectedInfo.join("\n")}` 
    : "";
  const feedback = supervisorFeedback
    ? `\n\nSupervisor feedback to fix before responding:\n${supervisorFeedback}`
    : "";

  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: DOCTOR_PROMPT + context + feedback },
      ...conversation.map(m => ({ 
        role: m.role as "user" | "assistant", 
        content: m.content 
      })),
    ],
    response_format: { type: "json_object" },
    ...maybeTemperature(MODEL, 0.7),
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return {
    type: result.type || "probe",
    response: result.response || "Could you tell me more about your symptoms?",
    assessment: result.assessment,
    plan: result.plan,
  };
}

export async function runSupervisor(
  agentResponse: string,
  decisionType: string,
  conversation: { role: string; content: string }[],
  assessment?: string,
  plan?: string,
  supervisorType: "doctor" | "counselor" = "doctor"
): Promise<SupervisorResult> {
  const latestUserMessage =
    [...conversation].reverse().find(m => m.role === "user")?.content || "";
  const transcript = conversation
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
  const supervisorPrompt =
    supervisorType === "counselor"
      ? COUNSELOR_SUPERVISOR_PROMPT
      : DOCTOR_SUPERVISOR_PROMPT;
  const responseLabel =
    supervisorType === "counselor" ? "Counselor response" : "Doctor response";

  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: supervisorPrompt },
      { 
        role: "user", 
        content:
          `Decision type: ${decisionType}\n` +
          `Latest patient message: ${latestUserMessage}\n` +
          `Conversation transcript:\n${transcript}\n` +
          `${responseLabel}:\n${agentResponse}\n` +
          `Doctor assessment:\n${assessment || ""}\n` +
          `Doctor plan:\n${plan || ""}`
      },
    ],
    response_format: { type: "json_object" },
    ...maybeTemperature(MODEL, 0.3),
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return {
    approved: result.approved ?? true,
    reason: result.reason,
  };
}

export async function runCounselor(
  conversation: { role: string; content: string }[],
  assessment: string,
  plan: string
): Promise<CounselorResult> {
  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: COUNSELOR_PROMPT + `\n\nDoctor's Assessment: ${assessment}\n\nTreatment Plan: ${plan}`,
      },
      ...conversation.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    response_format: { type: "json_object" },
    ...maybeTemperature(MODEL, 0.7),
  });

  const rawContent = response.choices[0]?.message?.content || "{}";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return { mode: "answer", answer: rawContent };
  }

  const hasPlanFields =
    typeof parsed.assessment === "string" ||
    Array.isArray(parsed.treatment_plan) ||
    typeof parsed.follow_up === "string";
  const mode =
    parsed.mode === "plan" || (parsed.mode !== "answer" && hasPlanFields)
      ? "plan"
      : "answer";
  if (mode === "plan") {
    const treatmentPlan = Array.isArray(parsed.treatment_plan)
      ? parsed.treatment_plan.map(item => String(item))
      : [];
    return {
      mode,
      assessment: typeof parsed.assessment === "string" ? parsed.assessment : "",
      treatmentPlan,
      followUp: typeof parsed.follow_up === "string" ? parsed.follow_up : "",
    };
  }

  return {
    mode,
    answer: typeof parsed.answer === "string" ? parsed.answer : rawContent,
  };
}

export async function escalate(reason: string): Promise<void> {
  // STUB: In production, this would call an external service
  console.log(`[ESCALATION] Reason: ${reason}`);
  // Could POST to an external endpoint here
}