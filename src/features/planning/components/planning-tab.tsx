"use client";

import { newId } from "@/lib/utils";
import { syncExternalInvestments } from "@/server/actions/external-sync";
import { useFinancialStore } from "@/stores/financial-store";
import * as React from "react";
import { AccountsSection } from "./accounts-section";
import { BudgetAllocationsSection } from "./budget-allocations-section";
import { IncomeAndProjections } from "./income-and-projections";
import { LiabilitiesSection } from "./liabilities-section";

export default function PlanningTab() {
  const setAccounts = useFinancialStore((s) => s.setAccounts);
  const [isExternalSyncing, setIsExternalSyncing] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  const handleSyncExternal = async () => {
    setIsExternalSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncExternalInvestments();
      const externals = result.accounts;
      if (externals.length === 0) {
        setSyncMessage("ไม่พบข้อมูลการลงทุนในระบบอื่น");
        return;
      }

      let updated = 0;
      let added = 0;
      setAccounts((prev) => {
        const next = [...prev];
        for (const ext of externals) {
          const existingIndex = next.findIndex((a) => a.id === ext.id || a.name === ext.name);
          const existing = existingIndex !== -1 ? next[existingIndex] : undefined;
          if (existing) {
            const diff = ext.amount - existing.amount;
            if (diff !== 0) {
              next[existingIndex] = {
                ...existing,
                amount: ext.amount,
                transactions: [
                  {
                    id: newId(),
                    timestamp: Date.now(),
                    type: diff > 0 ? "deposit" : "withdrawal",
                    amount: Math.abs(diff),
                    note: `Sync from External: ${ext.name}`,
                  },
                  ...(existing.transactions ?? []),
                ],
              };
              updated++;
            }
          } else {
            next.push(ext);
            added++;
          }
        }
        return next;
      });

      const parts: string[] = ["ซิงค์ข้อมูลสำเร็จ"];
      if (updated > 0) parts.push(`อัปเดต ${updated} รายการ`);
      if (added > 0) parts.push(`เพิ่มใหม่ ${added} รายการ`);
      if (updated === 0 && added === 0) parts.push("ข้อมูลปัจจุบันเป็นปัจจุบันแล้ว");
      setSyncMessage(parts.join(" — "));
    } catch (err) {
      console.error(err);
      setSyncMessage("เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูลภายนอก");
    } finally {
      setIsExternalSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 max-w-6xl mx-auto w-full pb-20">
      {syncMessage && (
        <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-xl p-3 text-center">
          {syncMessage}
        </div>
      )}
      <IncomeAndProjections />
      <BudgetAllocationsSection />
      <LiabilitiesSection />
      <AccountsSection isExternalSyncing={isExternalSyncing} onSyncExternal={handleSyncExternal} />
    </div>
  );
}
