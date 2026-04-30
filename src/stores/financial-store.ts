"use client";

import { calculateCSR, evaluatePillars } from "@/lib/financial-logic";
import { CSR_CATEGORY, type FinancialPlan } from "@/lib/schemas";
import { newId, safeDivide } from "@/lib/utils";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

type Updater<T> = T | ((prev: T) => T);

interface FinancialState extends FinancialPlan {
  // hydration
  hydrated: boolean;
  isSyncing: boolean;
  setSyncing: (syncing: boolean) => void;
  hydrateFromPlan: (plan: FinancialPlan) => void;

  // setters (immutable, no React.SetStateAction surface)
  setIncome: (v: number) => void;
  setSavingsTarget: (v: number) => void;
  setAllocations: (u: Updater<FinancialPlan["allocations"]>) => void;
  setLiabilities: (u: Updater<FinancialPlan["liabilities"]>) => void;
  setAccounts: (u: Updater<FinancialPlan["emergencyFunds"]>) => void;
  setHistory: (u: Updater<NonNullable<FinancialPlan["history"]>>) => void;
  setProjections: (u: Updater<NonNullable<FinancialPlan["projections"]>>) => void;

  // domain actions
  takeSnapshot: () => void;
}

function applyUpdater<T>(updater: Updater<T>, current: T): T {
  return typeof updater === "function" ? (updater as (p: T) => T)(current) : updater;
}

export const useFinancialStore = create<FinancialState>()(
  devtools(
    (set, get) => ({
      hydrated: false,
      isSyncing: false,
      income: 0,
      savingsTarget: 2_880_000,
      allocations: [],
      liabilities: [],
      emergencyFunds: [],
      history: [],
      projections: [],

      setSyncing: (syncing) => set({ isSyncing: syncing }),

      hydrateFromPlan: (plan) =>
        set({
          income: plan.income,
          savingsTarget: plan.savingsTarget ?? 2_880_000,
          allocations: plan.allocations,
          liabilities: plan.liabilities,
          emergencyFunds: plan.emergencyFunds,
          history: plan.history ?? [],
          projections: plan.projections ?? [],
          hydrated: true,
        }),

      setIncome: (v) => set({ income: v }),
      setSavingsTarget: (v) => set({ savingsTarget: v }),
      setAllocations: (u) => set((s) => ({ allocations: applyUpdater(u, s.allocations) })),
      setLiabilities: (u) => set((s) => ({ liabilities: applyUpdater(u, s.liabilities) })),
      setAccounts: (u) => set((s) => ({ emergencyFunds: applyUpdater(u, s.emergencyFunds) })),
      setHistory: (u) => set((s) => ({ history: applyUpdater(u, s.history ?? []) })),
      setProjections: (u) => set((s) => ({ projections: applyUpdater(u, s.projections ?? []) })),

      takeSnapshot: () => {
        const s = get();
        const csr = calculateCSR(s.allocations);
        const totalWealth = s.emergencyFunds.reduce((sum, a) => sum + a.amount, 0);
        const totalDebt = s.liabilities.reduce((sum, l) => sum + l.totalAmount, 0);
        const netWorth = totalWealth - totalDebt;
        const savingsRate = safeDivide(csr[CSR_CATEGORY.RESERVE], s.income) * 100;

        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const snapshot = {
          id: newId(),
          month: monthStr,
          timestamp: Date.now(),
          totalWealth,
          totalDebt,
          netWorth,
          savingsRate,
        };

        const filtered = (s.history ?? []).filter((h) => h.month !== monthStr);
        set({
          history: [...filtered, snapshot].sort((a, b) => a.timestamp - b.timestamp),
        });
      },
    }),
    { name: "financial-store" },
  ),
);

// ----------------------------------------------------------------------------
// Selectors — keep derived calculations out of components
// ----------------------------------------------------------------------------
export function useDerivedFinancials() {
  const allocations = useFinancialStore((s) => s.allocations);
  const liabilities = useFinancialStore((s) => s.liabilities);
  const accounts = useFinancialStore((s) => s.emergencyFunds);
  const income = useFinancialStore((s) => s.income);

  const csr = calculateCSR(allocations);
  const constantAmount = csr[CSR_CATEGORY.CONSTANT];
  const spendingAmount = csr[CSR_CATEGORY.SPENDING];
  const reserveAmount = csr[CSR_CATEGORY.RESERVE];
  const totalWealth = accounts.reduce((s, a) => s + a.amount, 0);
  const totalDebt = liabilities.reduce((s, l) => s + l.totalAmount, 0);
  const netWorth = totalWealth - totalDebt;
  const totalEmergency = accounts
    .filter((a) => a.isEmergencyFund)
    .reduce((s, a) => s + a.amount, 0);
  const monthlyExpenses = constantAmount + spendingAmount;
  const emergencyMonths = safeDivide(totalEmergency, monthlyExpenses);
  const totalMonthlyDebt = liabilities.reduce((s, l) => s + l.monthlyPayment, 0);
  const dti = safeDivide(totalMonthlyDebt, income);
  const savingsRate = safeDivide(reserveAmount, income) * 100;
  const pillars = evaluatePillars(allocations, liabilities, accounts, income);

  return {
    csr,
    constantAmount,
    spendingAmount,
    reserveAmount,
    totalWealth,
    totalDebt,
    netWorth,
    monthlyExpenses,
    emergencyMonths,
    dti,
    savingsRate,
    pillars,
  };
}

export function useFinancialPlanSnapshot(): FinancialPlan {
  return useFinancialStore((s) => ({
    income: s.income,
    savingsTarget: s.savingsTarget,
    allocations: s.allocations,
    liabilities: s.liabilities,
    emergencyFunds: s.emergencyFunds,
    history: s.history,
    projections: s.projections,
  }));
}
