import { calculateCSR, evaluatePillars } from "@/lib/financial-logic";
import {
  type BudgetAllocation,
  CSR_CATEGORY,
  type FinancialAccount,
  type Liability,
} from "@/lib/schemas";
import { describe, expect, it } from "vitest";

const alloc = (
  name: string,
  amount: number,
  category: keyof typeof CSR_CATEGORY,
): BudgetAllocation => ({
  id: `alloc-${name}`,
  name,
  amount,
  category: CSR_CATEGORY[category],
});

const liability = (id: string, total: number, monthly: number): Liability => ({
  id,
  name: id,
  totalAmount: total,
  monthlyPayment: monthly,
});

const account = (id: string, amount: number, isEmergency: boolean): FinancialAccount => ({
  id,
  name: id,
  amount,
  purpose: "test",
  isEmergencyFund: isEmergency,
  type: "Savings",
  transactions: [],
});

describe("calculateCSR", () => {
  it("sums allocations by category", () => {
    const result = calculateCSR([
      alloc("rent", 10000, "CONSTANT"),
      alloc("food", 5000, "SPENDING"),
      alloc("savings", 4000, "RESERVE"),
      alloc("insurance", 2000, "CONSTANT"),
    ]);
    expect(result[CSR_CATEGORY.CONSTANT]).toBe(12000);
    expect(result[CSR_CATEGORY.SPENDING]).toBe(5000);
    expect(result[CSR_CATEGORY.RESERVE]).toBe(4000);
  });

  it("returns zeros for empty allocations", () => {
    const result = calculateCSR([]);
    expect(result[CSR_CATEGORY.CONSTANT]).toBe(0);
    expect(result[CSR_CATEGORY.SPENDING]).toBe(0);
    expect(result[CSR_CATEGORY.RESERVE]).toBe(0);
  });
});

describe("evaluatePillars — wealth status ordering (regression for original bug)", () => {
  it("returns Critical when reserveRatio < 0.05 AND no emergency buffer", () => {
    const wealth = evaluatePillars(
      [
        alloc("rent", 50000, "CONSTANT"),
        alloc("food", 30000, "SPENDING"),
        alloc("tiny", 1000, "RESERVE"),
      ],
      [],
      [],
      100000,
    ).find((p) => p.name === "ความมั่งคั่ง");
    expect(wealth?.status).toBe("Critical");
  });

  it("returns Warning when reserve is moderate but buffer < 3 months", () => {
    const wealth = evaluatePillars(
      [
        alloc("rent", 30000, "CONSTANT"),
        alloc("food", 20000, "SPENDING"),
        alloc("savings", 8000, "RESERVE"),
      ],
      [],
      [account("e1", 50000, true)],
      100000,
    ).find((p) => p.name === "ความมั่งคั่ง");
    expect(wealth?.status).toBe("Warning");
  });

  it("returns Healthy with strong reserve and 3+ months buffer", () => {
    const wealth = evaluatePillars(
      [
        alloc("rent", 30000, "CONSTANT"),
        alloc("food", 10000, "SPENDING"),
        alloc("savings", 25000, "RESERVE"),
      ],
      [],
      [account("e1", 200000, true)],
      100000,
    ).find((p) => p.name === "ความมั่งคั่ง");
    expect(wealth?.status).toBe("Healthy");
  });
});

describe("evaluatePillars — DTI", () => {
  it("flags Critical when DTI > 45%", () => {
    const debt = evaluatePillars([], [liability("car", 500000, 50000)], [], 100000).find(
      (p) => p.name === "หนี้สิน",
    );
    expect(debt?.status).toBe("Critical");
  });

  it("is Healthy when DTI under 35%", () => {
    const debt = evaluatePillars([], [liability("card", 50000, 5000)], [], 100000).find(
      (p) => p.name === "หนี้สิน",
    );
    expect(debt?.status).toBe("Healthy");
  });
});

describe("evaluatePillars — handles zero income safely", () => {
  it("does not divide by zero", () => {
    const result = evaluatePillars([], [], [], 0);
    expect(result.every((p) => Number.isFinite(p.score))).toBe(true);
  });
});
