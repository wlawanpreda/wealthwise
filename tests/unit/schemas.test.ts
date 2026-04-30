import { FinancialPlanSchema } from "@/lib/schemas";
import { describe, expect, it } from "vitest";

describe("FinancialPlanSchema", () => {
  it("accepts a minimal valid plan", () => {
    const result = FinancialPlanSchema.safeParse({
      income: 50000,
      allocations: [],
      liabilities: [],
      emergencyFunds: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.savingsTarget).toBe(2_880_000);
    }
  });

  it("rejects negative income", () => {
    const result = FinancialPlanSchema.safeParse({
      income: -1,
      allocations: [],
      liabilities: [],
      emergencyFunds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many allocations", () => {
    const allocations = Array.from({ length: 100 }, (_, i) => ({
      id: `a-${i}`,
      name: `item-${i}`,
      amount: 100,
      category: "Constant" as const,
    }));
    const result = FinancialPlanSchema.safeParse({
      income: 50000,
      allocations,
      liabilities: [],
      emergencyFunds: [],
    });
    expect(result.success).toBe(false);
  });
});
