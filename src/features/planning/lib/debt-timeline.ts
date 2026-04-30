import type { Liability } from "@/lib/schemas";

export interface DebtTimelinePoint {
  month: number;
  totalRemaining: number;
  [key: string]: number;
}

export interface DebtTimeline {
  months: number;
  years: string;
  history: DebtTimelinePoint[];
  steps: string[];
}

const MAX_MONTHS = 360;

export function simulateDebtPayoff(
  liabilities: Liability[],
  strategy: "snowball" | "avalanche",
  extraPayment: number,
): DebtTimeline | null {
  if (liabilities.length === 0) return null;

  const sorted = [...liabilities].sort((a, b) => {
    if (strategy === "snowball") return a.totalAmount - b.totalAmount;
    return (b.interestRate ?? 0) - (a.interestRate ?? 0);
  });

  const totalMinimumPayment = liabilities.reduce((s, l) => s + l.monthlyPayment, 0);
  const totalMonthlyBudget = totalMinimumPayment + extraPayment;
  const totalDebt = liabilities.reduce((s, l) => s + l.totalAmount, 0);

  const current = sorted.map((l) => ({ ...l }));
  let months = 0;
  const history: DebtTimelinePoint[] = [];

  const initial: DebtTimelinePoint = { month: 0, totalRemaining: totalDebt };
  for (const l of current) {
    initial[l.id] = l.totalAmount;
  }
  history.push(initial);

  while (current.some((l) => l.totalAmount > 0) && months < MAX_MONTHS) {
    months++;
    let remainingBudget = totalMonthlyBudget;
    const targetIdx = current.findIndex((l) => l.totalAmount > 0);

    for (const l of current) {
      if (l.totalAmount <= 0) continue;
      const monthlyRate = (l.interestRate ?? 0) / 100 / 12;
      l.totalAmount += l.totalAmount * monthlyRate;
      const minPay = Math.min(l.totalAmount, l.monthlyPayment);
      l.totalAmount -= minPay;
      remainingBudget -= minPay;
    }

    const target = targetIdx !== -1 ? current[targetIdx] : undefined;
    if (target && remainingBudget > 0) {
      const extra = Math.min(target.totalAmount, remainingBudget);
      target.totalAmount -= extra;
    }

    let totalRemaining = 0;
    const point: DebtTimelinePoint = { month: months, totalRemaining: 0 };
    for (const l of current) {
      const remaining = Math.max(0, l.totalAmount);
      point[l.id] = remaining;
      totalRemaining += remaining;
    }
    point.totalRemaining = totalRemaining;
    history.push(point);
  }

  return {
    months,
    years: (months / 12).toFixed(1),
    history,
    steps: sorted.map((l) => l.name),
  };
}
