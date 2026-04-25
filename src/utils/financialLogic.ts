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
  pillars.push({
    name: 'สภาพคล่อง',
    score: Math.max(0, 100 - (spendingRatio > 0.35 ? (spendingRatio - 0.35) * 500 : 0)),
    status: spendingRatio > 0.4 ? 'Critical' : spendingRatio > 0.35 ? 'Warning' : 'Healthy',
    insight: `งบใช้จ่าย ${(spendingRatio * 100).toFixed(1)}% ของรายได้ ${(liquidity > 0 ? `เหลือกระแสเงินสด ${liquidity.toLocaleString()} บาท` : 'งบประมาณตึงตัว')}`,
  });

  // 2. หนี้สิน (Debt Management)
  const totalMonthlyDebt = liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const dti = totalMonthlyDebt / (income || 1);
  pillars.push({
    name: 'หนี้สิน',
    score: Math.max(0, 100 - (dti > 0.35 ? (dti - 0.35) * 400 : 0)),
    status: dti > 0.45 ? 'Critical' : dti > 0.35 ? 'Warning' : 'Healthy',
    insight: `DTI อยู่ที่ ${(dti * 100).toFixed(1)}% (ยอดผ่อน ${totalMonthlyDebt.toLocaleString()}.-/ด.)`,
  });

  // 3. ความมั่งคั่ง (Wealth Growth / Reserve)
  const reserveRatio = csr[CSRCategory.RESERVE] / (income || 1);
  const totalEmergency = accounts.filter(a => a.isEmergencyFund).reduce((sum, f) => sum + f.amount, 0);
  const monthsOfBuffer = totalEmergency / (csr[CSRCategory.CONSTANT] + csr[CSRCategory.SPENDING] || 1);
  
  pillars.push({
    name: 'ความมั่งคั่ง',
    score: Math.min(100, (reserveRatio / 0.2) * 100),
    status: reserveRatio < 0.1 || monthsOfBuffer < 3 ? 'Warning' : 'Healthy',
    insight: `เงินสำรองครอบคลุม ${monthsOfBuffer.toFixed(1)} เดือน (เป้าหมาย 6 เดือน)`,
  });

  // 4. การประกันความเสี่ยง (Risk Protection)
  const hasInsurance = allocations.some(a => a.name.includes('ประกัน') || a.name.toLowerCase().includes('insurance'));
  pillars.push({
    name: 'การประกันความเสี่ยง',
    score: hasInsurance ? 95 : 40,
    status: hasInsurance ? 'Healthy' : 'Critical',
    insight: hasInsurance 
      ? 'จัดสรรงบประกันเรียบร้อย' 
      : 'แนะนำให้จัดสรร 5-10% สำหรับประกัน',
  });

  return pillars;
}
