"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDerivedFinancials, useFinancialPlanSnapshot } from "@/stores/financial-store";
import { useFinancialStore } from "@/stores/financial-store";
import { usePinnedSnippetsStore } from "@/stores/pinned-snippets-store";
import {
  AlertCircle,
  Bookmark,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

interface InsightPayload {
  headline: string;
  highlights: string[];
  recommendation: string;
  trend: "up" | "down" | "flat";
}

interface CachedInsight {
  payload: InsightPayload;
  generatedAt: number;
}

const CACHE_KEY = "wealthwise.weekly-insight-v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadCache(): CachedInsight | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedInsight;
    if (Date.now() - parsed.generatedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(payload: InsightPayload) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ payload, generatedAt: Date.now() } satisfies CachedInsight),
    );
  } catch {
    /* localStorage unavailable — silently skip */
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

function formatRelative(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}

const TREND_THEME: Record<
  InsightPayload["trend"],
  { icon: typeof TrendingUp; gradient: string; ring: string; iconBg: string }
> = {
  up: {
    icon: TrendingUp,
    gradient: "from-emerald-50 to-blue-50",
    ring: "ring-emerald-500/10",
    iconBg: "bg-emerald-500",
  },
  down: {
    icon: TrendingDown,
    gradient: "from-orange-50 to-red-50",
    ring: "ring-orange-500/10",
    iconBg: "bg-orange-500",
  },
  flat: {
    icon: Sparkles,
    gradient: "from-blue-50 to-slate-50",
    ring: "ring-blue-500/10",
    iconBg: "bg-blue-500",
  },
};

export function WeeklyInsightCard() {
  const plan = useFinancialPlanSnapshot();
  const { pillars } = useDerivedFinancials();
  const recentSnapshots = useFinancialStore((s) => (s.history ?? []).slice(-8));

  const [insight, setInsight] = React.useState<CachedInsight | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const pinSnippet = usePinnedSnippetsStore((s) => s.pin);

  // Load cache on mount
  React.useEffect(() => {
    setInsight(loadCache());
  }, []);

  const generate = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, pillars, recentSnapshots }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        const code = payload.error;
        const message =
          code === "RATE_LIMITED"
            ? (payload.detail ?? "ขอ insight บ่อยเกินไป กรุณารอสักครู่")
            : code === "MISSING_API_KEY"
              ? "ระบบ AI ยังไม่ได้ตั้งค่า — ผู้ดูแลต้องเพิ่ม GEMINI_API_KEY"
              : code === "PARSE_FAILED"
                ? "AI ตอบกลับมาในรูปแบบที่ใช้ไม่ได้ ลองสร้างใหม่อีกครั้ง"
                : `ดึง insight ไม่ได้${payload.detail ? ` — ${payload.detail}` : ""}`;
        setError(message);
        return;
      }
      const data = (await res.json()) as InsightPayload;
      const next: CachedInsight = { payload: data, generatedAt: Date.now() };
      saveCache(data);
      setInsight(next);
    } catch (err) {
      console.warn("[insight] network error:", err);
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setLoading(false);
    }
  }, [plan, pillars, recentSnapshots]);

  if (!insight && !loading && !error) {
    return <EmptyPrompt onGenerate={generate} />;
  }

  if (loading && !insight) {
    return (
      <Card padding="lg" className="border-blue-200 bg-blue-50/30">
        <div className="flex items-center gap-3">
          <Loader2 size={20} className="animate-spin text-blue-600" aria-hidden="true" />
          <p className="text-sm font-bold text-brand-text">กำลังให้ AI วิเคราะห์ข้อมูลของคุณ...</p>
        </div>
      </Card>
    );
  }

  if (error && !insight) {
    return (
      <Card padding="md" className="border-orange-200 bg-orange-50/40 flex items-start gap-3">
        <AlertCircle size={18} className="text-orange-600 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-orange-700 mb-2">{error}</p>
          <button
            type="button"
            onClick={generate}
            className="text-[11px] font-black uppercase tracking-widest text-orange-700 hover:text-orange-900 underline decoration-dotted"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </Card>
    );
  }

  if (!insight) return null;

  const { payload, generatedAt } = insight;
  const theme = TREND_THEME[payload.trend];
  const TrendIcon = theme.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div key={generatedAt} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          padding="none"
          className={cn(
            "overflow-hidden border-2 shadow-md ring-4",
            theme.ring,
            payload.trend === "up"
              ? "border-emerald-200"
              : payload.trend === "down"
                ? "border-orange-200"
                : "border-blue-200",
          )}
        >
          <div className={cn("p-5 bg-gradient-to-br relative overflow-hidden", theme.gradient)}>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-28 h-28 rounded-full bg-white/30" />
            <div className="relative z-10 flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl text-white flex items-center justify-center shrink-0",
                  theme.iconBg,
                )}
                aria-hidden="true"
              >
                <TrendIcon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted mb-1">
                  📊 สรุปสัปดาห์ที่ผ่านมา
                </p>
                <h3 className="text-base font-black text-brand-text leading-snug">
                  {payload.headline}
                </h3>
              </div>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-3 bg-white">
            <ul className="flex flex-col gap-2">
              {payload.highlights.map((h, i) => (
                <li
                  key={`${i}-${h.slice(0, 16)}`}
                  className="text-xs font-bold text-brand-text leading-relaxed"
                >
                  {h}
                </li>
              ))}
            </ul>

            <div
              className={cn(
                "rounded-xl p-3 mt-1 border",
                payload.trend === "up"
                  ? "bg-emerald-50/60 border-emerald-100"
                  : payload.trend === "down"
                    ? "bg-orange-50/60 border-orange-100"
                    : "bg-blue-50/60 border-blue-100",
              )}
            >
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">
                💡 คำแนะนำ
              </p>
              <p className="text-xs font-bold text-brand-text leading-relaxed">
                {payload.recommendation}
              </p>
            </div>

            <div className="flex items-center justify-between mt-1 pt-2 border-t border-brand-border">
              <span className="text-[10px] font-bold text-brand-muted">
                สร้างเมื่อ {formatRelative(generatedAt)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const text = [
                      `${payload.headline}`,
                      "",
                      ...payload.highlights.map((h) => `- ${h}`),
                      "",
                      `💡 ${payload.recommendation}`,
                    ].join("\n");
                    pinSnippet(text, "Weekly AI Insight");
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-muted hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                  aria-label="บันทึกเป็น snippet"
                >
                  <Bookmark size={11} />
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearCache();
                    void generate();
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-muted hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                  aria-label="สร้าง insight ใหม่"
                >
                  <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                  สร้างใหม่
                </button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

function EmptyPrompt({ onGenerate }: { onGenerate: () => void }) {
  return (
    <Card padding="md" className="border-dashed border-brand-border bg-brand-surface/40">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Sparkles size={18} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-brand-text mb-0.5">ให้ AI วิเคราะห์การเงินของคุณ</p>
          <p className="text-[11px] font-bold text-brand-muted leading-relaxed mb-3">
            สรุปแบบสัปดาห์ละครั้ง — เห็นแนวโน้มและจุดที่ควรปรับ พร้อมคำแนะนำที่ทำได้ทันที
          </p>
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl px-4 py-2 shadow-sm transition-colors"
          >
            <Sparkles size={12} />
            สร้าง insight แรก
          </button>
        </div>
      </div>
    </Card>
  );
}
