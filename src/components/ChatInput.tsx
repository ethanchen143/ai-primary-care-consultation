"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-4">
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Consultation ended" : "Describe your symptoms..."}
          rows={1}
          className={`flex-1 resize-none rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
            disabled
              ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
              : "bg-white border-slate-200 text-slate-700"
          }`}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md ${
            disabled || !message.trim()
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:shadow-lg active:scale-95"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        Press Enter to send
      </p>
    </div>
  );
}
