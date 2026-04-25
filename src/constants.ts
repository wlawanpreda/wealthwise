/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CSRCategory, FinancialAccount } from './types';

export const USER_INCOME = 112000;
export const SAVINGS_GOAL_TOTAL = 2880000;

export const CSR_TARGETS = {
  [CSRCategory.CONSTANT]: 0.50,
  [CSRCategory.SPENDING]: 0.30,
  [CSRCategory.RESERVE]: 0.20,
};

export const INITIAL_ALLOCATIONS = [
  // ... (unchanged)
];

export const INITIAL_LIABILITIES = [
  // ... (unchanged)
];

export const INITIAL_ACCOUNTS: FinancialAccount[] = [
  { 
    id: 'E1', 
    name: 'SCB (E-Saving)', 
    amount: 50000, 
    purpose: 'เงินสำรองฉุกเฉิน 3 เดือนแรก',
    isEmergencyFund: true,
    type: 'Savings'
  },
  { 
    id: 'E2', 
    name: 'LHB (Digital)', 
    amount: 25000, 
    purpose: 'เงินเก็บหมุนเวียน',
    isEmergencyFund: false,
    type: 'Savings'
  },
];
