import React from 'react';
import { Plus, Trash2, Shield, CreditCard, Wallet, TrendingUp, PiggyBank, ArrowUpDown, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { BudgetAllocation, Liability, FinancialAccount, CSRCategory } from '../types';
import { formatCurrency, cn } from '../lib/utils';

interface FinancialPlannerProps {
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
}

type SortKey = 'monthlyPayment' | 'dueDate';
type SortOrder = 'asc' | 'desc';

export default function FinancialPlanner({
  income, setIncome,
  savingsTarget, setSavingsTarget,
  allocations, setAllocations,
  liabilities, setLiabilities,
  accounts, setAccounts
}: FinancialPlannerProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('dueDate');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc');

  const sortedLiabilities = React.useMemo(() => {
    return [...liabilities].sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      // Handle empty values for sorting
      if (sortKey === 'dueDate') {
        valA = parseInt(valA) || 99;
        valB = parseInt(valB) || 99;
      }
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [liabilities, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const isDueSoon = (dayStr: string | undefined) => {
    if (!dayStr) return false;
    const day = parseInt(dayStr);
    if (isNaN(day)) return false;

    const today = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    
    // Check if it's due in the next 3 days
    let diff = day - today;
    if (diff < 0) {
      // It might be due early next month
      diff += daysInMonth;
    }
    
    return diff >= 0 && diff <= 3;
  };

  const addAllocation = (category: CSRCategory) => {
    setAllocations(prev => [...prev, { id: crypto.randomUUID(), name: '', amount: 0, category }]);
  };

  const addLiability = () => {
    setLiabilities(prev => [...prev, { id: crypto.randomUUID(), name: '', totalAmount: 0, monthlyPayment: 0, dueDate: '' }]);
  };

  const addAccount = () => {
    setAccounts(prev => [...prev, { 
      id: crypto.randomUUID(), 
      name: '', 
      amount: 0, 
      purpose: '', 
      isEmergencyFund: false,
      type: 'Savings'
    }]);
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto w-full pb-20">
      
      {/* Configuration Section (Income & Goal) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-3xl border border-brand-border shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="text-blue-600 w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold">รายได้และเป้าหมาย</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2 block">รายได้สุทธิ / เดือน</label>
              <div className="relative">
                <input 
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value))}
                  className={cn(
                    "w-full bg-brand-surface border border-brand-border rounded-xl p-4 text-xl font-bold outline-none transition-all pl-10",
                    income <= 0 ? "border-orange-200 bg-orange-50/30" : "focus:ring-2 focus:ring-blue-600/20"
                  )}
                  placeholder="0"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary font-bold">฿</span>
              </div>
              {income <= 0 && <p className="text-[10px] text-orange-600 font-bold mt-2">กรุณาระบุรายได้เพื่อคำนวณ CSR</p>}
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2 block">เป้าหมายเงินออม (ทั้งหมด)</label>
              <div className="relative">
                <input 
                  type="number"
                  value={savingsTarget}
                  onChange={(e) => setSavingsTarget(Number(e.target.value))}
                  className="w-full bg-brand-surface border border-brand-border rounded-xl p-4 text-xl font-bold focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all pl-10 text-emerald-700"
                  placeholder="2,880,000"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">฿</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-brand-surface p-5 rounded-2xl border border-brand-border flex items-center gap-6">
           <div className="text-center flex-1">
             <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">ความมั่งคั่งปัจจุบัน</p>
             <p className="text-2xl font-black text-brand-text">
               {formatCurrency(accounts.reduce((s,a) => s+a.amount, 0) + allocations.filter(a => a.category === CSRCategory.RESERVE).reduce((s,a) => s+a.amount, 0))}
             </p>
           </div>
           <div className="w-px h-10 bg-brand-border" />
           <div className="text-center flex-1">
             <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">อัตราการออม</p>
             <p className="text-2xl font-black text-blue-600">
               {((allocations.filter(a => a.category === CSRCategory.RESERVE).reduce((s,a) => s+a.amount, 0) / (income || 1)) * 100).toFixed(1)}%
             </p>
           </div>
        </div>
      </section>

      {/* Budget Allocations */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-bg rounded-lg">
              <Wallet className="text-brand-text w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">การจัดสรรงบประมาณ (CSR)</h2>
              <p className="text-xs text-brand-muted">จัดสรรงบ 50:30:20 เพื่อสุขภาพการเงินที่ดี</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[CSRCategory.CONSTANT, CSRCategory.SPENDING, CSRCategory.RESERVE].map(category => {
            const total = allocations.filter(a => a.category === category).reduce((s,a) => s+a.amount, 0);
            const target = category === CSRCategory.CONSTANT ? 0.5 : category === CSRCategory.SPENDING ? 0.3 : 0.2;
            const isOverSet = category === CSRCategory.RESERVE ? total < (income * target) : total > (income * target);

            return (
              <div 
                key={category} 
                className="bg-white p-5 rounded-3xl border border-brand-border shadow-sm flex flex-col gap-4 hover:border-brand-text/10 transition-colors group/card relative"
              >
                <div className="flex items-center justify-between border-b border-brand-border/50 pb-4">
                  <div className="flex flex-col gap-1">
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                      category === CSRCategory.CONSTANT ? "bg-slate-100 text-slate-700" :
                      category === CSRCategory.SPENDING ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                    )}>
                      {category}
                    </span>
                    <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">เป้าหมาย {target*100}%</span>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-black",
                      isOverSet && category !== CSRCategory.RESERVE ? "text-red-600" : "text-brand-text"
                    )}>
                      {formatCurrency(total)}
                    </p>
                    <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">{( (total/(income || 1)) * 100).toFixed(1)}%</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 min-h-[50px]">
                  {allocations.filter(a => a.category === category).map(alloc => (
                    <div key={alloc.id} className="flex flex-col gap-1 group">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="รายการ..."
                          value={alloc.name}
                          onChange={(e) => setAllocations(prev => prev.map(a => a.id === alloc.id ? { ...a, name: e.target.value } : a))}
                          className={cn(
                            "flex-1 text-xs p-2.5 bg-brand-surface border border-transparent rounded-xl focus:border-brand-border outline-none transition-all",
                            !alloc.name && "border-red-100 placeholder-red-300"
                          )}
                        />
                        <div className="relative w-24">
                          <input 
                            type="number" 
                            placeholder="บาท"
                            value={alloc.amount || ''}
                            onChange={(e) => setAllocations(prev => prev.map(a => a.id === alloc.id ? { ...a, amount: Number(e.target.value) } : a))}
                            className={cn(
                              "w-full text-xs p-2.5 bg-brand-surface border border-transparent rounded-xl focus:border-brand-border outline-none transition-all font-bold pr-6",
                              alloc.amount < 0 && "text-red-600 bg-red-50"
                            )}
                          />
                          <button 
                            onClick={() => setAllocations(prev => prev.filter(a => a.id !== alloc.id))}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {alloc.amount < 0 && <p className="text-[8px] text-red-500 font-bold ml-2">ห้ามระบุน้อยกว่า 0</p>}
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => addAllocation(category)}
                    className="flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-brand-border rounded-xl text-[10px] font-bold text-brand-muted hover:border-brand-text/20 hover:text-brand-text transition-all group-hover/card:bg-brand-surface/50"
                  >
                    <Plus size={10} /> เพิ่มรายการ {category}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Liabilities */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <CreditCard className="text-red-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">หนี้สินและภาระผ่อน</h2>
              <p className="text-xs text-brand-muted">เฝ้าระวังวันถึงกำหนดชำระและยอดผ่อนสะสม</p>
            </div>
          </div>
          <button 
            onClick={addLiability} 
            className="flex items-center gap-2 px-4 py-2 bg-brand-surface text-brand-text border border-brand-border rounded-xl text-xs font-bold hover:bg-white transition-all shadow-sm"
          >
            <Plus size={14} /> เพิ่มรายการหนี้
          </button>
        </div>
        
        <div className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-brand-surface/70 text-brand-muted">
              <tr>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-brand-muted">ชื่อรายการหนี้</th>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-brand-muted">ยอดคงเหลือ</th>
                <th 
                  className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-brand-muted cursor-pointer hover:text-brand-text transition-colors"
                  onClick={() => toggleSort('monthlyPayment')}
                >
                  <div className="flex items-center gap-1">
                    ผ่อนต่อเดือน
                    <SortIcon active={sortKey === 'monthlyPayment'} order={sortOrder} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-brand-muted cursor-pointer hover:text-brand-text transition-colors"
                  onClick={() => toggleSort('dueDate')}
                >
                  <div className="flex items-center gap-1">
                    วันครบกำหนด
                    <SortIcon active={sortKey === 'dueDate'} order={sortOrder} />
                  </div>
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {sortedLiabilities.map(debt => (
                <tr key={debt.id} className={cn(
                  "group transition-colors",
                  isDueSoon(debt.dueDate) ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-brand-surface/30"
                )}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       {isDueSoon(debt.dueDate) && <AlertTriangle size={14} className="text-red-500 animate-pulse shrink-0" />}
                       <input 
                        type="text"
                        value={debt.name}
                        onChange={(e) => setLiabilities(prev => prev.map(l => l.id === debt.id ? { ...l, name: e.target.value } : l))}
                        className="w-full text-sm font-bold bg-transparent outline-none truncate focus:text-blue-600"
                        placeholder="ระบุชื่อหนี้..."
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      value={debt.totalAmount || ''}
                      onChange={(e) => setLiabilities(prev => prev.map(l => l.id === debt.id ? { ...l, totalAmount: Number(e.target.value) } : l))}
                      className="w-full text-sm font-mono bg-transparent outline-none focus:text-brand-text text-brand-secondary"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      value={debt.monthlyPayment || ''}
                      onChange={(e) => setLiabilities(prev => prev.map(l => l.id === debt.id ? { ...l, monthlyPayment: Number(e.target.value) } : l))}
                      className="w-full text-sm font-black text-red-600 bg-transparent outline-none"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-brand-muted">ทุกวันที่</span>
                       <input 
                         type="text"
                         value={debt.dueDate}
                         onChange={(e) => setLiabilities(prev => prev.map(l => l.id === debt.id ? { ...l, dueDate: e.target.value } : l))}
                         className="w-10 text-sm text-center font-bold bg-brand-surface rounded-lg p-1 outline-none focus:ring-1 focus:ring-brand-border"
                         placeholder="01"
                         maxLength={2}
                       />
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setLiabilities(prev => prev.filter(l => l.id !== debt.id))}
                      className="text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {liabilities.length === 0 && (
            <div className="p-16 text-center text-brand-muted">
              <p className="text-xs font-bold uppercase tracking-widest mb-1">ยังไม่มีรายการหนี้สิน</p>
              <p className="text-[10px]">กดปุ่ม + ด้านบนเพื่อเริ่มติดตามภาระหนี้</p>
            </div>
          )}
        </div>
      </section>

      {/* Accounts & Investments */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <PiggyBank className="text-indigo-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">บัญชีและการลงทุน (Accounts)</h2>
              <p className="text-xs text-brand-muted">จัดการบัญชีเงินฝาก การลงทุน และทรัพย์สินทอดยาว</p>
            </div>
          </div>
          <button 
            onClick={addAccount} 
            className="flex items-center gap-2 px-4 py-2 bg-brand-text text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
          >
            <Plus size={14} /> เพิ่มบัญชี/ทรัพย์สิน
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm flex flex-col gap-5 group hover:border-indigo-200 transition-colors">
               <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <select 
                        value={acc.type}
                        onChange={(e) => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, type: e.target.value as any } : a))}
                        className="text-[10px] font-black bg-brand-surface px-2 py-1 rounded border-none outline-none text-brand-muted uppercase tracking-widest"
                      >
                        <option value="Savings">Savings</option>
                        <option value="Fixed">Fixed</option>
                        <option value="Investment">Investment</option>
                        <option value="Other">Other</option>
                      </select>
                      <button 
                        onClick={() => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, isEmergencyFund: !a.isEmergencyFund } : a))}
                        className={cn(
                          "text-[9px] font-bold px-2 py-1 rounded-full transition-all border",
                          acc.isEmergencyFund 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-brand-surface text-brand-muted border-brand-border"
                        )}
                      >
                        {acc.isEmergencyFund ? 'Emergency Fund' : 'Normal Account'}
                      </button>
                    </div>
                    <input 
                      type="text"
                      value={acc.name}
                      onChange={(e) => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, name: e.target.value } : a))}
                      className="text-sm font-bold text-brand-text outline-none w-full mb-1 focus:text-indigo-600"
                      placeholder="ชื่อธนาคาร / บัญชี"
                    />
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-sm font-black text-brand-text">฿</span>
                      <input 
                        type="number"
                        value={acc.amount || ''}
                        onChange={(e) => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, amount: Number(e.target.value) } : a))}
                        className="text-2xl font-black bg-transparent outline-none w-full text-brand-text"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => setAccounts(prev => prev.filter(a => a.id !== acc.id))}
                    className="text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1"
                  >
                    <Trash2 size={16} />
                  </button>
               </div>
               <div className="flex flex-col gap-2">
                 <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">วัตถุประสงค์ / หมายเหตุ</p>
                 <textarea 
                    value={acc.purpose}
                    onChange={(e) => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, purpose: e.target.value } : a))}
                    className="text-xs text-brand-text bg-brand-surface p-3 rounded-xl resize-none outline-none focus:ring-1 focus:ring-indigo-500/20 w-full min-h-[60px]"
                    placeholder="เช่น เพื่อสำรองจ่ายกรณีตกงาน 6 เดือน..."
                 />
               </div>
            </div>
          ))}
          {accounts.length === 0 && (
             <div className="col-span-full bg-brand-surface/50 border-2 border-dashed border-brand-border p-12 rounded-3xl text-center">
                <PiggyBank className="w-10 h-10 text-brand-muted mx-auto mb-4 opacity-50" />
                <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">ยังไม่มีรายการบัญชี</p>
             </div>
          )}
        </div>
      </section>

    </div>
  );
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <ArrowUpDown size={10} className="text-brand-muted opacity-50" />;
  return order === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
}
