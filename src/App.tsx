/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Cloud, 
  RefreshCw,
  LayoutDashboard,
  Target,
  ArrowRightLeft,
  History as HistoryIcon
} from 'lucide-react';
import { CSRCategory } from './types';
import { fetchExternalInvestments } from './services/externalFinancials';
import PillarCard from './components/PillarCard';
import CSRChart from './components/CSRChart';
import WealthProgress from './components/WealthProgress';
import FinancialPlanner from './components/FinancialPlanner';
import FinancialMilestones from './components/FinancialMilestones';
import TrendDashboard from './components/TrendDashboard';
import SalaryDistribution from './components/SalaryDistribution';
import ChatBot from './components/ChatBot';
import { formatCurrency, cn } from './lib/utils';
import { useFirebase } from './components/FirebaseProvider';
import { useFinancial } from './context/FinancialContext';
import LoginPage from './components/LoginPage';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { NavButton } from './components/layout/NavButton';
import { CSRCard } from './components/ui/CSRCard';

export default function App() {
  const { user, loading, signOut } = useFirebase();
  const { 
    income, savingsTarget, allocations, liabilities, accounts,
    totalWealth, totalDebt, netWorth, dti, reserveAmount, emergencyMonths, csr, pillars,
    isSyncing, takeSnapshot
  } = useFinancial();
  
  const { isExternalSyncing, syncExternalInvestments, exportJSON } = useFinancialInternal();

  const [activeTab, setActiveTab] = React.useState<'overview' | 'planning' | 'trends' | 'distribution'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

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

  return (
    <div className="bg-brand-bg text-brand-text font-sans h-screen flex flex-col md:flex-row overflow-hidden selection:bg-blue-100">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-brand-border shrink-0 z-[60]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 text-brand-muted hover:text-brand-text"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={cn("w-full h-0.5 bg-current transition-transform", isSidebarOpen && "rotate-45 translate-y-[7px]")}></span>
              <span className={cn("w-full h-0.5 bg-current transition-opacity", isSidebarOpen && "opacity-0")}></span>
              <span className={cn("w-full h-0.5 bg-current transition-transform", isSidebarOpen && "-rotate-45 -translate-y-[7px]")}></span>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
            <h1 className="text-sm font-bold tracking-tight">เทอร์มินัลการเงิน</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSyncing ? (
            <RefreshCw size={14} className="animate-spin text-blue-600" />
          ) : (
            <Cloud size={14} className="text-emerald-500" />
          )}
          <img src={user.photoURL || ''} className="w-6 h-6 rounded-full border border-brand-border" alt="Avatar" />
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-[50] md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar: Navigation & Terminal Info */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-80 bg-white border-r border-brand-border flex flex-col shrink-0 z-[55] transition-transform duration-300 md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
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
            onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
            label="สรุปสุขภาพการเงิน"
          />
          <NavButton 
            icon={Target} 
            active={activeTab === 'planning'} 
            onClick={() => { setActiveTab('planning'); setIsSidebarOpen(false); }}
            label="วางแผนงบประมาณ/หนี้"
          />
          <NavButton 
            icon={ArrowRightLeft} 
            active={activeTab === 'distribution'} 
            onClick={() => { setActiveTab('distribution'); setIsSidebarOpen(false); }}
            label="จัดการการโอนเงินเดือน"
          />
          <NavButton 
            icon={HistoryIcon} 
            active={activeTab === 'trends'} 
            onClick={() => { setActiveTab('trends'); setIsSidebarOpen(false); }}
            label="แนวโน้มความมั่งคั่ง"
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
      <main className="flex-1 flex flex-col overflow-y-auto blueprint-grid bg-fixed">
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 md:gap-10 flex-1 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-6 md:gap-10"
            >
              {activeTab === 'overview' ? (
                <>
                  {/* Header Metric */}
                  <WealthProgress />
                  
                  {/* Additional Action for monthly record */}
                  <div className="flex justify-end -mt-6">
                    <Button 
                      variant="surface" 
                      size="sm" 
                      className="gap-2 text-blue-700 font-black uppercase tracking-widest border-blue-600/10 group h-10 px-6 rounded-xl hover:bg-blue-600 hover:text-white"
                      onClick={takeSnapshot}
                    >
                      <HistoryIcon size={14} className="group-hover:rotate-[-45deg] transition-transform" />
                      Generate Wealth Snapshot
                    </Button>
                  </div>

                  {/* Financial Roadmap Milestones */}
                  <FinancialMilestones />

                  {/* CSR Allocation Cards */}
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <CSRCard 
                      label="Constant (คงที่)" 
                      value={csr[CSRCategory.CONSTANT]} 
                      limit={(income || 0) * 0.5} 
                      targetLabel="50%"
                      status={csr[CSRCategory.CONSTANT] <= (income || 0) * 0.5 ? "OPTIMAL" : "OVER BUDGET"}
                      statusColor={csr[CSRCategory.CONSTANT] <= (income || 0) * 0.5 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}
                      description="Fixed Costs / Obligations / Dependents"
                    />
                    <CSRCard 
                      label="Spending (ใช้จ่าย)" 
                      value={csr[CSRCategory.SPENDING]} 
                      limit={(income || 0) * 0.3} 
                      targetLabel="30%"
                      status={csr[CSRCategory.SPENDING] <= (income || 0) * 0.3 ? "BALANCED" : "CAUTION"}
                      statusColor={csr[CSRCategory.SPENDING] <= (income || 0) * 0.3 ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}
                      description="Food / Transit / Lifestyle / Hobbies"
                    />
                    <CSRCard 
                      label="Reserve (สำรอง)" 
                      value={csr[CSRCategory.RESERVE]} 
                      limit={(income || 0) * 0.2} 
                      targetLabel="20%"
                      status={csr[CSRCategory.RESERVE] >= (income || 0) * 0.2 ? "EXCELLENT" : "INSUFFICIENT"}
                      statusColor={csr[CSRCategory.RESERVE] >= (income || 0) * 0.2 ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}
                      description="Investments / Insurance / Emergency"
                    />
                  </section>

                  {/* 4-Pillar Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pillars.map((p, i) => (
                      <PillarCard key={`pillar-${i}`} pillar={p} />
                    ))}
                  </div>

                  {/* Visualization & Quick Stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <Card className="lg:col-span-4 overflow-hidden border-brand-border" padding="none">
                      <div className="p-6 border-b border-brand-border bg-brand-bg/5 flex items-center justify-between">
                         <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">Resource Allocation</h3>
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      </div>
                      <div className="p-6">
                        <CSRChart />
                      </div>
                    </Card>
                    <div className="lg:col-span-8 flex flex-col gap-8">
                      <Card className="overflow-hidden border-brand-border" padding="none">
                        <div className="p-6 border-b border-brand-border bg-brand-bg/5">
                           <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">Monthly Debt Maintenance</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8">
                          {liabilities.map(l => (
                            <div key={l.id} className="flex justify-between items-center p-4 bg-brand-bg/30 rounded-xl border border-brand-border/30 hover:border-blue-600/30 transition-colors group">
                              <div className="flex items-center gap-4">
                                <div className="w-1.5 h-10 bg-orange-200 rounded-full group-hover:bg-orange-500 transition-colors" />
                                <div>
                                  <p className="text-xs font-black text-brand-text uppercase tracking-wider">{l.name}</p>
                                  <p className="text-[10px] text-brand-muted font-bold">DUE DATE: {l.dueDate}</p>
                                </div>
                              </div>
                              <p className="text-base font-mono font-black text-blue-600">{formatCurrency(l.monthlyPayment)}</p>
                            </div>
                          ))}
                          {liabilities.length === 0 && <p className="text-xs text-brand-muted col-span-full py-8 text-center font-bold uppercase tracking-widest bg-brand-bg/20 rounded-xl">No Debt Obligations Found</p>}
                        </div>
                      </Card>
                      <Card className="overflow-hidden border-brand-border" padding="none">
                        <div className="p-6 border-b border-brand-border bg-brand-bg/5">
                           <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">Emergency Safety Buffer</h3>
                        </div>
                        <div className="flex flex-wrap gap-6 p-8">
                           {accounts.filter(a => a.isEmergencyFund).map(f => (
                            <div key={f.id} className="flex-1 min-w-[240px] p-5 bg-brand-bg/30 rounded-2xl border border-brand-border/30 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                <div className="w-12 h-12 dot-matrix" />
                              </div>
                              <p className="text-[10px] font-black text-emerald-600 mb-2 uppercase tracking-[0.15em]">{f.name}</p>
                              <p className="text-2xl font-black mb-2 font-mono tracking-tighter">{formatCurrency(f.amount)}</p>
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                <p className="text-[9px] text-brand-muted font-black uppercase tracking-widest">{f.purpose || 'Emergency Fund'}</p>
                              </div>
                            </div>
                          ))}
                          {accounts.filter(a => a.isEmergencyFund).length === 0 && <p className="text-xs text-brand-muted w-full py-8 text-center font-bold uppercase tracking-widest bg-brand-bg/20 rounded-xl">No Safety Buffer Configured</p>}
                        </div>
                      </Card>
                    </div>
                  </div>
                </>
              ) : activeTab === 'trends' ? (
                <TrendDashboard /> 
              ) : activeTab === 'distribution' ? (
                <SalaryDistribution />
              ) : (
                <FinancialPlanner 
                   isExternalSyncing={isExternalSyncing}
                   onSyncExternal={syncExternalInvestments}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Planning Header Footer */}
          <footer className="bg-brand-text text-white p-4 md:p-5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-8 mt-auto overflow-hidden">
            <div className="flex gap-4 items-center overflow-x-auto whitespace-nowrap scrollbar-hide pb-2 md:pb-0">
              <span className="text-[10px] font-bold bg-[#344054] px-2 py-1 rounded shrink-0">สรุปด่วน</span>
              <div className="text-xs md:text-sm font-mono flex gap-6 md:gap-8 items-center">
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400">ทรัพย์สินรวม (Wealth)</span>
                  <span className="text-blue-400">{formatCurrency(totalWealth)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400">หนี้คงค้าง (Total Debt)</span>
                  <span className="text-orange-400">{formatCurrency(totalDebt)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400">ความมั่งคั่งสุทธิ (Net Worth)</span>
                  <span className={netWorth >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {formatCurrency(netWorth)}
                  </span>
                </div>
                <div className="flex flex-col border-l border-white/10 pl-4">
                  <span className="text-[9px] text-gray-400">DTI (Monthly Debt Ratio)</span>
                  <span className={dti <= 0.4 ? "text-emerald-400" : "text-red-400"}>{(dti * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <div className="ml-auto flex gap-3 shrink-0">
               <Button size="sm" onClick={exportJSON}>Export Plan</Button>
            </div>
          </footer>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around p-2 bg-white border-t border-brand-border sticky bottom-0 z-50">
          <NavButton 
            mobile
            icon={LayoutDashboard} 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
            label="สรุป"
          />
          <NavButton 
            mobile
            icon={Target} 
            active={activeTab === 'planning'} 
            onClick={() => setActiveTab('planning')}
            label="วางแผน"
          />
          <NavButton 
            mobile
            icon={ArrowRightLeft} 
            active={activeTab === 'distribution'} 
            onClick={() => setActiveTab('distribution')}
            label="รายการโอน"
          />
          <NavButton 
            mobile
            icon={HistoryIcon} 
            active={activeTab === 'trends'} 
            onClick={() => setActiveTab('trends')}
            label="แนวโน้ม"
          />
        </div>
      </main>
    </div>
  );
}

function useFinancialInternal() {
  const financial = useFinancial();
  const { user } = useFirebase();
  const [isExternalSyncing, setIsExternalSyncing] = React.useState(false);

  const syncExternalInvestments = async () => {
    if (!user) return;
    setIsExternalSyncing(true);
    try {
      const extAccounts = await fetchExternalInvestments(user.uid);
      if (extAccounts.length > 0) {
        let uCount = 0;
        let aCount = 0;

        financial.setAccounts(prev => {
          const newAccounts = [...prev];
          uCount = 0;
          aCount = 0;

          extAccounts.forEach(ext => {
            // Find existing by ID or Name
            const existingIndex = newAccounts.findIndex(a => a.id === ext.id || a.name === ext.name);

            if (existingIndex !== -1) {
              const existing = newAccounts[existingIndex];
              const amountDiff = ext.amount - existing.amount;
              
              // Only update if there's a change
              if (amountDiff !== 0) {
                const newTransaction = {
                  id: crypto.randomUUID(),
                  timestamp: Date.now(),
                  type: (amountDiff > 0 ? 'deposit' : 'withdrawal') as 'deposit' | 'withdrawal',
                  amount: Math.abs(amountDiff),
                  note: `Sync from External: ${ext.name}`
                };
                
                newAccounts[existingIndex] = {
                  ...existing,
                  amount: ext.amount,
                  transactions: [newTransaction, ...(existing.transactions || [])]
                };
                uCount++;
              }
            } else {
              newAccounts.push(ext);
              aCount++;
            }
          });
          
          return newAccounts;
        });
        
        let message = `ซิงค์ข้อมูลสำเร็จ!`;
        if (uCount > 0) message += ` อัปเดตยอดเงิน ${uCount} รายการ`;
        if (aCount > 0) message += ` เพิ่มใหม่ ${aCount} รายการ`;
        if (uCount === 0 && aCount === 0) message += ` ข้อมูลปัจจุบันเป็นปัจจุบันแล้ว`;
        
        alert(message);
      } else {
        alert("ไม่พบข้อมูลการลงทุนในระบบอื่น");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูลภายนอก");
    } finally {
      setIsExternalSyncing(false);
    }
  };

  const exportJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      income: financial.income,
      csr_actual: financial.csr,
      pillars: financial.pillars,
      allocations: financial.allocations,
      liabilities: financial.liabilities,
      emergencyFunds: financial.accounts
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial_plan_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return {
    isExternalSyncing,
    syncExternalInvestments,
    exportJSON
  };
}
