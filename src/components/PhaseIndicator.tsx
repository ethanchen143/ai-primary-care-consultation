"use client";

import { Phase } from "@/lib/types";

interface PhaseIndicatorProps {
  phase: Phase;
}

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const phases = [
    { key: "collecting", label: "Information Gathering", icon: "📋" },
    { key: "counseling", label: "Assessment & Plan", icon: "💊" },
  ];

  const isEscalated = phase === "escalated";
  const currentIndex = phase === "collecting" ? 0 : phase === "counseling" ? 1 : -1;

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-10 px-4 py-4">
      <div className="max-w-3xl mx-auto">
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
            isEscalated 
              ? "bg-gradient-to-br from-red-400 to-rose-500" 
              : "bg-gradient-to-br from-emerald-400 to-teal-500"
          }`}>
            {isEscalated ? (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </div>
          <div>
            <h1 className="font-semibold text-lg text-slate-800">
              {isEscalated ? "Human Support Requested" : "Amigo Health"}
            </h1>
            <p className="text-sm text-slate-500">
              {isEscalated ? "A provider will contact you shortly" : "Virtual Primary Care"}
            </p>
          </div>
        </div>

        {/* Phase Progress */}
        {!isEscalated && (
          <div className="flex items-center gap-2">
            {phases.map((p, index) => {
              const isActive = index === currentIndex;
              const isComplete = index < currentIndex;
              
              return (
                <div key={p.key} className="flex items-center">
                  {/* Phase Pill */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-offset-1" 
                      : isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                    {isComplete && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Connector */}
                  {index < phases.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 ${
                      isComplete ? "bg-emerald-500" : "bg-slate-200"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Emergency Banner */}
        {isEscalated && (
          <div className="mt-3 bg-red-100 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-red-800">
              <strong>If this is a medical emergency:</strong> Call{" "}
              <a href="tel:911" className="font-bold underline">911</a>{" "}
              immediately.
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
