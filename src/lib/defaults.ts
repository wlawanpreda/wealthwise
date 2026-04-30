import type { FinancialPlan } from "@/lib/schemas";
import { CSR_CATEGORY } from "@/lib/schemas";

const id = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function buildSampleSeedPlan(): FinancialPlan {
  return {
    income: 50_000,
    savingsTarget: 2_880_000,
    allocations: [
      { id: id(), name: "ค่าเช่าบ้าน", amount: 12_000, category: CSR_CATEGORY.CONSTANT },
      { id: id(), name: "ประกันสุขภาพ", amount: 2_500, category: CSR_CATEGORY.CONSTANT },
      { id: id(), name: "ค่าอาหาร", amount: 8_000, category: CSR_CATEGORY.SPENDING },
      { id: id(), name: "ค่าเดินทาง", amount: 3_000, category: CSR_CATEGORY.SPENDING },
      { id: id(), name: "เงินออมฉุกเฉิน", amount: 5_000, category: CSR_CATEGORY.RESERVE },
      { id: id(), name: "กองทุนรวม", amount: 5_000, category: CSR_CATEGORY.RESERVE },
    ],
    liabilities: [],
    emergencyFunds: [
      {
        id: id(),
        name: "SCB E-Saving",
        amount: 50_000,
        purpose: "เงินสำรองฉุกเฉิน 3 เดือนแรก",
        isEmergencyFund: true,
        type: "Savings",
        transactions: [],
      },
    ],
    history: [],
    projections: [],
  };
}
