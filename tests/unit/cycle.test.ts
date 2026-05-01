import {
  formatThaiMonth,
  getCurrentCycleMonth,
  getCurrentCycleTotal,
  getLatestTransferMonth,
  isNewCycleAvailable,
  nextMonth,
} from "@/features/distribution/lib/cycle";
import type { BudgetAllocation } from "@/lib/schemas";
import { describe, expect, it } from "vitest";

const mkAlloc = (
  id: string,
  amount: number,
  isTransferred: boolean,
  historyTimestamps: number[] = [],
): BudgetAllocation => ({
  id,
  name: id,
  amount,
  category: "Constant",
  isTransferred,
  transferHistory: historyTimestamps.map((ts, i) => ({
    id: `${id}-h${i}`,
    timestamp: ts,
    amount,
    status: "Completed",
  })),
});

describe("getCurrentCycleMonth", () => {
  it("returns YYYY-MM in local time", () => {
    const result = getCurrentCycleMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("getLatestTransferMonth", () => {
  it("returns null when no transfers", () => {
    expect(getLatestTransferMonth([mkAlloc("a", 100, false)])).toBeNull();
  });

  it("returns the month of the most recent transfer", () => {
    const may = new Date("2026-05-10T08:00:00Z").getTime();
    const apr = new Date("2026-04-15T08:00:00Z").getTime();
    const result = getLatestTransferMonth([
      mkAlloc("a", 100, true, [apr]),
      mkAlloc("b", 200, true, [may]),
    ]);
    expect(result).toBe("2026-05");
  });

  it("only considers the newest entry per allocation (history is newest-first)", () => {
    const newest = new Date("2026-06-01T08:00:00Z").getTime();
    const older = new Date("2026-04-01T08:00:00Z").getTime();
    const result = getLatestTransferMonth([mkAlloc("a", 100, true, [newest, older])]);
    expect(result).toBe("2026-06");
  });
});

describe("isNewCycleAvailable", () => {
  it("false when no transfers exist", () => {
    expect(isNewCycleAvailable([mkAlloc("a", 100, false)])).toBe(false);
  });

  it("false when latest transfer is in the current month", () => {
    const now = Date.now();
    expect(isNewCycleAvailable([mkAlloc("a", 100, true, [now])])).toBe(false);
  });

  it("true when latest transfer is from a previous month", () => {
    // Pick a date that's definitely not in the current month — go back ~6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    expect(isNewCycleAvailable([mkAlloc("a", 100, true, [sixMonthsAgo.getTime()])])).toBe(true);
  });
});

describe("getCurrentCycleTotal", () => {
  it("sums only transferred allocations", () => {
    const total = getCurrentCycleTotal([
      mkAlloc("a", 100, true),
      mkAlloc("b", 200, false),
      mkAlloc("c", 300, true),
    ]);
    expect(total).toBe(400);
  });

  it("returns 0 for empty input", () => {
    expect(getCurrentCycleTotal([])).toBe(0);
  });
});

describe("formatThaiMonth", () => {
  it("formats YYYY-MM into Thai month name", () => {
    expect(formatThaiMonth("2026-05")).toBe("พฤษภาคม 2026");
    expect(formatThaiMonth("2025-12")).toBe("ธันวาคม 2025");
    expect(formatThaiMonth("2025-01")).toBe("มกราคม 2025");
  });

  it("returns input unchanged when it doesn't match the expected shape", () => {
    expect(formatThaiMonth("not-a-month")).toBe("not-a-month");
  });
});

describe("nextMonth", () => {
  it("advances within the same year", () => {
    expect(nextMonth("2026-05")).toBe("2026-06");
  });

  it("rolls over December to January of the next year", () => {
    expect(nextMonth("2026-12")).toBe("2027-01");
  });

  it("pads single-digit months", () => {
    expect(nextMonth("2026-08")).toBe("2026-09");
    expect(nextMonth("2026-09")).toBe("2026-10");
  });

  it("returns input unchanged for malformed values", () => {
    expect(nextMonth("garbage")).toBe("garbage");
  });
});
