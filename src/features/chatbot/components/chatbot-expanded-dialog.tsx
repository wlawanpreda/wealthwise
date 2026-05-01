"use client";

import { cn } from "@/lib/utils";
import { useChatbotStore } from "@/stores/chatbot-store";
import { usePinnedSnippetsStore } from "@/stores/pinned-snippets-store";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bookmark, RotateCcw, Sparkles, X } from "lucide-react";
import * as React from "react";
import { ChatbotPanel } from "./chatbot-panel";
import { PinnedSnippetsPanel } from "./pinned-snippets-panel";

/**
 * Larger overlay view of the chatbot. Shares state with the inline sidebar
 * panel via `useChatbotStore` so the conversation stays in sync as the user
 * toggles between the two. Right side hosts an optional pinned-snippets
 * panel — collapsed by default to give the conversation full width.
 */
export function ChatbotExpandedDialog() {
  const expanded = useChatbotStore((s) => s.expanded);
  const setExpanded = useChatbotStore((s) => s.setExpanded);
  const reset = useChatbotStore((s) => s.reset);
  const messageCount = useChatbotStore((s) => s.messages.length);
  const snippetCount = usePinnedSnippetsStore((s) => s.snippets.length);

  const [showSnippets, setShowSnippets] = React.useState(false);

  // Auto-open the panel the first time a snippet is pinned, so users discover
  // where pinned items live. Subsequent pins respect the user's manual toggle.
  const prevSnippetCountRef = React.useRef(snippetCount);
  React.useEffect(() => {
    if (snippetCount > prevSnippetCountRef.current && expanded && snippetCount === 1) {
      setShowSnippets(true);
    }
    prevSnippetCountRef.current = snippetCount;
  }, [snippetCount, expanded]);

  return (
    <DialogPrimitive.Root open={expanded} onOpenChange={setExpanded}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-brand-text/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-[80] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-brand-border bg-white shadow-2xl flex flex-col focus:outline-none transition-[width] duration-300",
            "h-[min(80vh,720px)]",
            showSnippets ? "w-[min(1200px,calc(100vw-32px))]" : "w-[min(900px,calc(100vw-32px))]",
          )}
        >
          <header className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Sparkles size={16} />
              </div>
              <div>
                <DialogPrimitive.Title className="text-sm font-black text-brand-text uppercase tracking-widest">
                  สถาปนิกการเงิน AI
                </DialogPrimitive.Title>
                <p className="text-[10px] font-bold text-brand-muted">
                  วิเคราะห์ข้อมูลพอร์ตของคุณแบบเรียลไทม์
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSnippets((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-md transition-colors",
                  showSnippets
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "text-brand-secondary hover:text-blue-600 hover:bg-blue-50",
                )}
                aria-pressed={showSnippets}
                aria-label="สลับการแสดงบันทึก"
              >
                <Bookmark
                  size={12}
                  className={showSnippets ? "fill-white" : ""}
                  aria-hidden="true"
                />
                บันทึก
                {snippetCount > 0 && (
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full font-black",
                      showSnippets ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700",
                    )}
                  >
                    {snippetCount}
                  </span>
                )}
              </button>
              {messageCount > 1 && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-muted hover:text-red-500 transition-colors px-2 py-1.5 rounded-md hover:bg-red-50"
                  aria-label="ล้างประวัติการสนทนา"
                >
                  <RotateCcw size={12} />
                  ล้างประวัติ
                </button>
              )}
              <DialogPrimitive.Close
                className="p-2 rounded-lg text-brand-secondary hover:bg-brand-surface hover:text-brand-text transition-colors"
                aria-label="ปิดหน้าต่าง"
              >
                <X size={16} />
              </DialogPrimitive.Close>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden min-h-0">
            <div className="flex-1 flex flex-col overflow-hidden px-6 py-4 min-h-0">
              <ChatbotPanel variant="expanded" />
            </div>
            {showSnippets && (
              <aside className="w-[300px] shrink-0">
                <PinnedSnippetsPanel />
              </aside>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
