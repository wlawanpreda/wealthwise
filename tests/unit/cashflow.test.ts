import { buildCashflowMonth } from "@/features/cashflow/lib/cashflow";
import type { Liability } from "@/lib/schemas";
import { describe, expect, it } from "vitest";

const liability = (id: string, monthlyPayment: number, dueDate?: string, name = id): Liability => ({
  id,
  name,
  totalAmount: 0,
  monthlyPayment,
  dueDate,
});

describe("buildCashflowMonth", () => {
  it("builds a payday-only month when there are no liabilities", () => {
    const r = buildCashflowMonth({
      startingBalance: 50_000,
      monthlyIncome: 100_000,
      liabilities: [],
      year: 2026,
      month: 5, // May has 31 days
    });
    expect(r.daysInMonth).toBe(31);
    expect(r.totalInflow).toBe(100_000);
    expect(r.totalOutflow).toBe(0);
    expect(r.daysWithEvents).toHaveLength(1);
    expect(r.daysWithEvents[0]?.day).toBe(25);
    expect(r.dailyBalances[24]).toBe(150_000); // index 24 = day 25
    expect(r.dailyBalances.at(-1)).toBe(150_000);
  });

  it("schedules debt payments and computes the lowest balance", () => {
    const r = buildCashflowMonth({
      startingBalance: 30_000,
      monthlyIncome: 100_000,
      liabilities: [liability("rent", 22_000, "5", "บ้าน"), liability("car", 9_000, "10", "รถ")],
      year: 2026,
      month: 5,
    });

    // Day 5: -22K → 8,000
    // Day 10: -9K → -1,000 ← lowest
    // Day 25: +100K → 99,000
    expect(r.dailyBalances[4]).toBe(8_000);
    expect(r.dailyBalances[9]).toBe(-1_000);
    expect(r.dailyBalances[24]).toBe(99_000);
    expect(r.lowestPoint).toEqual({ day: 10, balance: -1_000 });
    expect(r.totalInflow).toBe(100_000);
    expect(r.totalOutflow).toBe(31_000);
  });

  it("returns null lowestPoint if the balance never dips below start", () => {
    const r = buildCashflowMonth({
      startingBalance: 50_000,
      monthlyIncome: 50_000,
      liabilities: [], // no outflows
      year: 2026,
      month: 5,
    });
    expect(r.lowestPoint).toBeNull();
  });

  it("clamps an out-of-range due date to the last day", () => {
    // June only has 30 days; "31" must clamp to 30
    const r = buildCashflowMonth({
      startingBalance: 0,
      monthlyIncome: 0,
      liabilities: [liability("rent", 5_000, "31")],
      year: 2026,
      month: 6,
    });
    expect(r.daysWithEvents).toHaveLength(1);
    expect(r.daysWithEvents[0]?.day).toBe(30);
  });

  it("treats unparseable due date as end of month", () => {
    const r = buildCashflowMonth({
      startingBalance: 0,
      monthlyIncome: 0,
      liabilities: [liability("rent", 5_000, "garbage")],
      year: 2026,
      month: 4, // 30 days
    });
    expect(r.daysWithEvents[0]?.day).toBe(30);
  });

  it("groups multiple events on the same day", () => {
    const r = buildCashflowMonth({
      startingBalance: 0,
      monthlyIncome: 0,
      liabilities: [
        liability("a", 1_000, "5"),
        liability("b", 2_000, "5"),
        liability("c", 500, "5"),
      ],
      year: 2026,
      month: 5,
    });
    expect(r.daysWithEvents).toHaveLength(1);
    expect(r.daysWithEvents[0]?.events).toHaveLength(3);
    expect(r.daysWithEvents[0]?.netDelta).toBe(-3_500);
  });

  it("ignores liabilities with monthlyPayment = 0", () => {
    const r = buildCashflowMonth({
      startingBalance: 10_000,
      monthlyIncome: 0,
      liabilities: [liability("zero", 0, "10")],
      year: 2026,
      month: 5,
    });
    expect(r.daysWithEvents).toHaveLength(0);
    expect(r.totalOutflow).toBe(0);
  });

  it("uses custom payday when provided", () => {
    const r = buildCashflowMonth({
      startingBalance: 0,
      monthlyIncome: 50_000,
      payday: 1,
      liabilities: [],
      year: 2026,
      month: 5,
    });
    expect(r.daysWithEvents[0]?.day).toBe(1);
  });
});
