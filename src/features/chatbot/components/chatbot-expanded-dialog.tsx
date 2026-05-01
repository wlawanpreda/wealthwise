"use client";

import { useChatbotStore } from "@/stores/chatbot-store";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { RotateCcw, Sparkles, X } from "lucide-react";
import { ChatbotPanel } from "./chatbot-panel";

/**
 * Larger overlay view of the chatbot. Shares state with the inline sidebar
 * panel via `useChatbotStore` so the conversation stays in sync as the user
 * toggles between the two.
 */
export function ChatbotExpandedDialog() {
  const expanded = useChatbotStore((s) => s.expanded);
  const setExpanded = useChatbotStore((s) => s.setExpanded);
  const reset = useChatbotStore((s) => s.reset);
  const messageCount = useChatbotStore((s) => s.messages.length);

  return (
    <DialogPrimitive.Root open={expanded} onOpenChange={setExpanded}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-brand-text/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[80] w-[min(900px,calc(100vw-32px))] h-[min(80vh,720px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-brand-border bg-white shadow-2xl flex flex-col focus:outline-none"
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

          <div className="flex-1 flex flex-col overflow-hidden px-6 py-4 min-h-0">
            <ChatbotPanel variant="expanded" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
