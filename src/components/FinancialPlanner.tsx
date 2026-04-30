import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  Plus, 
  Trash2, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  PiggyBank, 
  AlertTriangle, 
  History, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  Lock,
  Circle,
  Zap,
  Calendar
} from 'lucide-react';
import { CSRCategory } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

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


// Helper component for editable amount with history
function AccountAmountInput({ 
  initialAmount, 
  onAmountChange 
}: { 
  initialAmount: number, 
  onAmountChange: (newAmount: number) => void 
}) {
  const [val, setVal] = React.useState(initialAmount.toString());
  
  React.useEffect(() => {
    setVal(initialAmount.toString());
  }, [initialAmount]);

  const handleBlur = () => {
    const num = Number(val);
    if (!isNaN(num) && num !== initialAmount) {
      onAmountChange(num);
    } else {
      setVal(initialAmount.toString());
    }
  };

  return (
    <input 
      type="number"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      className="text-2xl font-black text-brand-text bg-transparent border-none p-0 focus:ring-0 w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

export default function FinancialPlanner({ 
  isExternalSyncing, 
  onSyncExternal 
}: { 
  isExternalSyncing?: boolean; 
  onSyncExternal?: () => void;
}) {
  const {
    income, setIncome,
    savingsTarget, setSavingsTarget,
    allocations, setAllocations,
    liabilities, setLiabilities,
    accounts, setAccounts,
    projections, setProjections,
    totalWealth, totalDebt, netWorth, savingsRate
  } = useFinancial();

  const [sortKey, setSortKey] = React.useState<SortKey>('dueDate');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc');
  const [expandedAccount, setExpandedAccount] = React.useState<string | null>(null);
  const [repaymentStrategy, setRepaymentStrategy] = React.useState<'snowball' | 'avalanche'>('snowball');
  const [extraPayment, setExtraPayment] = React.useState<number>(0);

  const debtTimeline = React.useMemo(() => {
    if (liabilities.length === 0) return null;

    // Sort based on strategy
    const sorted = [...liabilities].sort((a, b) => {
      if (repaymentStrategy === 'snowball') {
        return a.totalAmount - b.totalAmount;
      } else {
        return (b.interestRate || 0) - (a.interestRate || 0);
      }
    });

    const totalMinimumPayment = liabilities.reduce((s, l) => s + l.monthlyPayment, 0);
    const totalMonthlyBudget = totalMinimumPayment + extraPayment;

    let currentLiabilities = sorted.map(l => ({ ...l }));
    let months = 0;
    const history: any[] = [];
    
    // Initial state
    const initialState: any = { month: 0, totalRemaining: totalDebt };
    currentLiabilities.forEach(l => initialState[l.id] = l.totalAmount);
    history.push(initialState);

    // Simple simulation
    while (currentLiabilities.some(l => l.totalAmount > 0) && months < 360) { // cap at 30 years
      months++;
      let remainingBudgetForThisMonth = totalMonthlyBudget;
      
      let totalRemaining = 0;
      
      // Target the first debt in the sorted list that still has a balance
      const targetDebtIndex = currentLiabilities.findIndex(l => l.totalAmount > 0);
      
      currentLiabilities.forEach((l) => {
        if (l.totalAmount <= 0) return;
        
        // 1. Calculate and add monthly interest
        const monthlyRate = (l.interestRate || 0) / 100 / 12;
        const interestCharge = l.totalAmount * monthlyRate;
        l.totalAmount += interestCharge;

        // 2. Apply minimum payment
        const minPay = Math.min(l.totalAmount, l.monthlyPayment);
        l.totalAmount -= minPay;
        remainingBudgetForThisMonth -= minPay;
      });
      
      // 3. Apply the remaining budget (extra + any freed up min payments) to the target debt
      if (targetDebtIndex !== -1 && remainingBudgetForThisMonth > 0) {
        const target = currentLiabilities[targetDebtIndex];
        const extraToApply = Math.min(target.totalAmount, remainingBudgetForThisMonth);
        target.totalAmount -= extraToApply;
      }

      const dataPoint: any = { month: months };
      currentLiabilities.forEach(l => {
        dataPoint[l.id] = Math.max(0, l.totalAmount);
        totalRemaining += dataPoint[l.id];
      });
      dataPoint.totalRemaining = totalRemaining;
      history.push(dataPoint);
    }

    return {
      months,
      years: (months / 12).toFixed(1),
      history,
      steps: sorted.map(l => l.name)
    };
  }, [liabilities, repaymentStrategy, extraPayment, totalDebt]);

  const sortedLiabilities = React.useMemo(() => {
    return [...liabilities].sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (sortKey === 'name') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
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
    
    let diff = day - today;
    if (diff < 0) diff += daysInMonth;
    
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
      startDate: new Date().toISOString().slice(0, 7),
      type: 'increase'
    }]);
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto w-full pb-20">
      
      {/* Configuration Section (Income & Goal) */}
      <Card padding="lg">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="text-blue-600 w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">รายได้และเป้าหมาย</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="รายได้สุทธิ / เดือน"
                type="number"
                value={income ?? ''}
                onChange={(e) => setIncome(Number(e.target.value))}
                leftIcon={<span className="font-bold">฿</span>}
                error={income <= 0 ? "กรุณาระบุรายได้ที่มากกว่า 0" : undefined}
                className="text-base md:text-xl font-black"
              />
              <Input 
                label="เป้าหมายเงินออม (ทั้งหมด)"
                type="number"
                value={savingsTarget ?? ''}
                onChange={(e) => setSavingsTarget(Number(e.target.value))}
                leftIcon={<span className="font-bold text-emerald-600">฿</span>}
                className="text-base md:text-xl font-black text-emerald-700"
              />
            </div>
          </div>

          <div className="bg-brand-surface p-4 md:p-6 rounded-3xl border border-brand-border flex flex-row sm:flex-row items-center justify-between gap-2 md:gap-4 overflow-hidden">
             <div className="text-center flex-1 min-w-0">
               <p className="text-[8px] md:text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1 truncate">ทรัพย์สินรวม</p>
               <p className="text-sm md:text-xl font-black text-brand-text truncate">
                 {formatCurrency(totalWealth)}
               </p>
             </div>
             <div className="w-px h-8 md:h-10 bg-brand-border shrink-0" />
             <div className="text-center flex-1 min-w-0">
               <p className="text-[8px] md:text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1 truncate">มั่งคั่งสุทธิ</p>
               <p className={cn(
                 "text-sm md:text-xl font-black truncate", 
                 netWorth >= 0 ? "text-emerald-600" : "text-red-600"
               )}>
                 {formatCurrency(netWorth)}
               </p>
             </div>
             <div className="w-px h-8 md:h-10 bg-brand-border shrink-0" />
             <div className="text-center flex-1 min-w-0">
               <p className="text-[8px] md:text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1 truncate">อัตราออม</p>
               <p className="text-sm md:text-xl font-black text-blue-600 truncate">
                 {savingsRate.toFixed(1)}%
               </p>
             </div>
          </div>
        </div>
      </Card>

      {/* Budget Allocations */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-brand-bg rounded-lg">
            <Wallet className="text-brand-text w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">การจัดสรรงบประมาณ (CSR)</h2>
            <p className="text-xs text-brand-muted">จัดสรรงบ 50:30:20 เพื่อสุขภาพการเงินที่ดี</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[CSRCategory.CONSTANT, CSRCategory.SPENDING, CSRCategory.RESERVE].map(category => {
            const total = allocations.filter(a => a.category === category).reduce((s,a) => s+a.amount, 0);
            const target = category === CSRCategory.CONSTANT ? 0.5 : category === CSRCategory.SPENDING ? 0.3 : 0.2;
            const isOverSet = category === CSRCategory.RESERVE ? total < (income * target) : total > (income * target);

            return (
              <Card 
                key={category} 
                variant="white"
                className="flex flex-col gap-4 hover:border-brand-text/10 group/card relative"
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
                    <div className="flex flex-wrap gap-2 mb-2 p-3 bg-brand-surface rounded-xl border border-dashed border-brand-border">
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
                        <Input 
                          containerClassName="flex-1"
                          placeholder="รายการ..."
                          value={alloc.name ?? ''}
                          onChange={(e) => setAllocations(prev => prev.map(a => a.id === alloc.id ? { ...a, name: e.target.value } : a))}
                        />
                        <div className="relative w-28 group">
                          <Input 
                            type="number"
                            placeholder="บาท"
                            value={alloc.amount ?? ''}
                            onChange={(e) => setAllocations(prev => prev.map(a => a.id === alloc.id ? { ...a, amount: Number(e.target.value) } : a))}
                            className="font-bold pr-8"
                          />
                          <button 
                            onClick={() => setAllocations(prev => prev.filter(a => a.id !== alloc.id))}
                            className="absolute -right-1 top-1/2 -translate-y-1/2 text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full border-2 border-dashed border-brand-border"
                    onClick={() => addAllocation(category)}
                  >
                    <Plus size={12} className="mr-2" /> เพิ่มรายการ {category}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Liabilities */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <CreditCard className="text-red-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">หนี้สินและภาระผ่อน</h2>
              <p className="text-xs text-brand-muted">เฝ้าระวังวันถึงกำหนดชำระและยอดผ่อนสะสม</p>
            </div>
          </div>
          <Button variant="surface" size="sm" onClick={addLiability} className="w-full md:w-auto">
            <Plus size={14} className="mr-2" /> เพิ่มรายการหนี้
          </Button>
        </div>

        {liabilities.length > 0 && (
          <Card padding="md" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liabilities.map(l => ({ name: l.name || 'ไม่ระบุชื่อ', value: l.totalAmount }))}
                    innerRadius={50}
                    outerRadius={70}
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
            <div className="lg:col-span-8 flex flex-col justify-center">
              <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-4">สัดส่วนหนี้สินรวม</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {liabilities.sort((a,b) => b.totalAmount - a.totalAmount).slice(0, 4).map((debt, i) => (
                  <div key={debt.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#ef4444', '#f97316', '#facc15', '#3b82f6', '#8b5cf6', '#ec4899'][i % 6] }} />
                       <span className="text-[11px] font-bold text-brand-text truncate">{debt.name || 'ไม่ระบุ'}</span>
                    </div>
                    <p className="text-xs font-black pl-3.5">{formatCurrency(debt.totalAmount)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-brand-border flex justify-between items-center px-2">
                <p className="text-[10px] font-black text-brand-muted uppercase">หนี้รวมทั้งหมด</p>
                <p className="text-xl font-black text-red-600">{formatCurrency(totalDebt)}</p>
              </div>
            </div>
          </Card>
        )}
        
        <Card padding="none" className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-brand-surface/70 text-brand-muted">
              <tr>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest cursor-pointer" onClick={() => toggleSort('name')}>
                  ชื่อรายการ <SortIcon active={sortKey === 'name'} order={sortOrder} />
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest cursor-pointer" onClick={() => toggleSort('totalAmount')}>
                  ยอดคงเหลือ <SortIcon active={sortKey === 'totalAmount'} order={sortOrder} />
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest cursor-pointer">
                  ดอกเบี้ย (%)
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest cursor-pointer" onClick={() => toggleSort('monthlyPayment')}>
                  ผ่อน/เดือน <SortIcon active={sortKey === 'monthlyPayment'} order={sortOrder} />
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest cursor-pointer" onClick={() => toggleSort('dueDate')}>
                  วันครบกำหนด <SortIcon active={sortKey === 'dueDate'} order={sortOrder} />
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {sortedLiabilities.map(debt => (
                <tr key={debt.id} className={cn("group hover:bg-brand-surface/30", isDueSoon(debt.dueDate) && "bg-red-50/50 hover:bg-red-50")}>
                  <td className="px-6 py-4">
                    <Input 
                      variant="ghost"
                      value={debt.name ?? ''}
                      onChange={(e) => setLiabilities(prev => prev.map(l => l.id === debt.id ? { ...l, name: e.target.value } : l))}
                      placeholder="ระบุชื่อหนี้..."
                      className="font-bold bg-transparent"
                      leftIcon={isDueSoon(debt.dueDate) ? <AlertTriangle size={14} className="text-red-500" /> : undefined}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Input 
                      type="number"
                      value={debt.totalAmount ?? ''}
                      onChange={(e) => setLiabilities(prev => prev.map(l => l.id === debt.id ? { ...l, totalAmount: Number(e.target.value) } : l))}
                      className="text-brand-secondary bg-transparent"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Input 
                      type="number"
                      value={debt.interestRate ?? ''}
                      onChange={(e) => setLiabilities(prev => prev.map(l => l.id === debt.id ? { ...l, interestRate: Number(e.target.value) } : l))}
                      className="text-brand-text bg-transparent"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Input 
                      type="number"
                      value={debt.monthlyPayment ?? ''}
                      onChange={(e) => setLiabilities(prev => prev.map(l => l.id === debt.id ? { ...l, monthlyPayment: Number(e.target.value) } : l))}
                      className="text-red-600 font-black bg-transparent"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-brand-muted">วันที่</span>
                       <Input 
                         value={debt.dueDate ?? ''}
                         onChange={(e) => setLiabilities(prev => prev.map(l => l.id === debt.id ? { ...l, dueDate: e.target.value } : l))}
                         className="w-12 text-center text-xs p-1 h-8"
                         maxLength={2}
                       />
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setLiabilities(prev => prev.filter(l => l.id !== debt.id))}
                      className="text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-500 p-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {liabilities.length === 0 && (
            <div className="p-12 text-center text-brand-muted">
              <p className="text-xs font-bold uppercase">ยังไม่มีรายการหนี้สิน</p>
            </div>
          )}
        </Card>

        {liabilities.length > 0 && debtTimeline && (
          <Card padding="lg" className="border-2 border-brand-text/5 bg-brand-surface/20">
            <div className="flex flex-col xl:flex-row gap-8">
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                    <Zap size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-brand-text uppercase tracking-widest">แผนปลดหนี้อัจฉริยะ</h3>
                    <p className="text-[10px] font-bold text-brand-muted uppercase">เลือกกลยุทธ์ที่เหมาะกับคุณ</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setRepaymentStrategy('snowball')}
                    className={cn(
                      "flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all text-left",
                      repaymentStrategy === 'snowball' 
                        ? "bg-white border-blue-600 shadow-md" 
                        : "bg-white/50 border-brand-border grayscale opacity-60 hover:opacity-100 hover:grayscale-0"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest">Snowball</span>
                      {repaymentStrategy === 'snowball' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                    </div>
                    <p className="text-[9px] font-bold text-brand-muted leading-tight">
                      เน้นปิดยอดที่น้อยที่สุดก่อน เพื่อสร้างกำลังใจ (Quick Wins)
                    </p>
                  </button>

                  <button 
                    onClick={() => setRepaymentStrategy('avalanche')}
                    className={cn(
                      "flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all text-left",
                      repaymentStrategy === 'avalanche' 
                        ? "bg-white border-blue-600 shadow-md" 
                        : "bg-white/50 border-brand-border grayscale opacity-60 hover:opacity-100 hover:grayscale-0"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest">Avalanche</span>
                      {repaymentStrategy === 'avalanche' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                    </div>
                    <p className="text-[9px] font-bold text-brand-muted leading-tight">
                      เน้นปิดยอดที่มีดอกเบี้ยสูงที่สุดก่อน เพื่อลดต้นทุนดอกเบี้ยรวม
                    </p>
                  </button>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand-border">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">เงินก้อนพิเศษต่อเดือน (Extra)</p>
                    <span className="text-[10px] font-bold text-blue-600">เร่งการปลดหนี้</span>
                  </div>
                  <Input 
                    type="number"
                    value={extraPayment ?? ''}
                    onChange={(e) => setExtraPayment(Number(e.target.value))}
                    leftIcon={<span className="font-bold text-blue-600">+</span>}
                    placeholder="ระบุจำนวนเงินที่จ่ายเพิ่มได้..."
                    className="text-lg font-black"
                  />
                  <p className="mt-2 text-[9px] font-bold text-brand-muted leading-tight">
                    *ยิ่งอัดฉีดเงินพิเศษมากเท่าไหร่ คุณจะยิ่งปลดหนี้ได้เร็วขึ้นแบบทวีคูณ
                  </p>
                </div>
              </div>

              <div className="flex-1 bg-white p-8 rounded-[40px] shadow-xl shadow-brand-text/5 border border-brand-border flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-50/50 rounded-full -ml-12 -mb-12" />
                
                <div className="p-4 bg-blue-50 rounded-3xl mb-2">
                  <Calendar size={32} className="text-blue-600" />
                </div>
                
                <div className="flex flex-col">
                   <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mb-1">ระยะเวลาปลดหนี้ทั้งหมด</p>
                   <h4 className="text-6xl font-black text-brand-text tracking-tighter">
                     {debtTimeline.years} <span className="text-xl font-bold text-brand-muted">ปี</span>
                   </h4>
                   <p className="text-xs font-bold text-emerald-600 mt-2">
                     ประมาณ {debtTimeline.months} เดือน นับจากนี้
                   </p>
                </div>

                <div className="w-full h-px bg-brand-border my-2" />

                <div className="flex flex-col items-center gap-2">
                   <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">ลำดับการปลดหนี้ของคุณ</p>
                   <div className="flex flex-wrap justify-center gap-2">
                     {debtTimeline.steps.slice(0, 3).map((name, i) => (
                       <span key={i} className="px-3 py-1 bg-brand-surface border border-brand-border rounded-full text-[10px] font-black text-brand-text flex items-center gap-2">
                         <span className="w-4 h-4 flex items-center justify-center bg-blue-600 text-white rounded-full text-[8px]">{i+1}</span>
                         {name || 'ไม่ระบุชื่อ'}
                       </span>
                     ))}
                     {debtTimeline.steps.length > 3 && (
                       <span className="text-[10px] font-bold text-brand-muted">...และอีก {debtTimeline.steps.length - 3} รายการ</span>
                     )}
                   </div>
                </div>
              </div>
            </div>

            <div className="mt-12 bg-white p-6 rounded-[32px] border border-brand-border shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-xs font-black text-brand-text uppercase tracking-widest">Debt Reduction Forecast</h4>
                    <p className="text-[10px] font-bold text-brand-muted uppercase">กราฟคาดการณ์การลดลงของหนี้แต่ละรายการ (รายเดือน)</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="text-[9px] font-bold text-brand-muted uppercase">Total Balance</span>
                    </div>
                  </div>
                </div>

                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={debtTimeline.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        {liabilities.map((l, i) => (
                          <linearGradient key={`gradient-${l.id}`} id={`color-${l.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6]} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6]} stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        label={{ value: 'Months', position: 'insideBottomRight', offset: -5, fontSize: 10 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        formatter={(value: any, name: string) => {
                          const debt = liabilities.find(l => l.id === name);
                          return [formatCurrency(value), debt ? debt.name : 'Total'];
                        }}
                      />
                      {liabilities.map((l, i) => (
                        <Area 
                          key={l.id}
                          type="monotone" 
                          dataKey={l.id} 
                          stackId="1"
                          stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6]} 
                          fill={`url(#color-${l.id})`} 
                          strokeWidth={2}
                          animationDuration={1000}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </Card>
        )}
      </section>

      {/* Accounts & Investments */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <PiggyBank className="text-indigo-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">บัญชีและการลงทุน (Accounts)</h2>
              <p className="text-xs text-brand-muted">จัดการบัญชีเงินฝาก การลงทุน และทรัพย์สิน</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            {onSyncExternal && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onSyncExternal} 
                loading={isExternalSyncing}
                className="flex-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <RefreshCw size={14} className={cn("mr-2", isExternalSyncing && "animate-spin")} />
                Sync Items
              </Button>
            )}
            <Button size="sm" onClick={addAccount} className="flex-1 bg-brand-text hover:bg-slate-800">
              <Plus size={14} className="mr-2" /> เพิ่มบัญชี
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(acc => (
            <Card key={acc.id} className="flex flex-col gap-5 group hover:border-indigo-200">
               <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      {acc.type === 'Savings' && <Wallet size={12} className="text-blue-500" />}
                      {acc.type === 'Fixed' && <Lock size={12} className="text-orange-500" />}
                      {acc.type === 'Investment' && <TrendingUp size={12} className="text-emerald-500" />}
                      {acc.type === 'Other' && <Circle size={12} className="text-slate-500" />}
                      <Select 
                        value={acc.type ?? 'Savings'}
                        onChange={(e) => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, type: e.target.value as any } : a))}
                        className="text-[9px] font-black h-7 px-2"
                      >
                        <option value="Savings">Savings</option>
                        <option value="Fixed">Fixed</option>
                        <option value="Investment">Investment</option>
                        <option value="Other">Other</option>
                      </Select>
                      <button 
                        onClick={() => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, isEmergencyFund: !a.isEmergencyFund } : a))}
                        className={cn(
                          "text-[9px] font-bold px-2 py-1 rounded-full transition-all border",
                          acc.isEmergencyFund 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-brand-surface text-brand-muted border-brand-border"
                        )}
                      >
                        {acc.isEmergencyFund ? 'Emergency' : 'Standard'}
                      </button>
                    </div>
                    <Input 
                      placeholder="บัญชี / ทรัพย์สิน"
                      value={acc.name ?? ''}
                      onChange={(e) => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, name: e.target.value } : a))}
                      className="font-bold text-sm bg-transparent border-none p-0 focus:ring-0"
                    />
                     <div className="flex items-baseline gap-1 mt-4">
                       <span className="text-sm font-black text-brand-text">฿</span>
                       <AccountAmountInput 
                         initialAmount={acc.amount}
                         onAmountChange={(newAmount) => {
                           const diff = newAmount - acc.amount;
                           if (Math.abs(diff) < 0.01) return;
                           
                           const transaction = {
                             id: crypto.randomUUID(),
                             timestamp: Date.now(),
                             type: (diff > 0 ? 'deposit' : 'withdrawal') as 'deposit' | 'withdrawal',
                             amount: Math.abs(diff),
                             note: 'แก้ไขยอดเงินด้วยตนเอง'
                           };

                           setAccounts(prev => prev.map(a => 
                             a.id === acc.id 
                               ? { ...a, amount: newAmount, transactions: [transaction, ...(a.transactions || [])] } 
                               : a
                           ));
                         }}
                       />
                       <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => addTransaction(acc.id, 'deposit')} className="p-1.5 rounded bg-emerald-50 text-emerald-600" title="ฝากเงิน"><ArrowUpRight size={14} /></button>
                         <button onClick={() => addTransaction(acc.id, 'withdrawal')} className="p-1.5 rounded bg-orange-50 text-orange-600" title="ถอนเงิน"><ArrowDownLeft size={14} /></button>
                       </div>
                     </div>
                   </div>
                   <div className="flex flex-col gap-2">
                    <button onClick={() => setAccounts(prev => prev.filter(a => a.id !== acc.id))} className="text-brand-muted hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={() => setExpandedAccount(expandedAccount === acc.id ? null : acc.id)}
                      className={cn("p-1.5 rounded-lg transition-all", expandedAccount === acc.id ? "bg-indigo-600 text-white" : "bg-brand-surface text-brand-muted")}
                    >
                      <History size={16} />
                    </button>
                   </div>
                </div>
                
                {expandedAccount === acc.id && (
                  <div className="flex flex-col gap-3 py-4 border-t border-brand-border mt-2 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">History</p>
                      <button onClick={() => addTransaction(acc.id, 'deposit')} className="text-[9px] font-bold text-indigo-600">+ Entry</button>
                    </div>
                    <div className="max-h-[160px] overflow-y-auto flex flex-col gap-2 pr-2 custom-scrollbar">
                      {(acc.transactions || []).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-brand-surface/50 text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className={t.type === 'deposit' ? "text-emerald-600" : "text-orange-600"}>
                              {t.type === 'deposit' ? 'IN' : 'OUT'}
                            </span>
                            <span className="font-bold truncate w-24">{t.note || '-'}</span>
                          </div>
                          <span className="font-black">{t.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                   <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">วัตถุประสงค์</p>
                   <Input 
                      value={acc.purpose ?? ''}
                      onChange={(e) => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, purpose: e.target.value } : a))}
                      className="text-xs py-2"
                      placeholder="เช่น ออมระยะยาว..."
                   />
                </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Income Projections Forecast */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="text-emerald-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">คาดการณ์รายได้ (Projections)</h2>
              <p className="text-xs text-brand-muted">ระบุการเปลี่ยนแปลงรายได้ในอนาคต</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={addProjection}>
            <Plus size={14} className="mr-2" /> เพิ่มการคาดการณ์
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projections.map(proj => (
            <Card key={proj.id} variant="surface" className="relative group">
              <button 
                onClick={() => setProjections(prev => prev.filter(p => p.id !== proj.id))}
                className="absolute top-4 right-4 text-brand-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
              
              <div className="flex flex-col gap-4">
                <Input 
                  label="ชื่อรายการ"
                  value={proj.name ?? ''}
                  onChange={(e) => setProjections(prev => prev.map(p => p.id === proj.id ? { ...p, name: e.target.value } : p))}
                  placeholder="เช่น โบนัส 2026"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    label="Amount"
                    type="number"
                    value={proj.monthlyAmountChange ?? ''}
                    onChange={(e) => setProjections(prev => prev.map(p => p.id === proj.id ? { ...p, monthlyAmountChange: Number(e.target.value) } : p))}
                  />
                  <Select 
                    label="ประเภท"
                    value={proj.type ?? 'increase'}
                    onChange={(e) => setProjections(prev => prev.map(p => p.id === proj.id ? { ...p, type: e.target.value as any } : p))}
                  >
                    <option value="increase">เพิ่มขึ้น (+)</option>
                    <option value="decrease">ลดลง (-)</option>
                  </Select>
                </div>
                <Input 
                  label="เริ่มตั้งแต่เดือน"
                  type="month"
                  value={proj.startDate ?? ''}
                  onChange={(e) => setProjections(prev => prev.map(p => p.id === proj.id ? { ...p, startDate: e.target.value } : p))}
                />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <ArrowUpDown size={10} className="text-brand-muted" />;
  return order === 'asc' ? <ChevronUp size={10} className="text-blue-600" /> : <ChevronDown size={10} className="text-blue-600" />;
}

function ChevronUp(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
  );
}

function ChevronDown(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  );
}

function ArrowUpDown(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
  );
}
