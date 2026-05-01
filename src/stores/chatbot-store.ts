"use client";

import type { FinancialPlan, PillarStatus } from "@/lib/schemas";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    text: "สวัสดีครับ ผมคือสถาปนิกการเงิน AI ยินดีช่วยคุณวางแผนจัดการงบประมาณและหนี้สินครับ",
  },
];

interface ChatbotState {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  expanded: boolean;
  setInput: (v: string) => void;
  setExpanded: (v: boolean) => void;
  reset: () => void;
  send: (text: string, plan: FinancialPlan, pillars: PillarStatus[]) => Promise<void>;
}

function mapServerErrorToMessage(code?: string, detail?: string): string {
  if (code === "UNAUTHORIZED") return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
  if (code === "MISSING_API_KEY")
    return "ระบบ AI ยังไม่ได้ตั้งค่า: ผู้ดูแลต้องเพิ่ม GEMINI_API_KEY ใน .env.local แล้วรีสตาร์ท dev server";
  if (code === "INVALID_BODY") return `ข้อมูลที่ส่งไม่ถูกต้อง${detail ? ` (${detail})` : ""}`;
  if (code === "AI_UNAVAILABLE") return `บริการ AI ไม่พร้อมใช้งานชั่วคราว${detail ? ` — ${detail}` : ""}`;
  return "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อระบบ AI กรุณาลองใหม่ภายหลัง";
}

export const useChatbotStore = create<ChatbotState>((set, get) => ({
  messages: INITIAL_MESSAGES,
  input: "",
  isLoading: false,
  expanded: false,

  setInput: (v) => set({ input: v }),
  setExpanded: (v) => set({ expanded: v }),
  reset: () => set({ messages: INITIAL_MESSAGES, input: "", isLoading: false }),

  send: async (text, plan, pillars) => {
    const trimmed = text.trim();
    const { isLoading } = get();
    if (!trimmed || isLoading) return;

    set((s) => ({
      input: "",
      isLoading: true,
      messages: [...s.messages, { role: "user", text: trimmed }, { role: "assistant", text: "" }],
    }));

    const finalizeWithError = (message: string) => {
      set((s) => {
        const copy = [...s.messages];
        copy[copy.length - 1] = { role: "assistant", text: message };
        return { messages: copy };
      });
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, pillars, message: trimmed }),
      });

      if (!res.ok || !res.body) {
        let detail: string | undefined;
        let code: string | undefined;
        try {
          const payload = (await res.json()) as { error?: string; detail?: string };
          code = payload.error;
          detail = payload.detail;
        } catch {
          /* response wasn't JSON — fall through to generic */
        }
        finalizeWithError(mapServerErrorToMessage(code, detail));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        set((s) => {
          const copy = [...s.messages];
          copy[copy.length - 1] = { role: "assistant", text: acc };
          return { messages: copy };
        });
      }
    } catch (err) {
      console.warn("[chatbot] network error:", err);
      finalizeWithError("ขออภัย เชื่อมต่อกับเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
    } finally {
      set({ isLoading: false });
    }
  },
}));

/** Pre-computed selector that returns just the slices a renderer needs. */
export function useChatbotView() {
  return useChatbotStore(
    useShallow((s) => ({
      messages: s.messages,
      input: s.input,
      isLoading: s.isLoading,
    })),
  );
}
