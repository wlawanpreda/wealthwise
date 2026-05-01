import { requireSessionUser } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  CSR_CATEGORY,
  FinancialPlanSchema,
  FinancialSnapshotSchema,
  PillarStatusSchema,
} from "@/lib/schemas";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  plan: FinancialPlanSchema,
  pillars: z.array(PillarStatusSchema).max(8),
  /** Up to the most recent 8 snapshots — that's ~2 months of weekly data. */
  recentSnapshots: z.array(FinancialSnapshotSchema).max(8),
});

/**
 * Insight gen is much heavier than chat (longer prompt, fuller context),
 * and called from the dashboard loading path — keep the per-uid budget
 * tight so a noisy reload loop can't burn quota.
 */
const INSIGHT_RATE_LIMIT = { max: 3, windowMs: 5 * 60_000 } as const;

const SYSTEM_INSTRUCTION = `คุณคือ "สถาปนิกการเงิน AI" ที่ช่วยสรุปสุขภาพการเงินของผู้ใช้แบบสัปดาห์ต่อสัปดาห์
ใช้ข้อมูลที่ได้รับเท่านั้น อย่าเดาตัวเลขเอง และเน้นการกระทำที่ทำได้จริง

ตอบเป็น JSON เท่านั้น โครงสร้าง:
{
  "headline": string,    // หนึ่งประโยคโชคดี/แย่ ภาพรวมสัปดาห์นี้
  "highlights": [        // 2-3 ข้อ มีไอคอนนำหน้า ↗️/⚠️/✅/💡
    string
  ],
  "recommendation": string,  // คำแนะนำ 1-2 ประโยคแบบ actionable
  "trend": "up" | "down" | "flat"  // โทนรวม
}

อย่าใส่ markdown, code fence, หรือคำอธิบายนอก JSON
อย่าให้คำตอบยาวเกิน 280 ตัวอักษรต่อ field`;

const responseShape = z.object({
  headline: z.string().min(1).max(280),
  highlights: z.array(z.string().min(1).max(280)).min(1).max(4),
  recommendation: z.string().min(1).max(400),
  trend: z.enum(["up", "down", "flat"]),
});

type ChatErrorCode =
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INVALID_BODY"
  | "MISSING_API_KEY"
  | "AI_UNAVAILABLE"
  | "PARSE_FAILED";

function errorResponse(
  code: ChatErrorCode,
  status: number,
  detail?: string,
  headers?: Record<string, string>,
) {
  return NextResponse.json({ error: code, detail }, { status, headers });
}

function buildPrompt(
  plan: z.infer<typeof FinancialPlanSchema>,
  pillars: z.infer<typeof PillarStatusSchema>[],
  recentSnapshots: z.infer<typeof FinancialSnapshotSchema>[],
) {
  const csr = { Constant: 0, Spending: 0, Reserve: 0 } as Record<string, number>;
  for (const a of plan.allocations) csr[a.category] = (csr[a.category] ?? 0) + a.amount;

  const totalDebt = plan.liabilities.reduce((s, l) => s + l.totalAmount, 0);
  const monthlyDebt = plan.liabilities.reduce((s, l) => s + l.monthlyPayment, 0);
  const totalAssets = plan.emergencyFunds.reduce((s, a) => s + a.amount, 0);

  const sortedSnapshots = [...recentSnapshots].sort((a, b) => a.timestamp - b.timestamp);
  const previous = sortedSnapshots[sortedSnapshots.length - 2];
  const latest = sortedSnapshots[sortedSnapshots.length - 1];
  const wealthDelta = latest && previous ? latest.totalWealth - previous.totalWealth : null;
  const debtDelta = latest && previous ? latest.totalDebt - previous.totalDebt : null;

  return [
    "User Snapshot:",
    `- รายได้/เดือน: ${plan.income} บาท`,
    `- CSR: คงที่ ${csr[CSR_CATEGORY.CONSTANT]} (${(((csr[CSR_CATEGORY.CONSTANT] ?? 0) / plan.income) * 100).toFixed(1)}%), ใช้จ่าย ${csr[CSR_CATEGORY.SPENDING]} (${(((csr[CSR_CATEGORY.SPENDING] ?? 0) / plan.income) * 100).toFixed(1)}%), สำรอง ${csr[CSR_CATEGORY.RESERVE]} (${(((csr[CSR_CATEGORY.RESERVE] ?? 0) / plan.income) * 100).toFixed(1)}%)`,
    `- ทรัพย์สินรวม ${totalAssets} บาท / หนี้รวม ${totalDebt} บาท / ผ่อน/เดือน ${monthlyDebt} บาท`,
    "",
    "Pillars:",
    ...pillars.map((p) => `- ${p.name}: ${p.status} (${p.score.toFixed(0)}/100) — ${p.insight}`),
    "",
    `Snapshots (${sortedSnapshots.length} คน, เก่าสุด -> ใหม่สุด):`,
    ...sortedSnapshots.map(
      (s) =>
        `- ${s.month}: wealth ${s.totalWealth}, debt ${s.totalDebt}, net ${s.netWorth}, savingsRate ${s.savingsRate.toFixed(1)}%`,
    ),
    "",
    wealthDelta !== null
      ? `เทียบกับ snapshot ก่อนหน้า: wealth ${wealthDelta >= 0 ? "+" : ""}${wealthDelta}, debt ${debtDelta && debtDelta >= 0 ? "+" : ""}${debtDelta ?? 0}`
      : "ยังไม่มี snapshot ก่อนหน้าให้เปรียบเทียบ",
    `เป้าหมายเงินออม: ${plan.savingsTarget} บาท`,
    "",
    "สรุปสุขภาพการเงินสัปดาห์ที่ผ่านมาเป็น JSON ตามรูปแบบที่ระบุในระบบ (ห้ามมี markdown หรือ code fence)",
  ].join("\n");
}

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof requireSessionUser>>;
  try {
    user = await requireSessionUser();
  } catch {
    return errorResponse("UNAUTHORIZED", 401);
  }

  const limit = checkRateLimit(`insight:${user.uid}`, INSIGHT_RATE_LIMIT);
  if (!limit.ok) {
    return errorResponse(
      "RATE_LIMITED",
      429,
      `ขอ insight ใหม่ได้อีกใน ${limit.retryAfterSeconds} วินาที`,
      { "Retry-After": String(limit.retryAfterSeconds ?? 60) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_BODY", 400, "Invalid JSON");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "INVALID_BODY",
      400,
      parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; "),
    );
  }

  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch (err) {
    console.error("[/api/insight] env error:", err);
    return errorResponse("MISSING_API_KEY", 503, "GEMINI_API_KEY is not set on the server.");
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const prompt = buildPrompt(parsed.data.plan, parsed.data.pillars, parsed.data.recentSnapshots);

  try {
    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return errorResponse("AI_UNAVAILABLE", 503, "Empty response from AI");

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return errorResponse("PARSE_FAILED", 502, "Model returned non-JSON output");
    }

    const validated = responseShape.safeParse(raw);
    if (!validated.success) {
      return errorResponse(
        "PARSE_FAILED",
        502,
        validated.error.issues
          .slice(0, 2)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    }

    return NextResponse.json(validated.data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[/api/insight] Gemini API error:", err);
    return errorResponse("AI_UNAVAILABLE", 503, err instanceof Error ? err.message : undefined);
  }
}
