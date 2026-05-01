import {
  calculateThaiTax,
  computeMaxAdditionalContribution,
  estimateTaxSavings,
} from "@/features/tax/lib/thai-tax";
import { describe, expect, it } from "vitest";

describe("calculateThaiTax", () => {
  it("returns zero tax for a 150K-net or below earner", () => {
    const r = calculateThaiTax({ annualIncome: 200_000 });
    // 200K - 100K (50% capped) - 60K = 40K net taxable, all in 0% bracket
    expect(r.netTaxableIncome).toBe(40_000);
    expect(r.taxOwed).toBe(0);
    expect(r.marginalRate).toBe(0);
  });

  it("computes a typical salaried worker correctly", () => {
    // Annual 1.2M with no additional deductions:
    //   - expenses (capped at 100K): 100,000
    //   - personal: 60,000
    //   - net taxable: 1,040,000
    const r = calculateThaiTax({ annualIncome: 1_200_000 });
    expect(r.expenseAllowance).toBe(100_000);
    expect(r.personalAllowance).toBe(60_000);
    expect(r.netTaxableIncome).toBe(1_040_000);
    // Brackets up to 1,040,000:
    //   0..150,000      0%       0
    //   150,001..300K   5%       7,500   (slice 150K)
    //   300,001..500K   10%      20,000  (slice 200K)
    //   500,001..750K   15%      37,500  (slice 250K)
    //   750,001..1M     20%      50,000  (slice 250K)
    //   1,000,001..1.04M 25%     10,000  (slice 40K)
    //   total                    125,000
    expect(r.taxOwed).toBe(125_000);
    expect(r.marginalRate).toBe(0.25);
  });

  it("subtracts additional deductions before bracketing", () => {
    // Same earner, +200K RMF deduction
    const r = calculateThaiTax({ annualIncome: 1_200_000, additionalDeductions: 200_000 });
    expect(r.netTaxableIncome).toBe(840_000);
    // Brackets up to 840,000:
    //   0..150K          0%       0
    //   150,001..300K    5%       7,500
    //   300,001..500K   10%       20,000
    //   500,001..750K   15%       37,500
    //   750,001..840K   20%       18,000  (slice 90K)
    //   total                     83,000
    expect(r.taxOwed).toBe(83_000);
    expect(r.marginalRate).toBe(0.2);
  });

  it("hits the top bracket for a high earner", () => {
    const r = calculateThaiTax({ annualIncome: 7_000_000 });
    // expenses 100K, personal 60K → net taxable 6,840,000
    expect(r.marginalRate).toBe(0.35);
    expect(r.taxOwed).toBeGreaterThan(0);
    // Bracket breakdown should include all 8 brackets
    expect(r.bracketBreakdown.length).toBeGreaterThanOrEqual(7);
  });

  it("clamps negative income to zero", () => {
    const r = calculateThaiTax({ annualIncome: -5_000 });
    expect(r.grossIncome).toBe(0);
    expect(r.taxOwed).toBe(0);
  });

  it("effective rate is between 0 and marginal", () => {
    const r = calculateThaiTax({ annualIncome: 1_500_000 });
    expect(r.effectiveRate).toBeGreaterThan(0);
    expect(r.effectiveRate).toBeLessThan(r.marginalRate);
  });
});

describe("computeMaxAdditionalContribution", () => {
  it("RMF cap is min(500K, 30% income, combined cap)", () => {
    // Income 1M, 30% = 300K, individual cap 500K → 300K
    expect(computeMaxAdditionalContribution("RMF", 1_000_000, 0)).toBe(300_000);

    // Income 5M, 30% = 1.5M, individual cap 500K → 500K
    expect(computeMaxAdditionalContribution("RMF", 5_000_000, 0)).toBe(500_000);

    // Income 1M, already contributed 100K, no other retirement → 200K headroom
    expect(computeMaxAdditionalContribution("RMF", 1_000_000, 100_000)).toBe(200_000);
  });

  it("combined cap blocks further retirement contributions", () => {
    // RMF available: 500K cap, but already 400K in SSF → only 100K combined room
    expect(computeMaxAdditionalContribution("RMF", 5_000_000, 0, 400_000)).toBe(100_000);
  });

  it("life insurance has its own 100K cap, no rate-of-income limit", () => {
    expect(computeMaxAdditionalContribution("LIFE_INSURANCE", 500_000, 0)).toBe(100_000);
    expect(computeMaxAdditionalContribution("LIFE_INSURANCE", 500_000, 50_000)).toBe(50_000);
  });

  it("returns 0 when already at cap", () => {
    expect(computeMaxAdditionalContribution("SSF", 1_000_000, 200_000)).toBe(0);
  });
});

describe("estimateTaxSavings", () => {
  it("savings = amount * marginal rate", () => {
    expect(estimateTaxSavings(200_000, 0.2)).toBe(40_000);
    expect(estimateTaxSavings(100_000, 0.35)).toBe(35_000);
  });

  it("clamps negative amount", () => {
    expect(estimateTaxSavings(-100, 0.2)).toBe(0);
  });
});
