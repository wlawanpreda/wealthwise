import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  BudgetAllocation, 
  Liability, 
  FinancialAccount, 
  CSRCategory, 
  FinancialPlan, 
  FinancialSnapshot, 
  IncomeProjection,
  PillarStatus 
} from '../types';
import { calculateCSR, evaluatePillars } from '../utils/financialLogic';
import { useFirebase } from '../components/FirebaseProvider';

interface FinancialContextType {
  income: number;
  setIncome: (v: number) => void;
  savingsTarget: number;
  setSavingsTarget: (v: number) => void;
  allocations: BudgetAllocation[];
  setAllocations: React.Dispatch<React.SetStateAction<BudgetAllocation[]>>;
  liabilities: Liability[];
  setLiabilities: React.Dispatch<React.SetStateAction<Liability[]>>;
  accounts: FinancialAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FinancialAccount[]>>;
  history: FinancialSnapshot[];
  setHistory: React.Dispatch<React.SetStateAction<FinancialSnapshot[]>>;
  projections: IncomeProjection[];
  setProjections: React.Dispatch<React.SetStateAction<IncomeProjection[]>>;
  
  // Derived Data
  csr: Record<CSRCategory, number>;
  constantAmount: number;
  spendingAmount: number;
  reserveAmount: number;
  pillars: PillarStatus[];
  totalWealth: number;
  totalDebt: number;
  netWorth: number;
  emergencyMonths: number;
  dti: number;
  savingsRate: number;
  monthlyExpenses: number;
  
  // Actions
  takeSnapshot: () => void;
  isSyncing: boolean;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export function FinancialProvider({ children }: { children: React.ReactNode }) {
  const { user, plan, savePlan } = useFirebase();

  const [income, setIncome] = useState(0);
  const [savingsTarget, setSavingsTarget] = useState(2880000);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [history, setHistory] = useState<FinancialSnapshot[]>([]);
  const [projections, setProjections] = useState<IncomeProjection[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize from Firebase plan
  useEffect(() => {
    if (plan) {
      setIncome(plan.income);
      setSavingsTarget(plan.savingsTarget || 2880000);
      setAllocations(plan.allocations);
      setLiabilities(plan.liabilities);
      setAccounts(plan.emergencyFunds);
      setHistory(plan.history || []);
      setProjections(plan.projections || []);
    }
  }, [plan]);

  // Derived Values
  const csr = useMemo(() => calculateCSR(allocations), [allocations]);
  const constantAmount = csr[CSRCategory.CONSTANT];
  const spendingAmount = csr[CSRCategory.SPENDING];
  const reserveAmount = csr[CSRCategory.RESERVE];

  const pillars = useMemo(() => evaluatePillars(allocations, liabilities, accounts, income), [allocations, liabilities, accounts, income]);
  const totalWealth = useMemo(() => accounts.reduce((s, a) => s + a.amount, 0), [accounts]);
  const totalDebt = useMemo(() => liabilities.reduce((sum, l) => sum + l.totalAmount, 0), [liabilities]);
  const netWorth = totalWealth - totalDebt;
  
  const totalEmergency = useMemo(() => 
    accounts.filter(a => a.isEmergencyFund).reduce((sum, f) => sum + f.amount, 0), 
    [accounts]
  );
  const monthlyExpenses = constantAmount + spendingAmount;
  const emergencyMonths = totalEmergency / (monthlyExpenses || 1);
  const totalMonthlyDebt = liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const dti = totalMonthlyDebt / (income || 1);
  const savingsRate = (reserveAmount / (income || 1)) * 100;

  // Snapshot implementation
  const takeSnapshot = () => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const snapshot: FinancialSnapshot = {
      id: crypto.randomUUID(),
      month: monthStr,
      timestamp: Date.now(),
      totalWealth,
      totalDebt,
      netWorth,
      savingsRate
    };

    setHistory(prev => [...prev.filter(h => h.month !== monthStr), snapshot].sort((a, b) => a.timestamp - b.timestamp));
  };

  // Sync to Firebase
  useEffect(() => {
    if (!user || !plan) return;

    const timer = setTimeout(async () => {
      const currentPlan: FinancialPlan = {
        income,
        savingsTarget,
        allocations,
        liabilities,
        emergencyFunds: accounts,
        history,
        projections
      };

      if (JSON.stringify(currentPlan) !== JSON.stringify(plan)) {
        setIsSyncing(true);
        try {
          await savePlan(currentPlan);
        } finally {
          setIsSyncing(false);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [income, savingsTarget, allocations, liabilities, accounts, history, projections, user, plan, savePlan]);

  const value = {
    income, setIncome,
    savingsTarget, setSavingsTarget,
    allocations, setAllocations,
    liabilities, setLiabilities,
    accounts, setAccounts,
    history, setHistory,
    projections, setProjections,
    csr,
    constantAmount,
    spendingAmount,
    reserveAmount,
    pillars,
    totalWealth,
    totalDebt,
    netWorth,
    emergencyMonths,
    dti,
    savingsRate,
    monthlyExpenses,
    takeSnapshot,
    isSyncing
  };

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
}
