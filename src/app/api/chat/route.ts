import { requireSessionUser } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { CSR_CATEGORY, FinancialPlanSchema, PillarStatusSchema } from "@/lib/schemas";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";

// Per-user limit on the chat endpoint. Without this, a single authenticated
// session can drain the Gemini billing quota in minutes. The numbers are
// generous for a real conversation but tight enough to stop abuse loops.
const CHAT_RATE_LIMIT = { max: 10, windowMs: 60_000 } as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  plan: FinancialPlanSchema,
  pillars: z.array(PillarStatusSchema).max(8),
  message: z.string().min(1).max(2000),
});

const SYSTEM_INSTRUCTION =
  "คุณคือ 'สถาปนิกการเงิน AI' ที่เน้นเปลี่ยนข้อมูลให้เป็นการกระทำ (Actionable Insights) ตอบเป็นภาษาไทยที่สุภาพ เป็นมืออาชีพ กระชับ และตรงไปตรงมา เน้นวิเคราะห์โครงสร้าง CSR และหลักสุขภาพการเงิน 4-Pillar เพื่อช่วยผู้ใช้บรรลุเป้าหมายการออมให้เร็วที่สุด หากพบความผิดปกติในกระแสเงินสด ให้เสนอวิธีแก้ที่ชัดเจน อย่าเดาตัวเลขหรือข้อเท็จจริงนอกเหนือจากที่ผู้ใช้ให้มา";

function buildContext(
  plan: z.infer<typeof FinancialPlanSchema>,
  pillars: z.infer<typeof PillarStatusSchema>[],
) {
  const csr: Record<string, number> = {
    [CSR_CATEGORY.CONSTANT]: 0,
    [CSR_CATEGORY.SPENDING]: 0,
    [CSR_CATEGORY.RESERVE]: 0,
  };
  for (const a of plan.allocations) {
    csr[a.category] = (csr[a.category] ?? 0) + a.amount;
  }

  const totalMonthlyDebt = plan.liabilities.reduce((s, l) => s + l.monthlyPayment, 0);
  const emergencyAccounts = plan.emergencyFunds.filter((a) => a.isEmergencyFund);
  const totalEmergency = emergencyAccounts.reduce((s, f) => s + f.amount, 0);
  const totalAssets = plan.emergencyFunds.reduce((s, a) => s + a.amount, 0);

  return [
    "User Financial Plan:",
    `- รายได้ต่อเดือน: ${plan.income} บาท`,
    "- การจัดสรรงบประมาณ (CSR):",
    `  - คงที่ (Constant): ${csr[CSR_CATEGORY.CONSTANT]} บาท (เป้าหมาย 50% = ${plan.income * 0.5} บาท)`,
    `  - ใช้จ่าย (Spending): ${csr[CSR_CATEGORY.SPENDING]} บาท (เป้าหมาย 30% = ${plan.income * 0.3} บาท)`,
    `  - สำรอง (Reserve): ${csr[CSR_CATEGORY.RESERVE]} บาท (เป้าหมาย 20% = ${plan.income * 0.2} บาท)`,
    "- ภาระหนี้สิน:",
    ...plan.liabilities.map(
      (l) => `  - ${l.name}: ยอด ${l.totalAmount} บาท ผ่อน/เดือน ${l.monthlyPayment} บาท`,
    ),
    `  - ผ่อนหนี้รวมต่อเดือน: ${totalMonthlyDebt} บาท`,
    "- เงินสำรองฉุกเฉิน:",
    ...emergencyAccounts.map((f) => `  - ${f.name}: ${f.amount} บาท (${f.purpose})`),
    `  - ยอดเงินสำรองฉุกเฉิน: ${totalEmergency} บาท`,
    `  - ยอดทรัพย์สินรวม: ${totalAssets} บาท`,
    "- สถานะสุขภาพการเงิน 4 ด้าน:",
    ...pillars.map((p) => `  - ${p.name}: ${p.status} (${p.score.toFixed(0)}/100) - ${p.insight}`),
    `เป้าหมาย: ${plan.savingsTarget.toLocaleString()} บาท`,
  ].join("\n");
}

// Structured error codes the client can map to a user-facing message.
type ChatErrorCode =
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INVALID_JSON"
  | "INVALID_BODY"
  | "MISSING_API_KEY"
  | "AI_UNAVAILABLE";

function errorResponse(
  code: ChatErrorCode,
  status: number,
  detail?: string,
  headers?: Record<string, string>,
) {
  return NextResponse.json({ error: code, detail }, { status, headers });
}

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof requireSessionUser>>;
  try {
    user = await requireSessionUser();
  } catch {
    return errorResponse("UNAUTHORIZED", 401);
  }

  // Per-uid rate limit. Returning 429 with Retry-After is the standard
  // signal both browsers and well-behaved clients understand.
  const limit = checkRateLimit(`chat:${user.uid}`, CHAT_RATE_LIMIT);
  if (!limit.ok) {
    return errorResponse(
      "RATE_LIMITED",
      429,
      `อย่าเร็วเกินไป — ลองใหม่ใน ${limit.retryAfterSeconds} วินาที`,
      {
        "Retry-After": String(limit.retryAfterSeconds ?? 60),
        "X-RateLimit-Limit": String(CHAT_RATE_LIMIT.max),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1000)),
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return errorResponse("INVALID_BODY", 400, detail);
  }

  // Surface a config error explicitly instead of letting getServerEnv throw
  // a generic 500. The client maps MISSING_API_KEY to a setup hint.
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch (err) {
    console.error("[/api/chat] env error:", err);
    return errorResponse("MISSING_API_KEY", 503, "GEMINI_API_KEY is not set on the server.");
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const context = buildContext(parsed.data.plan, parsed.data.pillars);
  const userText = `${context}\n\nคำถามจากผู้ใช้: ${parsed.data.message}`;

  try {
    const stream = await ai.models.generateContentStream({
      model: env.GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: userText }] }],
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
        } catch (err) {
          console.error("[/api/chat] stream error:", err);
          controller.enqueue(encoder.encode("\n\nเกิดข้อผิดพลาดระหว่างวิเคราะห์ข้อมูล"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/chat] Gemini API error:", err);
    const detail = err instanceof Error ? err.message : undefined;
    return errorResponse("AI_UNAVAILABLE", 503, detail);
  }
}
