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
}

export interface FinancialAccount {
  id: string;
  name: string;
  amount: number;
  purpose: string;
  isEmergencyFund: boolean;
  type: 'Savings' | 'Fixed' | 'Investment' | 'Other';
}

export interface FinancialPlan {
  income: number;
  allocations: BudgetAllocation[];
  liabilities: Liability[];
  emergencyFunds: FinancialAccount[]; // Keep naming for backward compat in Firestore or rename carefully
  savingsTarget: number;
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
