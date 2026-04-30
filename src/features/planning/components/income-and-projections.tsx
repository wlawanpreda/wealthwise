"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn, formatCurrency, newId } from "@/lib/utils";
import { useDerivedFinancials, useFinancialStore } from "@/stores/financial-store";
import { Plus, Trash2, TrendingUp } from "lucide-react";

export function IncomeAndProjections() {
  const income = useFinancialStore((s) => s.income);
  const setIncome = useFinancialStore((s) => s.setIncome);
  const savingsTarget = useFinancialStore((s) => s.savingsTarget);
  const setSavingsTarget = useFinancialStore((s) => s.setSavingsTarget);
  const projections = useFinancialStore((s) => s.projections ?? []);
  const setProjections = useFinancialStore((s) => s.setProjections);
  const { totalWealth, netWorth, savingsRate } = useDerivedFinancials();

  return (
    <>
      <Card padding="lg">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="text-blue-600 w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">รายได้และเป้าหมาย</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="รายได้สุทธิ / เดือน"
                type="number"
                value={income === 0 ? "" : income}
                onChange={(e) => setIncome(Number(e.target.value))}
                leftIcon={<span className="font-bold">฿</span>}
                error={income <= 0 ? "กรุณาระบุรายได้ที่มากกว่า 0" : undefined}
                className="text-base md:text-xl font-black"
              />
              <Input
                label="เป้าหมายเงินออม (ทั้งหมด)"
                type="number"
                value={savingsTarget === 0 ? "" : savingsTarget}
                onChange={(e) => setSavingsTarget(Number(e.target.value))}
                leftIcon={<span className="font-bold text-emerald-600">฿</span>}
                className="text-base md:text-xl font-black text-emerald-700"
              />
            </div>
          </div>

          <div className="bg-brand-surface p-4 md:p-6 rounded-3xl border border-brand-border flex flex-row items-center justify-between gap-2 md:gap-4 overflow-hidden">
            <SummaryCell label="ทรัพย์สินรวม" value={formatCurrency(totalWealth)} />
            <div className="w-px h-8 md:h-10 bg-brand-border shrink-0" />
            <SummaryCell
              label="มั่งคั่งสุทธิ"
              value={formatCurrency(netWorth)}
              tone={netWorth >= 0 ? "text-emerald-600" : "text-red-600"}
            />
            <div className="w-px h-8 md:h-10 bg-brand-border shrink-0" />
            <SummaryCell
              label="อัตราออม"
              value={`${savingsRate.toFixed(1)}%`}
              tone="text-blue-600"
            />
          </div>
        </div>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="text-emerald-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">คาดการณ์รายได้ (Projections)</h2>
              <p className="text-xs text-brand-muted">ระบุการเปลี่ยนแปลงรายได้ในอนาคต</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setProjections((prev) => [
                ...prev,
                {
                  id: newId(),
                  name: "",
                  monthlyAmountChange: 0,
                  startDate: new Date().toISOString().slice(0, 7),
                  type: "increase",
                },
              ])
            }
          >
            <Plus size={14} className="mr-2" /> เพิ่มการคาดการณ์
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projections.map((proj) => (
            <Card key={proj.id} variant="surface" className="relative group">
              <button
                type="button"
                onClick={() => setProjections((prev) => prev.filter((p) => p.id !== proj.id))}
                className="absolute top-4 right-4 text-brand-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete projection"
              >
                <Trash2 size={14} />
              </button>
              <div className="flex flex-col gap-4">
                <Input
                  label="ชื่อรายการ"
                  value={proj.name}
                  onChange={(e) =>
                    setProjections((prev) =>
                      prev.map((p) => (p.id === proj.id ? { ...p, name: e.target.value } : p)),
                    )
                  }
                  placeholder="เช่น โบนัสปลายปี"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Amount"
                    type="number"
                    value={proj.monthlyAmountChange === 0 ? "" : proj.monthlyAmountChange}
                    onChange={(e) =>
                      setProjections((prev) =>
                        prev.map((p) =>
                          p.id === proj.id
                            ? { ...p, monthlyAmountChange: Number(e.target.value) }
                            : p,
                        ),
                      )
                    }
                  />
                  <Select
                    label="ประเภท"
                    value={proj.type}
                    onChange={(e) =>
                      setProjections((prev) =>
                        prev.map((p) =>
                          p.id === proj.id
                            ? { ...p, type: e.target.value as "increase" | "decrease" }
                            : p,
                        ),
                      )
                    }
                  >
                    <option value="increase">เพิ่มขึ้น (+)</option>
                    <option value="decrease">ลดลง (-)</option>
                  </Select>
                </div>
                <Input
                  label="เริ่มตั้งแต่เดือน"
                  type="month"
                  value={proj.startDate}
                  onChange={(e) =>
                    setProjections((prev) =>
                      prev.map((p) => (p.id === proj.id ? { ...p, startDate: e.target.value } : p)),
                    )
                  }
                />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function SummaryCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-center flex-1 min-w-0">
      <p className="text-[8px] md:text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1 truncate">
        {label}
      </p>
      <p className={cn("text-sm md:text-xl font-black truncate", tone ?? "text-brand-text")}>
        {value}
      </p>
    </div>
  );
}
