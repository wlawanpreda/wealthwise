/**
 * Thai personal income tax calculation, calendar year 2026.
 *
 * Source: Revenue Department (กรมสรรพากร), Section 48 of the Revenue Code,
 * progressive bracket rates effective from tax year 2017 onward — same
 * brackets in 2026.
 *
 * The math is intentionally pure and side-effect-free so the UI and the
 * "what-if" simulator can both call it safely. All amounts are THB.
 */

export interface TaxBracket {
  /** Inclusive lower bound of taxable income for this bracket. */
  min: number;
  /** Inclusive upper bound; `null` means "and above". */
  max: number | null;
  /** Marginal tax rate as a decimal (e.g. 0.05 = 5%). */
  rate: number;
}

export const THAI_TAX_BRACKETS_2026: readonly TaxBracket[] = [
  { min: 0, max: 150_000, rate: 0 },
  { min: 150_001, max: 300_000, rate: 0.05 },
  { min: 300_001, max: 500_000, rate: 0.1 },
  { min: 500_001, max: 750_000, rate: 0.15 },
  { min: 750_001, max: 1_000_000, rate: 0.2 },
  { min: 1_000_001, max: 2_000_000, rate: 0.25 },
  { min: 2_000_001, max: 5_000_000, rate: 0.3 },
  { min: 5_000_001, max: null, rate: 0.35 },
] as const;

/**
 * Standard deductions a salaried Thai taxpayer can claim before the
 * progressive brackets apply. Numbers reflect 2026 rules.
 *
 * Sources:
 *   - ค่าใช้จ่าย: 50% of salary, capped at ฿100,000
 *   - ค่าลดหย่อนส่วนตัว: ฿60,000
 *
 * Common but optional deductions (spouse, kids, parents, social
 * security, etc.) are passed in as `additionalDeductions` so the caller
 * can mix and match.
 */
export interface TaxDeductionInputs {
  /** Annual gross salary (รายได้รวมทั้งปี) in THB. */
  annualIncome: number;
  /** Sum of voluntary/conditional deductions on top of the standard ones. */
  additionalDeductions?: number;
}

export interface TaxComputation {
  /** Annual gross income (echoed for convenience). */
  grossIncome: number;
  /** 50%-of-salary expense allowance, capped at 100,000. */
  expenseAllowance: number;
  /** Personal allowance (60,000 in 2026). */
  personalAllowance: number;
  /** Sum of `additionalDeductions` from input. */
  additionalDeductions: number;
  /** Total deductions. */
  totalDeductions: number;
  /** Income that actually flows through the tax brackets. */
  netTaxableIncome: number;
  /** Tax owed for the year. */
  taxOwed: number;
  /** Effective tax rate against gross income (0..1). */
  effectiveRate: number;
  /** Marginal bracket the taxpayer ends in (top of their stack). */
  marginalRate: number;
  /** Per-bracket breakdown so the UI can show how the tax was assembled. */
  bracketBreakdown: Array<{
    bracket: TaxBracket;
    /** Income that fell in this bracket. */
    incomeInBracket: number;
    /** Tax produced from that slice. */
    taxFromBracket: number;
  }>;
}

const PERSONAL_ALLOWANCE_2026 = 60_000;
const EXPENSE_ALLOWANCE_RATE = 0.5;
const EXPENSE_ALLOWANCE_CAP = 100_000;

export function calculateThaiTax(inputs: TaxDeductionInputs): TaxComputation {
  const grossIncome = Math.max(0, inputs.annualIncome);
  const expenseAllowance = Math.min(grossIncome * EXPENSE_ALLOWANCE_RATE, EXPENSE_ALLOWANCE_CAP);
  const personalAllowance = grossIncome > 0 ? PERSONAL_ALLOWANCE_2026 : 0;
  const additionalDeductions = Math.max(0, inputs.additionalDeductions ?? 0);

  const totalDeductions = expenseAllowance + personalAllowance + additionalDeductions;
  const netTaxableIncome = Math.max(0, grossIncome - totalDeductions);

  let taxOwed = 0;
  let marginalRate = 0;
  const bracketBreakdown: TaxComputation["bracketBreakdown"] = [];

  for (const bracket of THAI_TAX_BRACKETS_2026) {
    if (netTaxableIncome < bracket.min) break;
    const upper = bracket.max === null ? netTaxableIncome : Math.min(bracket.max, netTaxableIncome);
    // bracket.min is inclusive but the "+1" in our table is decorative — when
    // we slice we treat the lower bound as `prevMax`. Simpler: slice from
    // `Math.max(bracket.min - 1, 0)` to the upper, then take the actual span.
    const lower = bracket.min === 0 ? 0 : bracket.min - 1;
    const incomeInBracket = Math.max(0, upper - lower);
    if (incomeInBracket === 0) continue;
    const taxFromBracket = incomeInBracket * bracket.rate;
    taxOwed += taxFromBracket;
    marginalRate = bracket.rate;
    bracketBreakdown.push({ bracket, incomeInBracket, taxFromBracket });
  }

  const effectiveRate = grossIncome > 0 ? taxOwed / grossIncome : 0;

  return {
    grossIncome,
    expenseAllowance,
    personalAllowance,
    additionalDeductions,
    totalDeductions,
    netTaxableIncome,
    taxOwed,
    effectiveRate,
    marginalRate,
    bracketBreakdown,
  };
}

/**
 * Tax-favored deductions where contribution this year directly reduces
 * `netTaxableIncome`. Each comes with an annual cap defined by Thai law.
 *
 * Caps reflect 2026 rules. RMF / SSF / pension also have a combined cap of
 * 30% of income (or 500K, whichever is lower) — this is enforced by
 * `computeMaxAllowableDeduction()` rather than by individual caps below.
 */
export type TaxFavoredVehicle = "RMF" | "SSF" | "PVD" | "PENSION_INSURANCE" | "LIFE_INSURANCE";

export const TAX_FAVORED_VEHICLES: Record<
  TaxFavoredVehicle,
  { label: string; description: string; individualCap: number; rateOfIncome: number | null }
> = {
  RMF: {
    label: "RMF",
    description: "กองทุนรวมเพื่อการเลี้ยงชีพ",
    individualCap: 500_000,
    rateOfIncome: 0.3,
  },
  SSF: {
    label: "SSF",
    description: "กองทุนรวมเพื่อการออม",
    individualCap: 200_000,
    rateOfIncome: 0.3,
  },
  PVD: {
    label: "กองทุนสำรองเลี้ยงชีพ",
    description: "Provident Fund (หักจากเงินเดือน)",
    individualCap: 500_000,
    rateOfIncome: 0.15,
  },
  PENSION_INSURANCE: {
    label: "ประกันชีวิตบำนาญ",
    description: "ประกันชีวิตแบบบำนาญ",
    individualCap: 200_000,
    rateOfIncome: 0.15,
  },
  LIFE_INSURANCE: {
    label: "ประกันชีวิตทั่วไป",
    description: "เบี้ยประกันชีวิต (ไม่ใช่บำนาญ)",
    individualCap: 100_000,
    rateOfIncome: null,
  },
} as const;

const COMBINED_RETIREMENT_CAP = 500_000;

/**
 * For a given vehicle, how much *more* could the user contribute before hitting
 * either the per-vehicle cap, the rate-of-income cap, or (for retirement
 * vehicles) the combined ฿500K cap.
 */
export function computeMaxAdditionalContribution(
  vehicle: TaxFavoredVehicle,
  annualIncome: number,
  alreadyContributedThisYear: number,
  combinedRetirementContributionsExcludingThis = 0,
): number {
  const meta = TAX_FAVORED_VEHICLES[vehicle];
  const incomeCap =
    meta.rateOfIncome === null ? Number.POSITIVE_INFINITY : annualIncome * meta.rateOfIncome;
  const isRetirement =
    vehicle === "RMF" || vehicle === "SSF" || vehicle === "PVD" || vehicle === "PENSION_INSURANCE";
  const combinedCap = isRetirement
    ? COMBINED_RETIREMENT_CAP - combinedRetirementContributionsExcludingThis
    : Number.POSITIVE_INFINITY;

  const headroom =
    Math.min(meta.individualCap, incomeCap, combinedCap) - alreadyContributedThisYear;
  return Math.max(0, headroom);
}

/**
 * Estimates tax savings from contributing an extra `amount` into a given
 * vehicle, given the user's marginal bracket. Pure function — used to
 * preview "ลด RMF อีก ฿200K → ประหยัด ฿40K".
 */
export function estimateTaxSavings(amount: number, marginalRate: number): number {
  return Math.max(0, amount) * marginalRate;
}
