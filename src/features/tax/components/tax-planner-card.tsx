"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TaxFavoredContribution } from "@/lib/schemas";
import { cn, formatCurrency, newId } from "@/lib/utils";
import { useFinancialStore } from "@/stores/financial-store";
import { ChevronDown, ChevronUp, Plus, Receipt, Sparkles, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";
import {
  TAX_FAVORED_VEHICLES,
  type TaxFavoredVehicle,
  calculateThaiTax,
  computeMaxAdditionalContribution,
  estimateTaxSavings,
} from "../lib/thai-tax";

const RETIREMENT_VEHICLES: TaxFavoredVehicle[] = ["RMF", "SSF", "PVD", "PENSION_INSURANCE"];

function getCurrentTaxYear(): string {
  return String(new Date().getFullYear());
}

export function TaxPlannerCard() {
  const income = useFinancialStore((s) => s.income);
  const contributions = useFinancialStore((s) => s.taxContributions ?? []);
  const setContributions = useFinancialStore((s) => s.setTaxContributions);

  const [expanded, setExpanded] = React.useState(false);

  const annualIncome = income * 12;
  const taxYear = getCurrentTaxYear();

  const yearContributions = React.useMemo(
    () => contributions.filter((c) => c.year === taxYear),
    [contributions, taxYear],
  );
  const totalDeductions = yearContributions.reduce((s, c) => s + c.amount, 0);

  const tax = React.useMemo(
    () => calculateThaiTax({ annualIncome, additionalDeductions: totalDeductions }),
    [annualIncome, totalDeductions],
  );

  // Suggestions: top 3 vehicles where the user has remaining headroom AND
  // a meaningful saving (don't recommend "ลดอีก ฿0 จะประหยัด ฿0")
  const suggestions = React.useMemo(() => {
    const retirementContributedThisYear = RETIREMENT_VEHICLES.reduce((sum, v) => {
      return (
        sum + yearContributions.filter((c) => c.vehicle === v).reduce((s, c) => s + c.amount, 0)
      );
    }, 0);

    return (Object.keys(TAX_FAVORED_VEHICLES) as TaxFavoredVehicle[])
      .map((v) => {
        const alreadyForVehicle = yearContributions
          .filter((c) => c.vehicle === v)
          .reduce((s, c) => s + c.amount, 0);
        const isRetirement = RETIREMENT_VEHICLES.includes(v);
        const otherRetirement = isRetirement
          ? retirementContributedThisYear - alreadyForVehicle
          : 0;
        const headroom = computeMaxAdditionalContribution(
          v,
          annualIncome,
          alreadyForVehicle,
          otherRetirement,
        );
        const savings = estimateTaxSavings(headroom, tax.marginalRate);
        return { vehicle: v, headroom, savings };
      })
      .filter((s) => s.headroom > 0 && s.savings >= 1000)
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 3);
  }, [annualIncome, tax.marginalRate, yearContributions]);

  const addContribution = (vehicle: TaxFavoredVehicle) => {
    setContributions((prev) => [
      ...prev,
      {
        id: newId(),
        vehicle,
        year: taxYear,
        amount: 0,
        recordedAt: Date.now(),
      } satisfies TaxFavoredContribution,
    ]);
    setExpanded(true);
  };

  const updateContribution = (id: string, patch: Partial<TaxFavoredContribution>) => {
    setContributions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeContribution = (id: string) => {
    setContributions((prev) => prev.filter((c) => c.id !== id));
  };

  if (income <= 0) {
    return (
      <Card padding="md" className="border-dashed border-brand-border bg-brand-surface/40">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Receipt size={18} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-brand-text mb-0.5">วางแผนภาษี</p>
            <p className="text-[11px] font-bold text-brand-muted leading-relaxed">
              ตั้งค่ารายได้ต่อเดือนใน "วางแผน" เพื่อคำนวณภาษีและคำแนะนำลดหย่อน
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden border-purple-200">
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 rounded-full bg-white/30" />
        <div className="relative z-10 flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Receipt size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted mb-1">
              🧾 Tax Planner {taxYear}
            </p>
            <h3 className="text-base font-black text-brand-text">ภาษีที่ต้องจ่ายปีนี้</h3>
          </div>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4 bg-white">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <Row label="รายได้คาดการณ์" value={formatCurrency(annualIncome)} />
          <Row
            label="ค่าใช้จ่ายรวม"
            value={formatCurrency(tax.expenseAllowance + tax.personalAllowance)}
          />
          {totalDeductions > 0 && (
            <Row
              label="ลดหย่อนเพิ่มเติม"
              value={formatCurrency(totalDeductions)}
              highlight="text-emerald-600"
            />
          )}
          <Row label="เงินได้สุทธิ" value={formatCurrency(tax.netTaxableIncome)} bold />
        </dl>

        <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">
              ภาษีที่ต้องจ่าย
            </p>
            <p
              className={cn(
                "text-2xl font-black tracking-tighter",
                tax.taxOwed > 0 ? "text-orange-600" : "text-emerald-600",
              )}
            >
              {formatCurrency(tax.taxOwed)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">
              อัตรา effective
            </p>
            <p className="text-sm font-black text-brand-text">
              {(tax.effectiveRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={12} className="text-emerald-600" aria-hidden="true" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                ลดหย่อนเพิ่มได้ — ประหยัดสูงสุด {formatCurrency(suggestions[0]?.savings ?? 0)}
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {suggestions.map((s) => {
                const meta = TAX_FAVORED_VEHICLES[s.vehicle];
                return (
                  <li
                    key={s.vehicle}
                    className="flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-2.5 border border-emerald-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-brand-text">{meta.label}</p>
                      <p className="text-[10px] text-brand-muted font-bold">{meta.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-brand-muted uppercase">เพิ่มได้</p>
                      <p className="text-xs font-black text-brand-text">
                        {formatCurrency(s.headroom)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">ประหยัด</p>
                      <p className="text-sm font-black text-emerald-700">
                        {formatCurrency(s.savings)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addContribution(s.vehicle)}
                      className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      aria-label={`เพิ่ม ${meta.label}`}
                    >
                      <Plus size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-brand-muted hover:text-brand-text px-1 py-2"
            aria-expanded={expanded}
          >
            <span className="inline-flex items-center gap-1.5">
              📈 RMF/SSF Tracker {taxYear}
              {yearContributions.length > 0 && (
                <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded-full text-brand-text">
                  {yearContributions.length}
                </span>
              )}
            </span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden flex flex-col gap-2"
            >
              {yearContributions.length === 0 ? (
                <p className="text-[11px] text-brand-muted font-bold py-2 text-center bg-brand-surface/50 rounded-xl">
                  ยังไม่มีรายการลดหย่อนปีนี้ — กดปุ่ม + ในกล่องสีเขียวด้านบนเพื่อเริ่ม
                </p>
              ) : (
                yearContributions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 bg-brand-surface/50 rounded-xl p-2"
                  >
                    <Select
                      value={c.vehicle}
                      onChange={(e) =>
                        updateContribution(c.id, { vehicle: e.target.value as TaxFavoredVehicle })
                      }
                      className="text-[10px] h-8 px-2 w-32"
                    >
                      {(Object.keys(TAX_FAVORED_VEHICLES) as TaxFavoredVehicle[]).map((v) => (
                        <option key={v} value={v}>
                          {TAX_FAVORED_VEHICLES[v].label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="number"
                      placeholder="ยอดสะสมปีนี้"
                      value={c.amount === 0 ? "" : c.amount}
                      onChange={(e) => updateContribution(c.id, { amount: Number(e.target.value) })}
                      containerClassName="flex-1"
                      className="h-8"
                    />
                    <Input
                      placeholder="หมายเหตุ (optional)"
                      value={c.note ?? ""}
                      onChange={(e) => updateContribution(c.id, { note: e.target.value })}
                      containerClassName="flex-1"
                      className="h-8 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeContribution(c.id)}
                      className="text-brand-muted hover:text-red-500 p-1"
                      aria-label="ลบ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => addContribution("RMF")}
                className="border-2 border-dashed border-brand-border w-full"
              >
                <Plus size={12} className="mr-2" /> เพิ่มรายการลดหย่อน
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: string;
}) {
  return (
    <>
      <dt className="text-brand-muted font-bold">{label}</dt>
      <dd
        className={cn(
          "text-right font-mono",
          bold ? "font-black text-brand-text" : "font-bold text-brand-text",
          highlight,
        )}
      >
        {value}
      </dd>
    </>
  );
}
