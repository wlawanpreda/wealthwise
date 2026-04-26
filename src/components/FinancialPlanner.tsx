import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Shield, CreditCard, Wallet, TrendingUp, PiggyBank, ArrowUpDown, ChevronUp, ChevronDown, AlertTriangle, History, PlusCircle, ArrowUpRight, ArrowDownLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { BudgetAllocation, Liability, FinancialAccount, CSRCategory, IncomeProjection } from '../types';
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
  projections: IncomeProjection[];
  setProjections: React.Dispatch<React.SetStateAction<IncomeProjection[]>>;
  isExternalSyncing?: boolean;
  onSyncExternal?: () => void;
}

type SortKey = 'name' | 'totalAmount' | 'monthlyPayment' | 'dueDate';
type SortOrder = 'asc' | 'desc';

const PURPOSE_SUGGESTIONS = [
  'สำรองฉุกเฉิน 6 เดือน',
  'เที่ยวต่างประเทศ',
  'เงินดาวน์บ้าน/รถ',
  'การศึกษาบุตร',
  'เกษียณอายุ',
  'ลงทุนหุ้น/กองทุน',
  'เก็บออมทั่วไป'
];

export default function FinancialPlanner({
  income, setIncome,
  savingsTarget, setSavingsTarget,
  allocations, setAllocations,
  liabilities, setLiabilities,
  accounts, setAccounts,
  projections, setProjections,
  isExternalSyncing,
  onSyncExternal
}: FinancialPlannerProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('dueDate');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc');
  const [expandedAccount, setExpandedAccount] = React.useState<string | null>(null);

  const sortedLiabilities = React.useMemo(() => {
    return [...liabilities].sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (sortKey === 'name') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      } else if (sortKey === 'dueDate') {
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

  const addTransaction = (accId: string, type: 'deposit' | 'withdrawal') => {
    const amountStr = window.prompt(`ระบุจำนวนเงินที่ต้องการ ${type === 'deposit' ? 'ฝาก' : 'ถอน'}:`);
    if (amountStr === null) return;
    
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
      return;
    }

    const note = window.prompt('ระบุหมายเหตุ (ถ้ามี):') || '';

    setAccounts(prev => prev.map(acc => {
      if (acc.id === accId) {
        const newTransaction = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type,
          amount,
          note
        };
        const newTransactions = [newTransaction, ...(acc.transactions || [])];
        const newAmount = type === 'deposit' ? acc.amount + amount : acc.amount - amount;
        return { ...acc, amount: newAmount, transactions: newTransactions };
      }
      return acc;
    }));
  };

  const addAccount = () => {
    setAccounts(prev => [...prev, { 
      id: crypto.randomUUID(), 
      name: '', 
      amount: 0, 
      purpose: '', 
      isEmergencyFund: false,
      type: 'Savings',
      transactions: []
    }]);
  };

  const addProjection = () => {
    setProjections(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      monthlyAmountChange: 0,
      startDate: new Date().toISOString().slice(0, 7), // Default current month
      type: 'increase'
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
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setIncome(val);
                  }}
                  className={cn(
                    "w-full bg-brand-surface border border-brand-border rounded-xl p-4 text-xl font-bold outline-none transition-all pl-10",
                    income <= 0 ? "border-red-200 bg-red-50/30" : "focus:ring-2 focus:ring-blue-600/20"
                  )}
                  placeholder="0"
                  min="1"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary font-bold">฿</span>
              </div>
              {income <= 0 && <p className="text-[10px] text-red-600 font-bold mt-2 flex items-center gap-1"><AlertTriangle size={10} /> กรุณาระบุรายได้ที่มากกว่า 0 เพื่อคำนวณสัดส่วนอย่างถูกต้อง</p>}
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

        <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border flex items-center justify-between gap-4">
           <div className="text-center flex-1 min-w-0">
             <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1 truncate">ทรัพย์สินรวม (Wealth)</p>
             <p className="text-xl font-black text-brand-text truncate">
               {formatCurrency(accounts.reduce((s, a) => s + a.amount, 0))}
             </p>
           </div>
           <div className="w-px h-10 bg-brand-border shrink-0" />
           <div className="text-center flex-1 min-w-0">
             <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1 truncate">ความมั่งคั่งสุทธิ (Net Worth)</p>
             <p className={cn(
               "text-xl font-black whitespace-nowrap truncate", 
               (accounts.reduce((s, a) => s + a.amount, 0) - liabilities.reduce((s, l) => s + l.totalAmount, 0)) >= 0 ? "text-emerald-600" : "text-red-600"
             )}>
               {formatCurrency(accounts.reduce((s, a) => s + a.amount, 0) - liabilities.reduce((s, l) => s + l.totalAmount, 0))}
             </p>
           </div>
           <div className="w-px h-10 bg-brand-border shrink-0" />
           <div className="text-center flex-1 min-w-0">
             <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1 truncate">อัตราออม</p>
             <p className="text-xl font-black text-blue-600 truncate">
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
                  {allocations.filter(a => a.category === category).length === 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-brand-surface rounded-xl border border-dashed border-brand-border">
                      <p className="w-full text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-1">ตัวอย่างรายการ:</p>
                      {(category === CSRCategory.CONSTANT ? 
                        ['ผ่อนบ้าน/เช่าบ้าน', 'ประกันชีวิต/สุขภาพ', 'ให้พ่อแม่', 'ค่าสมาชิก'] :
                        category === CSRCategory.SPENDING ?
                        ['ค่าอาหาร', 'ค่าน้ำมัน', 'ช้อปปิ้ง', 'ท่องเที่ยว'] :
                        ['SSF/RMF', 'กองทุนรวม', 'เงินออมฉุกเฉิน', 'บำนาญ']
                      ).map(example => (
                        <button
                          key={example}
                          onClick={() => setAllocations(prev => [...prev, { id: crypto.randomUUID(), name: example, amount: 0, category }])}
                          className="text-[10px] bg-white border border-brand-border px-2 py-1 rounded-lg hover:border-brand-text transition-colors text-brand-muted hover:text-brand-text"
                        >
                          + {example}
                        </button>
                      ))}
                    </div>
                  )}

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

        {liabilities.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
            <div className="lg:col-span-5 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liabilities.map(l => ({ name: l.name || 'ไม่ระบุชื่อ', value: l.totalAmount }))}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {liabilities.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#facc15', '#3b82f6', '#8b5cf6', '#ec4899'][index % 6]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:col-span-7 flex flex-col justify-center">
              <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-4">สัดส่วนหนี้สิน (ตามยอดคงเหลือ)</h3>
              <div className="grid grid-cols-2 gap-3">
                {liabilities.sort((a,b) => b.totalAmount - a.totalAmount).slice(0, 4).map((debt, i) => (
                  <div key={debt.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#ef4444', '#f97316', '#facc15', '#3b82f6', '#8b5cf6', '#ec4899'][i % 6] }} />
                    <span className="text-[11px] font-bold text-brand-text truncate w-24">{debt.name || 'ไม่ระบุ'}</span>
                    <span className="text-[11px] font-black text-brand-muted ml-auto">
                      {((debt.totalAmount / (liabilities.reduce((s,l) => s + l.totalAmount, 0) || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-brand-border flex justify-between items-center">
                <p className="text-[10px] font-black text-brand-muted uppercase">หนี้รวมทั้งหมด</p>
                <p className="text-xl font-black text-red-600">{formatCurrency(liabilities.reduce((s,l) => s + l.totalAmount, 0))}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-brand-surface/70 text-brand-muted">
              <tr>
                <th 
                  className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-brand-muted cursor-pointer hover:text-brand-text transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    ชื่อรายการหนี้
                    <SortIcon active={sortKey === 'name'} order={sortOrder} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-brand-muted cursor-pointer hover:text-brand-text transition-colors"
                  onClick={() => toggleSort('totalAmount')}
                >
                  <div className="flex items-center gap-1">
                    ยอดคงเหลือ
                    <SortIcon active={sortKey === 'totalAmount'} order={sortOrder} />
                  </div>
                </th>
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
          <div className="flex items-center gap-2">
            {onSyncExternal && (
              <button 
                onClick={onSyncExternal}
                disabled={isExternalSyncing}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-indigo-200",
                  isExternalSyncing ? "bg-indigo-50 text-indigo-400" : "bg-white text-indigo-600 hover:bg-indigo-50"
                )}
              >
                <RefreshCw size={14} className={cn(isExternalSyncing && "animate-spin")} />
                {isExternalSyncing ? "กำลังซิงค์..." : "ซิงค์จากระบบภายนอก"}
              </button>
            )}
            <button 
              onClick={addAccount} 
              className="flex items-center gap-2 px-4 py-2 bg-brand-text text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
            >
              <Plus size={14} /> เพิ่มบัญชี/ทรัพย์สิน
            </button>
          </div>
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
                       <p className="text-2xl font-black text-brand-text">
                         {(acc.amount || 0).toLocaleString()}
                       </p>
                       <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => addTransaction(acc.id, 'deposit')}
                           className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                           title="Deposit"
                         >
                           <ArrowUpRight size={14} />
                         </button>
                         <button 
                           onClick={() => addTransaction(acc.id, 'withdrawal')}
                           className="p-1 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                           title="Withdraw"
                         >
                           <ArrowDownLeft size={14} />
                         </button>
                       </div>
                     </div>
                   </div>
                   <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => setAccounts(prev => prev.filter(a => a.id !== acc.id))}
                      className="text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={() => setExpandedAccount(expandedAccount === acc.id ? null : acc.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        expandedAccount === acc.id ? "bg-indigo-600 text-white" : "bg-brand-surface text-brand-muted hover:text-indigo-600"
                      )}
                    >
                      <History size={16} />
                    </button>
                   </div>
                </div>
                
                {expandedAccount === acc.id && (
                  <div className="flex flex-col gap-3 py-4 border-t border-brand-border mt-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">ประวัติรายการทรัพย์สิน</p>
                      <button 
                        onClick={() => addTransaction(acc.id, 'deposit')}
                        className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:underline"
                      >
                        <PlusCircle size={10} /> เพิ่มรายการใหม่
                      </button>
                    </div>
                    
                    <div className="max-h-[200px] overflow-y-auto flex flex-col gap-2 pr-2 custom-scrollbar">
                      {(acc.transactions || []).length === 0 ? (
                        <p className="text-[10px] text-brand-muted text-center py-4">ยังไม่มีประวัติรายการ</p>
                      ) : (
                        acc.transactions.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-brand-surface/50 border border-brand-border/30">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "p-1.5 rounded-lg",
                                t.type === 'deposit' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                              )}>
                                {t.type === 'deposit' ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-brand-text truncate w-24">{t.note || (t.type === 'deposit' ? 'ฝากเงิน' : 'ถอนเงิน')}</p>
                                <p className="text-[8px] text-brand-muted">{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                            <p className={cn(
                              "text-xs font-black",
                              t.type === 'deposit' ? "text-emerald-600" : "text-orange-600"
                            )}>
                              {t.type === 'deposit' ? '+' : '-'}{t.amount.toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                 <div className="flex items-center justify-between">
                   <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">วัตถุประสงค์ / หมายเหตุ</p>
                   <span className="text-[9px] font-bold text-brand-muted">{acc.purpose.length}/50</span>
                 </div>
                 
                 <div className="flex flex-wrap gap-1.5 mb-2">
                    {PURPOSE_SUGGESTIONS.map(sugg => (
                      <button
                        key={sugg}
                        onClick={() => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, purpose: sugg } : a))}
                        className="text-[9px] bg-brand-surface border border-brand-border px-2 py-0.5 rounded hover:border-indigo-300 hover:text-indigo-600 transition-all text-brand-muted"
                      >
                        {sugg}
                      </button>
                    ))}
                 </div>

                 <input 
                    type="text"
                    value={acc.purpose}
                    onChange={(e) => {
                      if (e.target.value.length <= 50) {
                        setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, purpose: e.target.value } : a));
                      }
                    }}
                    className="text-xs text-brand-text bg-brand-surface p-3 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500/20 w-full"
                    placeholder="ระบุวัตถุประสงค์ (สูงสุด 50 ตัวอักษร)"
                    maxLength={50}
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

      {/* Income Projections Forecast */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="text-emerald-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">คาดการณ์รายได้ในอนาคต (Income Projection)</h2>
              <p className="text-xs text-brand-muted">ระบุการเปลี่ยนแปลงรายได้ที่คาดว่าจะเกิดขึ้น (เช่น เลื่อนตำแหน่ง, งานเสริม)</p>
            </div>
          </div>
          <button 
            onClick={addProjection} 
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Plus size={14} /> เพิ่มการคาดการณ์
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {projections.map(proj => (
              <div key={proj.id} className="relative group bg-brand-surface p-5 rounded-2xl border border-brand-border hover:border-emerald-200 transition-all">
                <button 
                  onClick={() => setProjections(prev => prev.filter(p => p.id !== proj.id))}
                  className="absolute top-4 right-4 text-brand-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1 block">ชื่อรายการ</label>
                    <input 
                      type="text" 
                      value={proj.name}
                      onChange={(e) => setProjections(prev => prev.map(p => p.id === proj.id ? { ...p, name: e.target.value } : p))}
                      className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      placeholder="เช่น เลื่อนตำแหน่ง"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1 block">มูลค่าการเปลี่ยนเเปลง</label>
                      <input 
                        type="number" 
                        value={proj.monthlyAmountChange || ''}
                        onChange={(e) => setProjections(prev => prev.map(p => p.id === proj.id ? { ...p, monthlyAmountChange: Number(e.target.value) } : p))}
                        className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1 block">ประเภท</label>
                      <select 
                        value={proj.type}
                        onChange={(e) => setProjections(prev => prev.map(p => p.id === proj.id ? { ...p, type: e.target.value as any } : p))}
                        className="w-full bg-white border border-brand-border rounded-xl px-2 py-2 text-[10px] font-bold outline-none"
                      >
                        <option value="increase">รายได้เพิ่มขึ้น (+)</option>
                        <option value="decrease">รายข่ายเพิ่ม/รายได้ลด (-)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1 block">เริ่มตั้งแต่เดือน</label>
                    <input 
                      type="month" 
                      value={proj.startDate}
                      onChange={(e) => setProjections(prev => prev.map(p => p.id === proj.id ? { ...p, startDate: e.target.value } : p))}
                      className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            {projections.length === 0 && (
              <div className="col-span-full py-12 text-center bg-brand-surface/30 rounded-2xl border-2 border-dashed border-brand-border">
                <TrendingUp className="w-8 h-8 text-brand-muted mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">ยังไม่มีการคาดการณ์รายได้</p>
                <button 
                  onClick={addProjection}
                  className="mt-2 text-[10px] font-black text-emerald-600 hover:underline px-4 py-2"
                >
                  + เริ่มต้นคาดการณ์ก้าวสำคัญของรายได้
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <ArrowUpDown size={10} className="text-brand-muted opacity-50" />;
  return order === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
}
