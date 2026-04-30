import { simulateDebtPayoff } from "@/features/planning/lib/debt-timeline";
import type { Liability } from "@/lib/schemas";
import { describe, expect, it } from "vitest";

const liability = (id: string, total: number, monthly: number, rate?: number): Liability => ({
  id,
  name: id,
  totalAmount: total,
  monthlyPayment: monthly,
  interestRate: rate,
});

describe("simulateDebtPayoff", () => {
  it("returns null when no liabilities", () => {
    expect(simulateDebtPayoff([], "snowball", 0)).toBeNull();
  });

  it("snowball pays smallest balance first", () => {
    const result = simulateDebtPayoff(
      [liability("big", 100000, 5000), liability("small", 5000, 1000)],
      "snowball",
      0,
    );
    expect(result).not.toBeNull();
    expect(result?.steps[0]).toBe("small");
  });

  it("avalanche pays highest interest first", () => {
    const result = simulateDebtPayoff(
      [liability("low", 50000, 2000, 5), liability("high", 30000, 2000, 18)],
      "avalanche",
      0,
    );
    expect(result?.steps[0]).toBe("high");
  });

  it("extra payment shortens timeline", () => {
    const without = simulateDebtPayoff([liability("debt", 60000, 2000, 0)], "snowball", 0);
    const withExtra = simulateDebtPayoff([liability("debt", 60000, 2000, 0)], "snowball", 2000);
    expect(without?.months).toBeGreaterThan(withExtra?.months ?? 0);
  });

  it("caps simulation at 360 months", () => {
    const result = simulateDebtPayoff([liability("huge", 10_000_000, 100, 30)], "snowball", 0);
    expect(result?.months).toBeLessThanOrEqual(360);
  });
});
