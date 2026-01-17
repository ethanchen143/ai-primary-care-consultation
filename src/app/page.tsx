"use client";

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Message, ChatState } from "@/lib/types";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { PhaseIndicator } from "@/components/PhaseIndicator";

export default function Home() {
  const [phaseOneMessages, setPhaseOneMessages] = useState<Message[]>([]);
  const [phaseTwoMessages, setPhaseTwoMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatState, setChatState] = useState<ChatState>({
    phase: "collecting",
    collectedInfo: [],
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [phaseOneMessages, phaseTwoMessages]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const greeting: Message = {
      id: uuidv4(),
      role: "assistant",
      content: "Hello, I'm Dr. Amigo, your virtual primary care assistant. I'm here to help understand what you're experiencing today.\n\nWhat brings you in?",
      timestamp: new Date(),
    };
    setPhaseOneMessages([greeting]);
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const inCounseling = chatState.phase === "counseling";
    const history = inCounseling ? phaseTwoMessages : phaseOneMessages;

    if (inCounseling) {
      setPhaseTwoMessages((prev) => [...prev, userMessage]);
    } else {
      setPhaseOneMessages((prev) => [...prev, userMessage]);
    }
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          chatState,
          history,
        }),
      });

      const data = await response.json();
      const nextState: ChatState = data.newState || chatState;

      // If transitioning to Phase 2, show transition message
      if (data.showPhaseTransition) {
        const transitionMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: "───────────────────────────\n📋 **Assessment Complete**\n\nI now have enough information to provide my assessment. Let me hand you over to our patient counselor who will explain the findings and next steps.\n───────────────────────────",
          timestamp: new Date(),
        };
        setPhaseOneMessages((prev) => [...prev, transitionMessage]);
        
        // Small delay before counselor response
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const assistantMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        isEmergency: data.isEmergency,
        counselor: data.counselor,
      };

      if (nextState.phase === "counseling") {
        setPhaseTwoMessages((prev) => (
          data.showPhaseTransition ? [assistantMessage] : [...prev, assistantMessage]
        ));
      } else {
        setPhaseOneMessages((prev) => [...prev, assistantMessage]);
      }
      setChatState(nextState);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "I apologize, but I'm having trouble responding right now. If this is an emergency, please call 911 immediately.",
        timestamp: new Date(),
        isEmergency: true,
      };
      if (inCounseling) {
        setPhaseTwoMessages((prev) => [...prev, errorMessage]);
      } else {
        setPhaseOneMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || chatState.phase === "escalated" || chatState.phase === "completed";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-3xl mx-auto flex flex-col h-screen">
        {/* Phase Indicator */}
        <PhaseIndicator phase={chatState.phase} />

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
              <span>Phase 1 · Information Gathering</span>
              {chatState.phase !== "collecting" && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  Locked
                </span>
              )}
            </div>

            {phaseOneMessages.map((message) => (
              <ChatMessage key={message.id} message={message} phase="collecting" />
            ))}
            
            {isLoading && chatState.phase !== "counseling" && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="bg-white rounded-2xl rounded-tl-md px-5 py-3 shadow-sm border border-slate-100">
                  <div className="typing-indicator flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {(chatState.phase === "counseling" || phaseTwoMessages.length > 0) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                <span>Phase 2 · Assessment & Plan</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  New Chat
                </span>
              </div>

              {phaseTwoMessages.map((message) => (
                <ChatMessage key={message.id} message={message} phase="counseling" />
              ))}

              {isLoading && chatState.phase === "counseling" && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-md px-5 py-3 shadow-sm border border-slate-100">
                    <div className="typing-indicator flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSend={sendMessage} disabled={isDisabled} />
      </div>
    </main>
  );
}
