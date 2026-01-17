// Simple two-phase flow
export type Phase = "collecting" | "counseling" | "escalated" | "completed";

export interface ChatState {
  phase: Phase;
  collectedInfo: string[];
  assessment?: string;
  plan?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isEmergency?: boolean;
  counselor?: CounselorResult;
}

export interface DoctorDecision {
  type: "probe" | "ready" | "emergency";
  response: string;
  assessment?: string;
  plan?: string;
}

export interface SupervisorResult {
  approved: boolean;
  reason?: string;
}

export type CounselorMode = "plan" | "answer";

export interface CounselorResult {
  mode: CounselorMode;
  assessment?: string;
  treatmentPlan?: string[];
  followUp?: string;
  answer?: string;
}
