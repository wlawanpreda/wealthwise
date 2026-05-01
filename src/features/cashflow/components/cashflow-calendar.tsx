"use client";

import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { useDerivedFinancials, useFinancialStore } from "@/stores/financial-store";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as React from "react";
import { type DaySummary, buildCashflowMonth } from "../lib/cashflow";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const WEEKDAY_LABELS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

/**
 * Visual cashflow calendar — answers "is there a day this month I'll run
 * short on cash?" Renders projected events (payday + monthly debt
 * payments) on a Monday-first 7-column grid and highlights the lowest
 * projected balance.
 */
export function CashflowCalendar() {
  const income = useFinancialStore((s) => s.income);
  const liabilities = useFinancialStore((s) => s.liabilities);
  const { totalWealth } = useDerivedFinancials();

  // Month being viewed; default to current.
  const [offset, setOffset] = React.useState(0);

  const viewing = React.useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [offset]);

  const cashflow = React.useMemo(
    () =>
      buildCashflowMonth({
        startingBalance: totalWealth,
        monthlyIncome: income,
        liabilities,
        year: viewing.year,
        month: viewing.month,
      }),
    [income, liabilities, totalWealth, viewing.year, viewing.month],
  );

  const eventsByDay = React.useMemo(() => {
    const m = new Map<number, DaySummary>();
    for (const d of cashflow.daysWithEvents) m.set(d.day, d);
    return m;
  }, [cashflow.daysWithEvents]);

  // First-day-of-month weekday — Monday = 0 in our grid (Thai convention).
  const firstWeekday = React.useMemo(() => {
    const dayOfWeek = new Date(viewing.year, viewing.month - 1, 1).getDay();
    // Sun=0..Sat=6 → shift to Mon=0..Sun=6
    return (dayOfWeek + 6) % 7;
  }, [viewing.year, viewing.month]);

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === viewing.year && today.getMonth() + 1 === viewing.month;

  // Build a flat 42-cell grid (max 6 weeks)
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= cashflow.daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  const monthLabel = `${THAI_MONTHS[viewing.month - 1]} ${viewing.year}`;
  const lowestDay = cashflow.lowestPoint?.day;

  return (
    <Card padding="none" className="overflow-hidden border-brand-border">
      <header className="px-5 py-4 border-b border-brand-border bg-brand-bg/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"
            aria-hidden="true"
          >
            <Calendar size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted">
              📅 Cashflow Calendar
            </p>
            <h3 className="text-base font-black text-brand-text">{monthLabel}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-text hover:bg-white transition-colors"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setOffset(0)}
            disabled={offset === 0}
            className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-text hover:bg-white transition-colors"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* Summary strip */}
      <div className="px-5 py-3 grid grid-cols-3 gap-3 bg-white border-b border-brand-border">
        <SummaryCell
          label="เข้า"
          value={formatCurrency(cashflow.totalInflow)}
          tone="text-emerald-600"
          icon={<ArrowUpRight size={11} />}
        />
        <SummaryCell
          label="ออก"
          value={formatCurrency(cashflow.totalOutflow)}
          tone="text-orange-600"
          icon={<ArrowDownLeft size={11} />}
        />
        <SummaryCell
          label="คงเหลือสุทธิ"
          value={formatCurrency(cashflow.totalInflow - cashflow.totalOutflow)}
          tone={cashflow.totalInflow >= cashflow.totalOutflow ? "text-emerald-600" : "text-red-600"}
        />
      </div>

      {/* Calendar grid */}
      <div className="p-3 bg-white">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((d) => (
            <div
              key={d}
              className="text-center text-[9px] font-black uppercase tracking-widest text-brand-muted py-1"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (cell.day === null) {
              // Padding cells have no semantic identity. Encode position
              // relative to the month boundaries so the key is stable per
              // month even though the array index alone wouldn't be:
              //   "pre-3" = the 4th cell before the 1st of the month
              //   "post-2" = the 3rd cell after the last day
              const isLeading = i < firstWeekday;
              const padKey = isLeading
                ? `pre-${firstWeekday - i}`
                : `post-${i - (firstWeekday + cashflow.daysInMonth) + 1}`;
              return (
                <div
                  key={padKey}
                  className="aspect-square rounded-lg bg-brand-surface/30"
                  aria-hidden="true"
                />
              );
            }
            const dayEvents = eventsByDay.get(cell.day);
            const isToday = isCurrentMonth && today.getDate() === cell.day;
            const isLowest = lowestDay === cell.day;
            const hasInflow = dayEvents?.events.some((e) => e.amount > 0);
            const hasOutflow = dayEvents?.events.some((e) => e.amount < 0);
            const inflowOnly = hasInflow && !hasOutflow;
            const outflowOnly = hasOutflow && !hasInflow;
            return (
              <div
                key={cell.day}
                className={cn(
                  "aspect-square min-h-[44px] sm:min-h-[60px] rounded-lg p-1.5 flex flex-col text-[10px] font-bold transition-all border",
                  isLowest
                    ? "bg-red-50 border-red-300 ring-2 ring-red-200"
                    : inflowOnly
                      ? "bg-emerald-50/80 border-emerald-200"
                      : outflowOnly
                        ? "bg-orange-50/80 border-orange-200"
                        : dayEvents
                          ? "bg-amber-50/80 border-amber-200"
                          : "bg-white border-brand-border/40",
                  isToday && "ring-2 ring-blue-400",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[11px] font-black",
                      isToday ? "text-blue-600" : "text-brand-text",
                    )}
                  >
                    {cell.day}
                  </span>
                  {isLowest && (
                    <AlertTriangle size={9} className="text-red-500" aria-label="ยอดต่ำสุดของเดือน" />
                  )}
                </div>
                {dayEvents && (
                  <div className="flex-1 flex flex-col justify-end overflow-hidden">
                    {hasInflow && hasOutflow ? (
                      <span className="text-[9px] font-black text-amber-700 truncate">
                        {formatCurrency(dayEvents.netDelta).replace("฿", "")}
                      </span>
                    ) : hasInflow ? (
                      <span className="text-[9px] font-black text-emerald-700 truncate">
                        +{formatCurrency(dayEvents.netDelta).replace("฿", "")}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-orange-700 truncate">
                        {formatCurrency(dayEvents.netDelta).replace("฿", "")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer: lowest point or all-clear */}
      {cashflow.lowestPoint ? (
        <div className="px-5 py-3.5 bg-red-50/60 border-t border-red-100 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-red-700">
              ยอดต่ำสุดของเดือน: {formatCurrency(cashflow.lowestPoint.balance)}
            </p>
            <p className="text-[10px] font-bold text-red-600/80 leading-relaxed">
              วันที่ {cashflow.lowestPoint.day} ของเดือนคือจุดที่ระบบคาดว่าจะติดเงินมากที่สุด —
              ระวังให้มีเงินในบัญชีก่อนหน้านั้น
            </p>
          </div>
        </div>
      ) : cashflow.daysWithEvents.length > 0 ? (
        <div className="px-5 py-3 bg-emerald-50/60 border-t border-emerald-100 text-[11px] font-bold text-emerald-700">
          ✓ ยอดในบัญชีไม่ลดต่ำกว่ายอดเริ่มต้นของเดือน — กระแสเงินสดเดือนนี้ดูปลอดภัย
        </div>
      ) : null}

      {liabilities.length === 0 && income <= 0 && (
        <div className="px-5 py-4 bg-brand-surface/40 border-t border-brand-border text-[11px] font-bold text-brand-muted text-center">
          เพิ่มรายได้และหนี้ในแท็บ "วางแผน" เพื่อดูปฏิทินกระแสเงินสด
        </div>
      )}
    </Card>
  );
}

function SummaryCell({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-brand-muted mb-0.5">
        {icon}
        {label}
      </span>
      <span className={cn("text-sm font-black font-mono tracking-tight", tone)}>{value}</span>
    </div>
  );
}
