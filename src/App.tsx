/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  LayoutDashboard,
  Target
} from 'lucide-react';
import { BudgetAllocation, Liability, FinancialAccount, CSRCategory, FinancialPlan } from './types';
import { calculateCSR, evaluatePillars } from './utils/financialLogic';
import PillarCard from './components/PillarCard';
import CSRChart from './components/CSRChart';
import WealthProgress from './components/WealthProgress';
import FinancialPlanner from './components/FinancialPlanner';
import ChatBot from './components/ChatBot';
import { formatCurrency, cn } from './lib/utils';
import { useFirebase } from './components/FirebaseProvider';
import LoginPage from './components/LoginPage';

export default function App() {
  const { user, loading, plan, savePlan, signOut } = useFirebase();

  const [income, setIncome] = React.useState(0);
  const [savingsTarget, setSavingsTarget] = React.useState(2880000);
  const [allocations, setAllocations] = React.useState<BudgetAllocation[]>([]);
  const [liabilities, setLiabilities] = React.useState<Liability[]>([]);
  const [accounts, setAccounts] = React.useState<FinancialAccount[]>([]);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const [activeTab, setActiveTab] = React.useState<'overview' | 'planning'>('overview');

  // Initialize local state from Firebase plan
  React.useEffect(() => {
    if (plan) {
      setIncome(plan.income);
      setSavingsTarget(plan.savingsTarget || 2880000);
      setAllocations(plan.allocations);
      setLiabilities(plan.liabilities);
      setAccounts(plan.emergencyFunds);
    }
  }, [plan]);

  // Sync back to Firebase on change (debounced)
  React.useEffect(() => {
    if (!user || !plan) return;

    const timer = setTimeout(async () => {
      // Check if actually changed to avoid redundant writes
      const currentPlan: FinancialPlan = {
        income,
        savingsTarget,
        allocations,
        liabilities,
        emergencyFunds: accounts
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
  }, [income, savingsTarget, allocations, liabilities, accounts, user, plan]);

  if (loading) {
    return (
      <div className="h-screen bg-brand-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-blue-600 w-10 h-10" />
          <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">กำลังเข้าถึงโหนดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const csr = calculateCSR(allocations);
  const pillars = evaluatePillars(allocations, liabilities, accounts, income);
  const totalAllocated = Object.values(csr).reduce((a, b) => a + b, 0);
  const liquidity = income - totalAllocated;
  const reserveAmount = csr[CSRCategory.RESERVE];
  const totalWealth = accounts.reduce((s, a) => s + a.amount, 0);

  const exportJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      income,
      csr_actual: csr,
      pillars: pillars,
      allocations,
      liabilities,
      emergencyFunds: accounts
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial_plan_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="bg-brand-bg text-brand-text font-sans h-screen flex overflow-hidden selection:bg-blue-100">
      {/* Sidebar: Navigation & Terminal Info */}
      <aside className="w-80 bg-white border-r border-brand-border flex flex-col shrink-0">
        <div className="p-6 border-b border-brand-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
            <span className="text-[10px] font-bold tracking-widest text-blue-700 uppercase">สถาปนิกการเงิน AI</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">เทอร์มินัลวางแผนการเงิน</h1>
        </div>

        {/* User Info & Cloud Sync Status */}
        <div className="px-6 py-4 border-b border-brand-border bg-brand-surface/30">
          <div className="flex items-center gap-3 mb-3">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-brand-border" alt="Avatar" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] text-brand-muted truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSyncing ? (
                <div className="flex items-center gap-1.5">
                  <RefreshCw size={10} className="animate-spin text-blue-600" />
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">กำลังซิงค์...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Cloud size={10} className="text-emerald-500" />
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">บันทึกเรียบร้อย</span>
                </div>
              )}
            </div>
            <button 
              onClick={signOut}
              className="text-[9px] font-bold text-brand-muted hover:text-red-500 uppercase tracking-widest underline decoration-dotted"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 flex flex-col gap-1">
          <NavButton 
            icon={LayoutDashboard} 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
            label="สรุปสุขภาพการเงิน"
          />
          <NavButton 
            icon={Target} 
            active={activeTab === 'planning'} 
            onClick={() => setActiveTab('planning')}
            label="วางแผนงบประมาณ/หนี้"
          />
        </div>

        {/* Integrated Chat Simulation in Sidebar */}
        <div className="flex-1 flex flex-col p-4 border-t border-brand-border overflow-hidden">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-4">การวิเคราะห์แบบสด</div>
          <ChatBot 
            context={{ income, savingsTarget, allocations, liabilities, accounts }} 
            pillars={pillars} 
          />
        </div>

        <div className="p-6 border-t border-brand-border bg-brand-surface">
          <div className="flex items-center justify-between text-[10px] mb-2 font-bold text-brand-muted uppercase tracking-widest">
            <span>สถานะระบบ</span>
            <span className="text-green-600">เชื่อมต่อแล้ว</span>
          </div>
          <div className="text-[10px] font-mono text-brand-secondary">ID: epj-project-instance</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto w-full flex flex-col gap-8">
          {activeTab === 'overview' ? (
            <>
              {/* Header Metric */}
              <WealthProgress current={totalWealth} target={savingsTarget} monthlySaving={reserveAmount} />

              {/* CSR Allocation Cards */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CSRCard 
                  label="Constant (คงที่)" 
                  value={csr[CSRCategory.CONSTANT]} 
                  limit={income * 0.5} 
                  targetLabel="50%"
                  status={csr[CSRCategory.CONSTANT] <= income * 0.5 ? "ปกติ" : "เกินงบ"}
                  statusColor={csr[CSRCategory.CONSTANT] <= income * 0.5 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}
                  description="ค่าใช้จ่ายคงที่ ภาระผ่อน พ่อแม่"
                />
                <CSRCard 
                  label="Spending (ใช้จ่าย)" 
                  value={csr[CSRCategory.SPENDING]} 
                  limit={income * 0.3} 
                  targetLabel="30%"
                  status={csr[CSRCategory.SPENDING] <= income * 0.3 ? "เหมาะสม" : "เริ่มเยอะ"}
                  statusColor={csr[CSRCategory.SPENDING] <= income * 0.3 ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}
                  description="อาหาร เดินทาง ไลฟ์สไตล์"
                />
                <CSRCard 
                  label="Reserve (สำรอง)" 
                  value={csr[CSRCategory.RESERVE]} 
                  limit={income * 0.2} 
                  targetLabel="20%"
                  status={csr[CSRCategory.RESERVE] >= income * 0.2 ? "ยอดเยี่ยม" : "ควรเพิ่ม"}
                  statusColor={csr[CSRCategory.RESERVE] >= income * 0.2 ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}
                  description="ลงทุน ประกัน เงินออม"
                />
              </section>

              {/* 4-Pillar Grid */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pillars.map((p, i) => (
                  <PillarCard key={`pillar-${i}`} pillar={p} />
                ))}
              </section>

              {/* Visualization & Quick Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-brand-border shadow-sm">
                  <h3 className="text-sm font-bold text-brand-muted uppercase tracking-widest mb-6">สมดุลการจัดสรรงบ</h3>
                  <CSRChart actual={csr} income={income} />
                </div>
                <div className="lg:col-span-8 flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-sm">
                    <h3 className="text-sm font-bold text-brand-muted uppercase tracking-widest mb-4">สรุปหนี้สินรายเดือน</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {liabilities.map(l => (
                        <div key={l.id} className="flex justify-between items-center p-3 bg-brand-surface rounded-lg">
                          <div>
                            <p className="text-xs font-bold text-brand-text">{l.name}</p>
                            <p className="text-[10px] text-brand-muted">ผ่อนคืนทุกวันที่ {l.dueDate}</p>
                          </div>
                          <p className="text-sm font-bold text-blue-600">{formatCurrency(l.monthlyPayment)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-sm">
                    <h3 className="text-sm font-bold text-brand-muted uppercase tracking-widest mb-4">เงินสำรองฉุกเฉิน</h3>
                    <div className="flex flex-wrap gap-4">
                      {accounts.filter(a => a.isEmergencyFund).map(f => (
                        <div key={f.id} className="flex-1 min-w-[200px] p-4 border border-brand-border rounded-xl">
                          <p className="text-[10px] font-bold text-emerald-600 mb-1 uppercase">{f.name}</p>
                          <p className="text-xl font-bold mb-1">{formatCurrency(f.amount)}</p>
                          <p className="text-[10px] text-brand-muted">{f.purpose}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <FinancialPlanner 
              income={income}
              setIncome={setIncome}
              savingsTarget={savingsTarget}
              setSavingsTarget={setSavingsTarget}
              allocations={allocations}
              setAllocations={setAllocations}
              liabilities={liabilities}
              setLiabilities={setLiabilities}
              accounts={accounts}
              setAccounts={setAccounts}
            />
          )}

          {/* Planning Header Footer */}
          <footer className="bg-brand-text text-white p-5 rounded-2xl flex items-center gap-8 mt-auto overflow-hidden">
            <div className="flex gap-4 items-center overflow-x-auto whitespace-nowrap scrollbar-hide">
              <span className="text-[10px] font-bold bg-[#344054] px-2 py-1 rounded shrink-0">สถานะงบประมาณ</span>
              <div className="text-sm font-mono flex gap-8">
                <span>เงินคงเหลือ: <span className={liquidity >= 0 ? "text-emerald-400" : "text-red-400"}>{formatCurrency(liquidity)}</span></span>
                <span>ภาระหนี้รวม: <span className="text-orange-300">{formatCurrency(liabilities.reduce((s,l) => s+l.monthlyPayment, 0))}</span></span>
                <span>เงินสำรองรวม: <span className="text-emerald-400">{formatCurrency(accounts.filter(a => a.isEmergencyFund).reduce((s,f) => s+f.amount, 0))}</span></span>
                <span>รายได้: <span className="text-blue-400">{formatCurrency(income)}</span></span>
              </div>
            </div>
            <div className="ml-auto flex gap-3 shrink-0">
               <button onClick={exportJSON} className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500 transition-colors">Export Plan</button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function NavButton({ icon: Icon, active, label, onClick }: { 
  icon: any; 
  active: boolean; 
  label: string;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all",
        active 
          ? "bg-brand-bg text-blue-700 shadow-sm" 
          : "text-brand-muted hover:bg-brand-surface hover:text-brand-text"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-blue-600" : "text-brand-secondary")} />
      {label}
    </button>
  );
}

function CSRCard({ label, value, limit, targetLabel, status, statusColor, description }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-bold text-brand-muted">{label} ({targetLabel})</h3>
        <span className={cn("text-[10px] font-bold px-2 py-1 rounded leading-none", statusColor)}>
          {status}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold">{formatCurrency(value).replace('฿', '')}</div>
        <div className="text-xs font-medium text-brand-secondary">/ {formatCurrency(limit).replace('฿', '')}</div>
      </div>
      <p className="text-[11px] text-brand-muted mt-2">{description}</p>
    </div>
  );
}

function NavIcon({ icon: Icon, active, label, onClick }: { 
  icon: any; 
  active: boolean; 
  label: string;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300",
        active ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="activeNav" 
          className="absolute -left-3 w-1.5 h-8 bg-slate-900 rounded-full" 
        />
      )}
    </button>
  );
}

function CSRStat({ label, value, target, income, color }: { 
  label: string; 
  value: number; 
  target: number;
  income: number;
  color?: string;
}) {
  const currentRatio = value / (income || 1);
  const isOver = currentRatio > target;

  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-sm font-black", color || "text-slate-900")}>
          {(currentRatio * 100).toFixed(0)}%
        </span>
        <span className="text-[10px] text-slate-400 font-bold uppercase">Actual</span>
      </div>
      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
        Target: {(target * 100).toFixed(0)}%
      </div>
    </div>
  );
}

