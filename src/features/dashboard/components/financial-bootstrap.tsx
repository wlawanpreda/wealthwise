"use client";

import type { FinancialPlan } from "@/lib/schemas";
import { savePlan } from "@/server/actions/plan";
import { useFinancialPlanSnapshot, useFinancialStore } from "@/stores/financial-store";
import * as React from "react";

const SYNC_DEBOUNCE_MS = 2000;

interface Props {
  initialPlan: FinancialPlan;
  children: React.ReactNode;
}

export function FinancialBootstrap({ initialPlan, children }: Props) {
  const hydrate = useFinancialStore((s) => s.hydrateFromPlan);
  const setSyncing = useFinancialStore((s) => s.setSyncing);
  const hydrated = useFinancialStore((s) => s.hydrated);
  const plan = useFinancialPlanSnapshot();
  const lastSyncedRef = React.useRef<string>(JSON.stringify(initialPlan));

  // Hydrate once on mount
  React.useEffect(() => {
    if (!hydrated) {
      hydrate(initialPlan);
      lastSyncedRef.current = JSON.stringify(initialPlan);
    }
  }, [hydrate, hydrated, initialPlan]);

  // Debounced server sync — fields-based comparison to avoid key-order false positives
  React.useEffect(() => {
    if (!hydrated) return;

    const serialized = JSON.stringify({
      income: plan.income,
      savingsTarget: plan.savingsTarget,
      allocations: plan.allocations,
      liabilities: plan.liabilities,
      emergencyFunds: plan.emergencyFunds,
      history: plan.history,
      projections: plan.projections,
      taxContributions: plan.taxContributions,
    });

    if (serialized === lastSyncedRef.current) return;

    const handle = window.setTimeout(async () => {
      setSyncing(true);
      try {
        const result = await savePlan(plan);
        if (result.ok) {
          lastSyncedRef.current = serialized;
        } else {
          console.error("savePlan failed:", result.error);
        }
      } catch (err) {
        console.error("savePlan error:", err);
      } finally {
        setSyncing(false);
      }
    }, SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [hydrated, plan, setSyncing]);

  if (!hydrated) {
    return null;
  }
  return <>{children}</>;
}
