"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type CSRCategory, CSR_CATEGORY } from "@/lib/schemas";
import { cn, formatCurrency, newId } from "@/lib/utils";
import { useFinancialStore } from "@/stores/financial-store";
import { Plus, Trash2, Wallet } from "lucide-react";

const EXAMPLES: Record<CSRCategory, string[]> = {
  Constant: ["ผ่อนบ้าน/เช่าบ้าน", "ประกันชีวิต/สุขภาพ", "ให้พ่อแม่", "ค่าสมาชิก"],
  Spending: ["ค่าอาหาร", "ค่าน้ำมัน", "ช้อปปิ้ง", "ท่องเที่ยว"],
  Reserve: ["SSF/RMF", "กองทุนรวม", "เงินออมฉุกเฉิน", "บำนาญ"],
};

const TARGET: Record<CSRCategory, number> = {
  Constant: 0.5,
  Spending: 0.3,
  Reserve: 0.2,
};

export function BudgetAllocationsSection() {
  const income = useFinancialStore((s) => s.income);
  const allocations = useFinancialStore((s) => s.allocations);
  const setAllocations = useFinancialStore((s) => s.setAllocations);

  const safeIncome = income || 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <div className="p-2 bg-brand-bg rounded-lg">
          <Wallet className="text-brand-text w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">การจัดสรรงบประมาณ (CSR)</h2>
          <p className="text-xs text-brand-muted">จัดสรรงบ 50:30:20 เพื่อสุขภาพการเงินที่ดี</p>
        </div>
      </div>

      {income <= 0 && (
        <output className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-xl p-3 flex items-center gap-2">
          <Wallet size={14} className="shrink-0" />
          <span>ตั้งค่ารายได้ต่อเดือนใน "รายได้และเป้าหมาย" ก่อน เพื่อคำนวณสัดส่วนงบ</span>
        </output>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.values(CSR_CATEGORY) as CSRCategory[]).map((category) => {
          const items = allocations.filter((a) => a.category === category);
          const total = items.reduce((s, a) => s + a.amount, 0);
          const target = TARGET[category];
          const limit = safeIncome * target;
          const isOver = category === "Reserve" ? total < limit : total > limit;

          return (
            <Card
              key={category}
              variant="white"
              className="flex flex-col gap-4 hover:border-brand-text/10 group/card relative"
            >
              <div className="flex items-center justify-between border-b border-brand-border/50 pb-4">
                <div className="flex flex-col gap-1">
                  <span
                    className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                      category === "Constant"
                        ? "bg-slate-100 text-slate-700"
                        : category === "Spending"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    {category}
                  </span>
                  <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">
                    เป้าหมาย {target * 100}%
                  </span>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-black",
                      isOver && category !== "Reserve" ? "text-red-600" : "text-brand-text",
                    )}
                  >
                    {formatCurrency(total)}
                  </p>
                  <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">
                    {safeIncome > 0 ? `${((total / safeIncome) * 100).toFixed(1)}%` : "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-h-[50px]">
                {items.length === 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-3 bg-brand-surface rounded-xl border border-dashed border-brand-border">
                    <p className="w-full text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-1">
                      ยังไม่มีรายการ — เลือกตัวอย่างเริ่มต้น:
                    </p>
                    {EXAMPLES[category].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() =>
                          setAllocations((prev) => [
                            ...prev,
                            { id: newId(), name: example, amount: 0, category },
                          ])
                        }
                        className="text-[10px] bg-white border border-brand-border px-2 py-1 rounded-lg hover:border-brand-text transition-colors text-brand-muted hover:text-brand-text"
                      >
                        + {example}
                      </button>
                    ))}
                  </div>
                )}

                {items.map((alloc) => (
                  <div key={alloc.id} className="flex flex-col gap-1 group">
                    <div className="flex gap-2">
                      <Input
                        containerClassName="flex-1"
                        placeholder="รายการ..."
                        value={alloc.name}
                        onChange={(e) =>
                          setAllocations((prev) =>
                            prev.map((a) =>
                              a.id === alloc.id ? { ...a, name: e.target.value } : a,
                            ),
                          )
                        }
                      />
                      <div className="relative w-28 group">
                        <Input
                          type="number"
                          placeholder="บาท"
                          value={alloc.amount === 0 ? "" : alloc.amount}
                          onChange={(e) =>
                            setAllocations((prev) =>
                              prev.map((a) =>
                                a.id === alloc.id ? { ...a, amount: Number(e.target.value) } : a,
                              ),
                            )
                          }
                          className="font-bold pr-8"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setAllocations((prev) => prev.filter((a) => a.id !== alloc.id))
                          }
                          className="absolute -right-1 top-1/2 -translate-y-1/2 text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1.5"
                          aria-label={`Delete ${alloc.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full border-2 border-dashed border-brand-border"
                  onClick={() =>
                    setAllocations((prev) => [
                      ...prev,
                      { id: newId(), name: "", amount: 0, category },
                    ])
                  }
                >
                  <Plus size={12} className="mr-2" /> เพิ่มรายการ {category}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
