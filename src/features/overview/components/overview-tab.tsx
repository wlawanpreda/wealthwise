"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CSRCard } from "@/components/ui/csr-card";
import { TaxPlannerCard } from "@/features/tax/components/tax-planner-card";
import { CSR_CATEGORY } from "@/lib/schemas";
import { cn, formatCurrency } from "@/lib/utils";
import { useDerivedFinancials, useFinancialStore } from "@/stores/financial-store";
import { History as HistoryIcon } from "lucide-react";
import { CSRChart } from "./csr-chart";
import { FinancialMilestones } from "./financial-milestones";
import { PillarCard } from "./pillar-card";
import { WealthProgress } from "./wealth-progress";
import { WeeklyInsightCard } from "./weekly-insight-card";

export default function OverviewTab() {
  const income = useFinancialStore((s) => s.income);
  const liabilities = useFinancialStore((s) => s.liabilities);
  const accounts = useFinancialStore((s) => s.emergencyFunds);
  const takeSnapshot = useFinancialStore((s) => s.takeSnapshot);
  const { csr, pillars, totalWealth, totalDebt, netWorth, dti } = useDerivedFinancials();

  const safeIncome = income || 0;

  return (
    <>
      <WealthProgress />

      <div className="flex justify-end -mt-6">
        <Button
          variant="surface"
          size="sm"
          onClick={takeSnapshot}
          className="gap-2 text-blue-700 font-black uppercase tracking-widest border-blue-600/10 group h-10 px-6 rounded-xl hover:bg-blue-600 hover:text-white"
        >
          <HistoryIcon size={14} className="group-hover:rotate-[-45deg] transition-transform" />
          Generate Wealth Snapshot
        </Button>
      </div>

      <WeeklyInsightCard />

      <TaxPlannerCard />

      <FinancialMilestones />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CSRCard
          label="Constant (คงที่)"
          value={csr[CSR_CATEGORY.CONSTANT]}
          limit={safeIncome * 0.5}
          targetLabel="50%"
          status={csr[CSR_CATEGORY.CONSTANT] <= safeIncome * 0.5 ? "OPTIMAL" : "OVER BUDGET"}
          statusColor={
            csr[CSR_CATEGORY.CONSTANT] <= safeIncome * 0.5
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }
          description="Fixed Costs / Obligations / Dependents"
        />
        <CSRCard
          label="Spending (ใช้จ่าย)"
          value={csr[CSR_CATEGORY.SPENDING]}
          limit={safeIncome * 0.3}
          targetLabel="30%"
          status={csr[CSR_CATEGORY.SPENDING] <= safeIncome * 0.3 ? "BALANCED" : "CAUTION"}
          statusColor={
            csr[CSR_CATEGORY.SPENDING] <= safeIncome * 0.3
              ? "bg-blue-50 text-blue-700"
              : "bg-orange-50 text-orange-700"
          }
          description="Food / Transit / Lifestyle / Hobbies"
        />
        <CSRCard
          label="Reserve (สำรอง)"
          value={csr[CSR_CATEGORY.RESERVE]}
          limit={safeIncome * 0.2}
          targetLabel="20%"
          status={csr[CSR_CATEGORY.RESERVE] >= safeIncome * 0.2 ? "EXCELLENT" : "INSUFFICIENT"}
          statusColor={
            csr[CSR_CATEGORY.RESERVE] >= safeIncome * 0.2
              ? "bg-emerald-50 text-emerald-700"
              : "bg-orange-50 text-orange-700"
          }
          description="Investments / Insurance / Emergency"
        />
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {pillars.map((p) => (
          <PillarCard key={p.name} pillar={p} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <Card className="lg:col-span-4 overflow-hidden border-brand-border" padding="none">
          <div className="p-6 border-b border-brand-border bg-brand-bg/5 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">
              Resource Allocation
            </h3>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          </div>
          <div className="p-6">
            <CSRChart />
          </div>
        </Card>
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Card className="overflow-hidden border-brand-border" padding="none">
            <div className="p-6 border-b border-brand-border bg-brand-bg/5">
              <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">
                Monthly Debt Maintenance
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8">
              {liabilities.map((l) => (
                <div
                  key={l.id}
                  className="flex justify-between items-center p-4 bg-brand-bg/30 rounded-xl border border-brand-border/30 hover:border-blue-600/30 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-10 bg-orange-200 rounded-full group-hover:bg-orange-500 transition-colors" />
                    <div>
                      <p className="text-xs font-black text-brand-text uppercase tracking-wider">
                        {l.name}
                      </p>
                      <p className="text-[10px] text-brand-muted font-bold">
                        DUE DATE: {l.dueDate?.trim() || "—"}
                      </p>
                    </div>
                  </div>
                  <p className="text-base font-mono font-black text-blue-600">
                    {formatCurrency(l.monthlyPayment)}
                  </p>
                </div>
              ))}
              {liabilities.length === 0 && (
                <p className="text-xs text-brand-muted col-span-full py-8 text-center font-bold uppercase tracking-widest bg-brand-bg/20 rounded-xl">
                  No Debt Obligations Found
                </p>
              )}
            </div>
          </Card>
          <Card className="overflow-hidden border-brand-border" padding="none">
            <div className="p-6 border-b border-brand-border bg-brand-bg/5">
              <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">
                Emergency Safety Buffer
              </h3>
            </div>
            <div className="flex flex-wrap gap-6 p-8">
              {accounts
                .filter((a) => a.isEmergencyFund)
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex-1 min-w-[240px] p-5 bg-brand-bg/30 rounded-2xl border border-brand-border/30 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                      <div className="w-12 h-12 dot-matrix" />
                    </div>
                    <p className="text-[10px] font-black text-emerald-600 mb-2 uppercase tracking-[0.15em]">
                      {f.name}
                    </p>
                    <p className="text-2xl font-black mb-2 font-mono tracking-tighter">
                      {formatCurrency(f.amount)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                      <p className="text-[9px] text-brand-muted font-black uppercase tracking-widest">
                        {f.purpose || "Emergency Fund"}
                      </p>
                    </div>
                  </div>
                ))}
              {accounts.filter((a) => a.isEmergencyFund).length === 0 && (
                <p className="text-xs text-brand-muted w-full py-8 text-center font-bold uppercase tracking-widest bg-brand-bg/20 rounded-xl">
                  No Safety Buffer Configured
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <footer className="bg-brand-text text-white p-4 md:p-5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-8 mt-auto overflow-hidden">
        <div className="flex gap-4 items-center overflow-x-auto whitespace-nowrap scrollbar-hide pb-2 md:pb-0">
          <span className="text-[10px] font-bold bg-[#344054] px-2 py-1 rounded shrink-0">
            สรุปด่วน
          </span>
          <div className="text-xs md:text-sm font-mono flex gap-6 md:gap-8 items-center">
            <Stat
              label="ทรัพย์สินรวม (Wealth)"
              value={formatCurrency(totalWealth)}
              tone="text-blue-400"
            />
            <Stat
              label="หนี้คงค้าง (Total Debt)"
              value={formatCurrency(totalDebt)}
              tone="text-orange-400"
            />
            <Stat
              label="ความมั่งคั่งสุทธิ (Net Worth)"
              value={formatCurrency(netWorth)}
              tone={netWorth >= 0 ? "text-emerald-400" : "text-red-400"}
            />
            <div className="flex flex-col border-l border-white/10 pl-4">
              <span className="text-[9px] text-gray-400">DTI (Monthly Debt Ratio)</span>
              <span className={cn(dti <= 0.4 ? "text-emerald-400" : "text-red-400")}>
                {(dti * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-gray-400">{label}</span>
      <span className={tone}>{value}</span>
    </div>
  );
}
