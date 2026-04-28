import { BudgetAllocation, Liability, FinancialAccount, CSRCategory, CSRBreakdown, PillarStatus } from '../types';
import { USER_INCOME } from '../constants';

export function calculateCSR(allocations: BudgetAllocation[]): CSRBreakdown {
  return allocations.reduce(
    (acc, alloc) => {
      acc[alloc.category] += alloc.amount;
      return acc;
    },
    {
      [CSRCategory.CONSTANT]: 0,
      [CSRCategory.SPENDING]: 0,
      [CSRCategory.RESERVE]: 0,
    } as CSRBreakdown
  );
}

export function evaluatePillars(
  allocations: BudgetAllocation[], 
  liabilities: Liability[], 
  accounts: FinancialAccount[],
  income: number
): PillarStatus[] {
  const csr = calculateCSR(allocations);
  const totalAllocated = Object.values(csr).reduce((a, b) => a + b, 0);
  const liquidity = income - totalAllocated;
  
  const pillars: PillarStatus[] = [];

  // 1. สภาพคล่อง (Liquidity/Cash Flow)
  const spendingRatio = csr[CSRCategory.SPENDING] / (income || 1);
  const liquidityStatus = spendingRatio > 0.4 ? 'Critical' : spendingRatio > 0.35 ? 'Warning' : 'Healthy';
  let liquidityAdvice = '';
  if (liquidityStatus === 'Critical') {
    liquidityAdvice = ' วิกฤต! ตัดงบฟุ่มเฟือยด่วน หรือพิจารณาลดรายจ่ายคงที่';
  } else if (liquidityStatus === 'Warning') {
    liquidityAdvice = ' เริ่มตึงตัว! แนะนำคุมงบ Spending ไม่เกิน 30%';
  } else {
    liquidityAdvice = ' เยี่ยม! มีกระแสเงินสดหมุนเวียนได้ดี';
  }

  pillars.push({
    name: 'สภาพคล่อง',
    score: Math.max(0, 100 - (spendingRatio > 0.35 ? (spendingRatio - 0.35) * 500 : 0)),
    status: liquidityStatus,
    insight: `งบใช้จ่าย ${(spendingRatio * 100).toFixed(1)}% ของรายได้${liquidityAdvice}`,
  });

  // 2. หนี้สิน (Debt Management)
  const totalMonthlyDebt = liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const dti = totalMonthlyDebt / (income || 1);
  const debtStatus = dti > 0.45 ? 'Critical' : dti > 0.35 ? 'Warning' : 'Healthy';
  let debtAdvice = '';
  if (debtStatus === 'Critical') {
    debtAdvice = ' แนะนำใช้แผน Snowball (ปิดยอดเล็ก) หรือ Avalanche (ปิดดอกเบี้ยสูง)';
  } else if (debtStatus === 'Warning') {
    debtAdvice = ' ภาระสูง! ระวังการก่อหนี้ใหม่ และเร่งโปะหนี้ดอกเบี้ยแพง';
  } else {
    debtAdvice = ' ภาระหนี้เหมาะสม จัดการได้ดี';
  }

  pillars.push({
    name: 'หนี้สิน',
    score: Math.max(0, 100 - (dti > 0.35 ? (dti - 0.35) * 400 : 0)),
    status: debtStatus,
    insight: `DTI ${(dti * 100).toFixed(1)}% (ผ่อน ${totalMonthlyDebt.toLocaleString()}.-)${debtAdvice}`,
  });

  // 3. ความมั่งคั่ง (Wealth Growth / Reserve)
  const reserveRatio = csr[CSRCategory.RESERVE] / (income || 1);
  const totalEmergency = accounts.filter(a => a.isEmergencyFund).reduce((sum, f) => sum + f.amount, 0);
  const monthsOfBuffer = totalEmergency / (csr[CSRCategory.CONSTANT] + csr[CSRCategory.SPENDING] || 1);
  const wealthStatus = reserveRatio < 0.1 || monthsOfBuffer < 3 ? 'Warning' : reserveRatio < 0.05 || monthsOfBuffer < 1 ? 'Critical' : 'Healthy';
  
  let wealthAdvice = '';
  if (monthsOfBuffer < 3) {
    wealthAdvice = ' สำรองน้อย! เน้นเก็บออมให้ครบ 3-6 เดือนก่อนลงทุนเสี่ยง';
  } else if (reserveRatio < 0.15) {
    wealthAdvice = ' แนะนำเพิ่มสัดส่วนออม/ลงทุนเป็น 20% เพื่อความมั่งคั่ง';
  } else {
    wealthAdvice = ' รักษาระดับออมได้ดี เตรียมพร้อมรับทุกสถานการณ์';
  }

  pillars.push({
    name: 'ความมั่งคั่ง',
    score: Math.min(100, (reserveRatio / 0.2) * 100),
    status: wealthStatus,
    insight: `เงินสำรอง ${monthsOfBuffer.toFixed(1)} เดือน${wealthAdvice}`,
  });

  // 4. การประกันความเสี่ยง (Risk Protection)
  const hasInsurance = allocations.some(a => a.name.includes('ประกัน') || a.name.toLowerCase().includes('insurance'));
  let riskAdvice = '';
  if (!hasInsurance) {
    riskAdvice = ' แนะนำเริ่มประกันสุขภาพ/อุบัติเหตุเพื่อลดความเสี่ยงเงินออม';
  } else {
    riskAdvice = ' มีพื้นฐานการป้องกันความเสี่ยงแล้ว';
  }

  pillars.push({
    name: 'การประกันความเสี่ยง',
    score: hasInsurance ? 95 : 40,
    status: hasInsurance ? 'Healthy' : 'Critical',
    insight: hasInsurance 
      ? `จัดสรรงบประกันแล้ว${riskAdvice}` 
      : `แนะนำจัดสรร 5-10% สำหรับประกัน${riskAdvice}`,
  });

  return pillars;
}
