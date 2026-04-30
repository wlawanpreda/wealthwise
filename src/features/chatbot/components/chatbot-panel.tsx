"use client";

import { cn } from "@/lib/utils";
import { useDerivedFinancials, useFinancialPlanSnapshot } from "@/stores/financial-store";
import { Loader2, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "วิเคราะห์ภาพรวมและแนะนำ",
  "หนี้สินของฉันเยอะไปไหม?",
  "เงินสำรองฉุกเฉินเพียงพอหรือยัง?",
  "ต้องออมเดือนละเท่าไหร่ให้ถึงเป้าหมาย?",
];

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  text: "สวัสดีครับ ผมคือสถาปนิกการเงิน AI ยินดีช่วยคุณวางแผนจัดการงบประมาณและหนี้สินครับ",
};

export function ChatbotPanel() {
  const plan = useFinancialPlanSnapshot();
  const { pillars } = useDerivedFinancials();
  const [messages, setMessages] = React.useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll-to-bottom needs to fire when message list or loading state changes
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "assistant", text: "" },
    ]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, pillars, message: trimmed }),
      });

      if (!res.ok || !res.body) {
        throw new Error("AI service unavailable");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", text: acc };
          return copy;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          text: "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อระบบ AI กรุณาลองใหม่ภายหลัง",
        };
        return copy;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div
              key={`${i}-${msg.role}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-3 rounded-xl text-[13px] leading-relaxed border",
                msg.role === "user"
                  ? "bg-blue-600 text-white border-blue-700 ml-6 rounded-tr-none shadow-sm"
                  : "bg-brand-surface text-brand-text border-brand-border rounded-tl-none",
              )}
            >
              {msg.role === "assistant" && (
                <p className="text-[10px] font-bold text-blue-700 mb-1 uppercase tracking-widest">
                  สถาปนิกการเงิน
                </p>
              )}
              <div className={cn(msg.role === "user" ? "text-white" : "text-brand-text")}>
                {msg.text ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
                      ),
                      li: ({ children }) => <li className="mb-0.5">{children}</li>,
                      strong: ({ children }) => (
                        <strong
                          className={cn(
                            "font-bold",
                            msg.role === "assistant" ? "text-blue-700" : "text-white",
                          )}
                        >
                          {children}
                        </strong>
                      ),
                      code: ({ children }) => (
                        <code className="bg-brand-bg px-1 rounded font-mono text-[11px]">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : isLoading && i === messages.length - 1 ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : null}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!isLoading && messages.length < 5 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="text-[11px] font-bold py-1.5 px-3 rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-brand-border mt-auto">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="สอบถามข้อมูลพอร์ต..."
            className="w-full bg-brand-bg border-none rounded-lg p-3 pr-10 text-[13px] font-medium text-brand-text focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-brand-secondary"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-brand-border transition-colors text-brand-secondary hover:text-blue-600 disabled:opacity-30"
            aria-label="Send"
          >
            <Send size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
