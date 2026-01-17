"use client";

import { CounselorResult, Message, Phase } from "@/lib/types";
import { normalizeTreatmentPlan } from "@/lib/counselorFormatting";

interface ChatMessageProps {
  message: Message;
  phase: Phase;
}

export function ChatMessage({ message, phase }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isEmergency = message.isEmergency;
  const counselor = message.counselor;
  
  // Determine role label based on phase
  const getRoleLabel = () => {
    if (isUser) return null;
    if (isEmergency) return "System";
    if (phase === "collecting") return "Dr. Amigo";
    if (phase === "counseling") return "Health Counselor";
    return null;
  };

  const roleLabel = getRoleLabel();

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      {!isUser && (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md flex-shrink-0 ${
          isEmergency
            ? "bg-gradient-to-br from-red-400 to-rose-500"
            : phase === "counseling"
            ? "bg-gradient-to-br from-blue-400 to-indigo-500"
            : "bg-gradient-to-br from-emerald-400 to-teal-500"
        }`}>
          {isEmergency ? (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : phase === "counseling" ? (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </div>
      )}

      {isUser && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-md flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}

      {/* Message bubble */}
      <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
        isUser
          ? "bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-tr-md"
          : isEmergency
          ? "bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-tl-md"
          : "bg-white border border-slate-100 rounded-tl-md"
      }`}>
        {/* Role label */}
        {roleLabel && !isUser && (
          <div className={`text-xs font-semibold mb-1 ${
            isEmergency ? "text-red-600" : phase === "counseling" ? "text-indigo-600" : "text-emerald-600"
          }`}>
            {roleLabel}
          </div>
        )}
        
        {isEmergency && !isUser && (
          <div className="flex items-center gap-2 mb-2 text-red-600 font-medium text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Important Notice
          </div>
        )}
        
        <div className={`whitespace-pre-wrap leading-relaxed ${
          isUser ? "text-white" : isEmergency ? "text-slate-800" : "text-slate-700"
        }`}>
          {renderMessageContent(counselor, isUser, message.content)}
        </div>
        
        <div className={`text-xs mt-2 ${isUser ? "text-slate-400" : "text-slate-400"}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function renderMessageContent(
  counselor: CounselorResult | undefined,
  isUser: boolean,
  fallbackContent: string
) {
  if (isUser || !counselor) {
    return fallbackContent;
  }

  if (counselor.mode === "answer") {
    return counselor.answer || fallbackContent;
  }

  const assessment = counselor.assessment || "";
  const followUp = counselor.followUp || "";
  const planItems = counselor.treatmentPlan || [];
  const { items: normalizedPlanItems, closingLine } = normalizeTreatmentPlan(planItems, true);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Assessment
        </div>
        <div>{assessment}</div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Treatment Plan
        </div>
        <ol className="list-decimal pl-5 space-y-1">
          {normalizedPlanItems.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ol>
        {closingLine && <div className="mt-2">{closingLine}</div>}
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Follow Up
        </div>
        <div>{followUp}</div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
