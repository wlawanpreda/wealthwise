/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum CSRCategory {
  CONSTANT = 'Constant', // Fix-cost (50%)
  SPENDING = 'Spending', // Variable (30%)
  RESERVE = 'Reserve',   // Savings/Investments (20%)
}

export interface BudgetAllocation {
  id: string;
  name: string;
  amount: number;
  category: CSRCategory;
}

export interface Liability {
  id: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  dueDate?: string;
  interestRate?: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note: string;
}

export interface FinancialAccount {
  id: string;
  name: string;
  amount: number;
  purpose: string;
  isEmergencyFund: boolean;
  type: 'Savings' | 'Fixed' | 'Investment' | 'Other';
  transactions: Transaction[];
}

export interface FinancialSnapshot {
  id: string;
  month: string; // YYYY-MM
  timestamp: number;
  totalWealth: number;
  totalDebt: number;
  netWorth: number;
  savingsRate: number;
}

export interface IncomeProjection {
  id: string;
  name: string;
  monthlyAmountChange: number;
  startDate: string; // YYYY-MM
  type: 'increase' | 'decrease';
}

export interface FinancialPlan {
  income: number;
  allocations: BudgetAllocation[];
  liabilities: Liability[];
  emergencyFunds: FinancialAccount[];
  savingsTarget: number;
  history?: FinancialSnapshot[];
  projections?: IncomeProjection[];
}

export interface PillarStatus {
  name: string;
  score: number; // 0-100
  status: 'Healthy' | 'Warning' | 'Critical';
  insight: string;
}

export interface CSRBreakdown {
  [CSRCategory.CONSTANT]: number;
  [CSRCategory.SPENDING]: number;
  [CSRCategory.RESERVE]: number;
}
