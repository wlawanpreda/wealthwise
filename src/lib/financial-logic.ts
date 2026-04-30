import {
  type BudgetAllocation,
  type CSRBreakdown,
  CSR_CATEGORY,
  type FinancialAccount,
  type Liability,
  type PillarStatus,
} from "@/lib/schemas";
import { safeDivide } from "@/lib/utils";

export function calculateCSR(allocations: BudgetAllocation[]): CSRBreakdown {
  const breakdown: CSRBreakdown = {
    [CSR_CATEGORY.CONSTANT]: 0,
    [CSR_CATEGORY.SPENDING]: 0,
    [CSR_CATEGORY.RESERVE]: 0,
  };
  for (const alloc of allocations) {
    breakdown[alloc.category] += alloc.amount;
  }
  return breakdown;
}

export function evaluatePillars(
  allocations: BudgetAllocation[],
  liabilities: Liability[],
  accounts: FinancialAccount[],
  income: number,
): PillarStatus[] {
  const csr = calculateCSR(allocations);
  const pillars: PillarStatus[] = [];

  // 1. สภาพคล่อง (Liquidity)
  const spendingRatio = safeDivide(csr[CSR_CATEGORY.SPENDING], income);
  const liquidityStatus =
    spendingRatio > 0.4 ? "Critical" : spendingRatio > 0.35 ? "Warning" : "Healthy";
  const liquidityAdvice =
    liquidityStatus === "Critical"
      ? " วิกฤต! ตัดงบฟุ่มเฟือยด่วน หรือพิจารณาลดรายจ่ายคงที่"
      : liquidityStatus === "Warning"
        ? " เริ่มตึงตัว! แนะนำคุมงบ Spending ไม่เกิน 30%"
        : " เยี่ยม! มีกระแสเงินสดหมุนเวียนได้ดี";

  pillars.push({
    name: "สภาพคล่อง",
    score: Math.max(0, 100 - (spendingRatio > 0.35 ? (spendingRatio - 0.35) * 500 : 0)),
    status: liquidityStatus,
    insight: `งบใช้จ่าย ${(spendingRatio * 100).toFixed(1)}% ของรายได้${liquidityAdvice}`,
  });

  // 2. หนี้สิน (Debt)
  const totalMonthlyDebt = liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const dti = safeDivide(totalMonthlyDebt, income);
  const debtStatus = dti > 0.45 ? "Critical" : dti > 0.35 ? "Warning" : "Healthy";
  const debtAdvice =
    debtStatus === "Critical"
      ? " แนะนำใช้แผน Snowball (ปิดยอดเล็ก) หรือ Avalanche (ปิดดอกเบี้ยสูง)"
      : debtStatus === "Warning"
        ? " ภาระสูง! ระวังการก่อหนี้ใหม่ และเร่งโปะหนี้ดอกเบี้ยแพง"
        : " ภาระหนี้เหมาะสม จัดการได้ดี";

  pillars.push({
    name: "หนี้สิน",
    score: Math.max(0, 100 - (dti > 0.35 ? (dti - 0.35) * 400 : 0)),
    status: debtStatus,
    insight: `DTI ${(dti * 100).toFixed(1)}% (ผ่อน ${totalMonthlyDebt.toLocaleString()}.-)${debtAdvice}`,
  });

  // 3. ความมั่งคั่ง (Wealth) — order: Critical first, then Warning, then Healthy
  const reserveRatio = safeDivide(csr[CSR_CATEGORY.RESERVE], income);
  const totalEmergency = accounts
    .filter((a) => a.isEmergencyFund)
    .reduce((sum, f) => sum + f.amount, 0);
  const monthlyExpenses = csr[CSR_CATEGORY.CONSTANT] + csr[CSR_CATEGORY.SPENDING];
  const monthsOfBuffer = safeDivide(totalEmergency, monthlyExpenses);

  const wealthStatus =
    reserveRatio < 0.05 || monthsOfBuffer < 1
      ? "Critical"
      : reserveRatio < 0.1 || monthsOfBuffer < 3
        ? "Warning"
        : "Healthy";

  const wealthAdvice =
    monthsOfBuffer < 3
      ? " สำรองน้อย! เน้นเก็บออมให้ครบ 3-6 เดือนก่อนลงทุนเสี่ยง"
      : reserveRatio < 0.15
        ? " แนะนำเพิ่มสัดส่วนออม/ลงทุนเป็น 20% เพื่อความมั่งคั่ง"
        : " รักษาระดับออมได้ดี เตรียมพร้อมรับทุกสถานการณ์";

  pillars.push({
    name: "ความมั่งคั่ง",
    score: Math.min(100, (reserveRatio / 0.2) * 100),
    status: wealthStatus,
    insight: `เงินสำรอง ${monthsOfBuffer.toFixed(1)} เดือน${wealthAdvice}`,
  });

  // 4. การประกันความเสี่ยง (Risk Protection) — match by name keywords
  const insuranceKeywords = ["ประกัน", "insurance"];
  const hasInsurance = allocations.some((a) => {
    const name = a.name.toLowerCase();
    return insuranceKeywords.some((k) => name.includes(k.toLowerCase()));
  });
  const riskAdvice = hasInsurance
    ? " มีพื้นฐานการป้องกันความเสี่ยงแล้ว"
    : " แนะนำเริ่มประกันสุขภาพ/อุบัติเหตุเพื่อลดความเสี่ยงเงินออม";

  pillars.push({
    name: "การประกันความเสี่ยง",
    score: hasInsurance ? 95 : 40,
    status: hasInsurance ? "Healthy" : "Critical",
    insight: hasInsurance
      ? `จัดสรรงบประกันแล้ว${riskAdvice}`
      : `แนะนำจัดสรร 5-10% สำหรับประกัน${riskAdvice}`,
  });

  return pillars;
}
