"use client";

import { cn } from "@/lib/utils";
import { useChatbotStore, useChatbotView } from "@/stores/chatbot-store";
import { useDerivedFinancials, useFinancialPlanSnapshot } from "@/stores/financial-store";
import { usePinnedSnippetsStore } from "@/stores/pinned-snippets-store";
import { Bookmark, Loader2, Maximize2, Send, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "วิเคราะห์ภาพรวมและแนะนำ",
  "หนี้สินของฉันเยอะไปไหม?",
  "เงินสำรองฉุกเฉินเพียงพอหรือยัง?",
  "ต้องออมเดือนละเท่าไหร่ให้ถึงเป้าหมาย?",
];

interface Props {
  /**
   * `compact` is the sidebar inline view — small bubbles, smaller text,
   * an "ขยาย" button that opens the dialog.
   * `expanded` is the dialog view — full-width bubbles, larger text,
   * no expand button.
   */
  variant?: "compact" | "expanded";
}

export function ChatbotPanel({ variant = "compact" }: Props) {
  const plan = useFinancialPlanSnapshot();
  const { pillars } = useDerivedFinancials();
  const { messages, input, isLoading } = useChatbotView();
  const setInput = useChatbotStore((s) => s.setInput);
  const setExpanded = useChatbotStore((s) => s.setExpanded);
  const send = useChatbotStore((s) => s.send);
  const pin = usePinnedSnippetsStore((s) => s.pin);
  const unpinByText = usePinnedSnippetsStore((s) => s.unpinByText);
  const isPinned = usePinnedSnippetsStore((s) => s.isPinned);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const isExpanded = variant === "expanded";

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll-to-bottom needs to fire when message list or loading state changes
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = (text: string) => {
    void send(text, plan, pillars);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Header — only in compact view; the dialog has its own title bar */}
      {!isExpanded && (
        <div className="flex items-center justify-between mb-3 -mt-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={11} className="text-blue-600" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
              AI Advisor
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
            aria-label="ขยายหน้าต่างแชท"
          >
            <Maximize2 size={11} />
            ขยาย
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto pb-4 scrollbar-hide",
          isExpanded ? "space-y-4 px-1" : "space-y-3",
        )}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div
              key={`${i}-${msg.role}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-xl border leading-relaxed group/msg",
                isExpanded ? "p-4 text-sm" : "p-3 text-[13px]",
                msg.role === "user"
                  ? cn(
                      "bg-blue-600 text-white border-blue-700 rounded-tr-none shadow-sm",
                      // user bubble shifts right; in compact we use a smaller
                      // margin so 320px sidebar doesn't truncate the text
                      isExpanded ? "ml-12 md:ml-24" : "ml-2",
                    )
                  : "bg-brand-surface text-brand-text border-brand-border rounded-tl-none",
              )}
            >
              {msg.role === "assistant" && (
                <div
                  className={cn(
                    "flex items-center justify-between gap-2",
                    isExpanded ? "mb-2" : "mb-1",
                  )}
                >
                  <p
                    className={cn(
                      "font-bold text-blue-700 uppercase tracking-widest",
                      isExpanded ? "text-[11px]" : "text-[10px]",
                    )}
                  >
                    สถาปนิกการเงิน
                  </p>
                  {(() => {
                    // Pin only after the message has actual content. While the
                    // last assistant bubble is still streaming, hide the button
                    // to avoid pinning a partial answer.
                    const isStillStreaming =
                      isLoading && i === messages.length - 1 && msg.text.length === 0;
                    if (!msg.text || isStillStreaming) return null;
                    const pinned = isPinned(msg.text);
                    // Find the user question that prompted this answer (the
                    // most recent user message before this assistant message).
                    const question = (() => {
                      for (let j = i - 1; j >= 0; j--) {
                        const candidate = messages[j];
                        if (candidate?.role === "user") return candidate.text;
                      }
                      return undefined;
                    })();
                    return (
                      <button
                        type="button"
                        onClick={() => (pinned ? unpinByText(msg.text) : pin(msg.text, question))}
                        className={cn(
                          "shrink-0 inline-flex items-center justify-center rounded-md transition-all",
                          isExpanded ? "p-1.5" : "p-1",
                          pinned
                            ? "text-blue-600 hover:bg-blue-50"
                            : "text-brand-muted opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 hover:text-blue-600 hover:bg-blue-50",
                        )}
                        aria-label={pinned ? "เลิกปักหมุด" : "ปักหมุดคำตอบ"}
                        title={pinned ? "เลิกปักหมุด" : "ปักหมุดคำตอบ"}
                      >
                        <Bookmark
                          size={isExpanded ? 13 : 11}
                          className={pinned ? "fill-blue-600" : ""}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })()}
                </div>
              )}
              <div className={cn(msg.role === "user" ? "text-white" : "text-brand-text")}>
                {msg.text ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => (
                        <ul
                          className={cn("list-disc mb-2 space-y-1", isExpanded ? "pl-5" : "pl-4")}
                        >
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol
                          className={cn(
                            "list-decimal mb-2 space-y-1",
                            isExpanded ? "pl-5" : "pl-4",
                          )}
                        >
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => <li className="mb-0.5">{children}</li>,
                      h1: ({ children }) => (
                        <h2 className="text-base font-black mb-2 mt-3">{children}</h2>
                      ),
                      h2: ({ children }) => (
                        <h3 className="text-sm font-black mb-1.5 mt-3">{children}</h3>
                      ),
                      h3: ({ children }) => (
                        <h4 className="text-sm font-bold mb-1 mt-2">{children}</h4>
                      ),
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
                        <code
                          className={cn(
                            "bg-brand-bg px-1 rounded font-mono",
                            isExpanded ? "text-xs" : "text-[11px]",
                          )}
                        >
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-brand-bg p-3 rounded-lg overflow-x-auto text-xs my-2">
                          {children}
                        </pre>
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
        <div className={cn("flex flex-wrap gap-2", isExpanded ? "mb-4 px-1" : "mb-4")}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSend(s)}
              className={cn(
                "font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm",
                isExpanded ? "text-xs py-2 px-4" : "text-[11px] py-1.5 px-3",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn("border-t border-brand-border mt-auto", isExpanded ? "pt-4 px-1" : "pt-4")}
      >
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="สอบถามข้อมูลพอร์ต..."
            className={cn(
              "w-full bg-brand-bg border-none rounded-lg font-medium text-brand-text focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-brand-secondary",
              isExpanded ? "p-4 pr-12 text-sm" : "p-3 pr-10 text-[13px]",
            )}
          />
          <button
            type="button"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-md hover:bg-brand-border transition-colors text-brand-secondary hover:text-blue-600 disabled:opacity-30",
              isExpanded ? "right-4 p-2" : "right-3 p-1.5",
            )}
            aria-label="Send"
          >
            <Send size={isExpanded ? 16 : 14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
