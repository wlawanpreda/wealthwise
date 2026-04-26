import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { FinancialSnapshot, IncomeProjection } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Minus, History, Camera, LineChart as LineChartIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface TrendDashboardProps {
  history: FinancialSnapshot[];
  onTakeSnapshot: () => void;
  currentWealth?: number;
  currentDebt?: number;
  currentNetWorth?: number;
  savingsTarget?: number;
  monthlyExpenses?: number;
  income?: number;
  projections?: IncomeProjection[];
}

export default function TrendDashboard({ 
  history, 
  onTakeSnapshot,
  currentWealth,
  currentDebt,
  currentNetWorth,
  savingsTarget,
  monthlyExpenses,
  income = 0,
  projections = []
}: TrendDashboardProps) {
  const sortedHistory = React.useMemo(() => {
    return [...history].sort((a, b) => a.timestamp - b.timestamp);
  }, [history]);

  const latestSnap = sortedHistory[sortedHistory.length - 1];
  const previousSnap = sortedHistory[sortedHistory.length - 2];

  // Use live data if provided, otherwise fallback to latest snapshot
  const displayNetWorth = currentNetWorth !== undefined ? currentNetWorth : (latestSnap?.netWorth || 0);
  const displayWealth = currentWealth !== undefined ? currentWealth : (latestSnap?.totalWealth || 0);
  const displayDebt = currentDebt !== undefined ? currentDebt : (latestSnap?.totalDebt || 0);

  // Comparison logic for Net Worth
  const netWorthDiff = latestSnap && previousSnap ? latestSnap.netWorth - previousSnap.netWorth : 0;
  const isNetUp = netWorthDiff > 0;

  // Comparison for Wealth
  const wealthDiff = latestSnap && previousSnap ? latestSnap.totalWealth - previousSnap.totalWealth : 0;
  const isWealthUp = wealthDiff > 0;

  // Comparison for Debt
  const debtDiff = latestSnap && previousSnap ? latestSnap.totalDebt - previousSnap.totalDebt : 0;
  const isDebtUp = debtDiff > 0;

  // Derived Metrics
  const savingsProgress = savingsTarget ? (displayWealth / savingsTarget) * 100 : 0;
  const monthsCovered = monthlyExpenses ? displayWealth / monthlyExpenses : 0;
  
  // Calculate Income Projections Forecast (Next 12 Months)
  const projectionData = React.useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const targetMonthStr = targetDate.toISOString().slice(0, 7);
      
      let projectedIncome = income;
      
      // Calculate cumulative changes that have started by this target month
      projections.forEach(p => {
        if (p.startDate <= targetMonthStr) {
          const change = p.type === 'increase' ? p.monthlyAmountChange : -p.monthlyAmountChange;
          projectedIncome += change;
        }
      });
      
      data.push({
        month: targetDate.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
        income: projectedIncome,
        monthKey: targetMonthStr
      });
    }
    return data;
  }, [income, projections]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (history.length === 0 && currentWealth === undefined) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-brand-border shadow-sm text-center">
        <div className="p-4 bg-brand-surface rounded-2xl mb-4 text-brand-muted">
          <History size={48} />
        </div>
        <h3 className="text-xl font-bold text-brand-text mb-2">ยังไม่มีประวัติข้อมูล</h3>
        <p className="text-sm text-brand-muted mb-8 max-w-sm">
          บันทึกสถานะทางการเงินของคุณในแต่ละเดือนเพื่อดูแนวโน้มการเติบโตและความมั่งคั่งที่เพิ่มขึ้น
        </p>
        <button 
          onClick={onTakeSnapshot}
          className="flex items-center gap-2 px-6 py-3 bg-brand-text text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
        >
          <Camera size={18} /> บันทึกเดือนนี้ (Snapshot)
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-8"
    >
      {/* Overview Grid */}
      <motion.div variants={item} className="bg-brand-surface border border-brand-border p-6 rounded-3xl mb-2 flex items-start gap-4">
        <div className="p-3 bg-white rounded-2xl shadow-sm text-brand-text">
          {isNetUp ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
        </div>
        <div>
          <h2 className="text-xl font-black text-brand-text mb-1">
            {isNetUp ? 'ความมั่งคั่งของคุณกำลังเติบโต' : 'สถานะการเงินของคุณมีความผันผวน'}
          </h2>
          <p className="text-xs text-brand-muted font-bold">
            {isNetUp 
              ? `ในเดือนนี้ความมั่งคั่งสุทธิของคุณเพิ่มขึ้น ${formatCurrency(Math.abs(netWorthDiff))} สะท้อนถึงการเติบโตที่ดีจากแผนการออมและลงทุน`
              : `ความมั่งคั่งสุทธิลดลง ${formatCurrency(Math.abs(netWorthDiff))} ในเดือนนี้ โปรดตรวจสอบภาระหนี้หรือรายจ่ายที่เพิ่มขึ้น`
            }
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">ความมั่งคั่งสุทธิ (Net Worth)</p>
          <div className="flex items-end gap-3 flex-wrap">
             <h3 className={cn("text-3xl font-black", displayNetWorth >= 0 ? "text-emerald-600" : "text-red-600")}>
               {formatCurrency(displayNetWorth)}
             </h3>
             {latestSnap && previousSnap && (
               <div className={cn(
                 "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 shrink-0",
                 isNetUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
               )}>
                 {isNetUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                 {formatCurrency(Math.abs(netWorthDiff))}
               </div>
             )}
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">ทรัพย์สินรวม (Total Wealth)</p>
          <div className="flex items-end gap-3 flex-wrap">
            <h3 className="text-3xl font-black text-blue-600">{formatCurrency(displayWealth)}</h3>
            {latestSnap && previousSnap && (
               <div className={cn(
                 "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 shrink-0",
                 isWealthUp ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
               )}>
                 {isWealthUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                 {formatCurrency(Math.abs(wealthDiff))}
               </div>
             )}
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">หนี้คงค้างรวม (Total Debt)</p>
          <div className="flex items-end gap-3 flex-wrap">
            <h3 className="text-3xl font-black text-orange-600">{formatCurrency(displayDebt)}</h3>
            {latestSnap && previousSnap && (
               <div className={cn(
                 "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 shrink-0",
                 !isDebtUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
               )}>
                 {!isDebtUp ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                 {formatCurrency(Math.abs(debtDiff))}
               </div>
             )}
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-brand-text p-6 rounded-3xl border border-brand-border shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-white" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Financial Health Score</p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-3xl font-black text-white">{(Math.min(100, Math.max(0, (displayNetWorth / (displayWealth || 1)) * 100))).toFixed(0)}</h3>
              <p className="text-[9px] font-bold text-emerald-400 uppercase">Equit Ratio</p>
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-black text-white">{monthsCovered.toFixed(1)}</h3>
              <p className="text-[9px] font-bold text-blue-400 uppercase">Safety Net (Mo)</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-widest">เป้าหมายความมั่งคั่ง</h3>
             <span className="text-xs font-black text-brand-text">{savingsProgress.toFixed(1)}%</span>
           </div>
           <div className="w-full bg-brand-surface h-4 rounded-full overflow-hidden mb-3">
             <div 
               className="h-full bg-blue-600 rounded-full transition-all duration-1000"
               style={{ width: `${Math.min(100, savingsProgress)}%` }}
             />
           </div>
           <div className="flex justify-between text-[10px] font-bold">
             <span className="text-brand-muted">ปัจจุบัน: {formatCurrency(displayWealth)}</span>
             <span className="text-brand-text">เป้าหมาย: {formatCurrency(savingsTarget || 0)}</span>
           </div>
        </motion.div>

        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-widest">ความแข็งแรงของเงินสำรอง</h3>
             <span className={cn(
               "text-xs font-black",
               monthsCovered >= 6 ? "text-emerald-600" : monthsCovered >= 3 ? "text-blue-600" : "text-red-600"
             )}>
               {monthsCovered >= 6 ? 'ยอดเยี่ยม' : monthsCovered >= 3 ? 'พอใช้' : 'ควรเร่งสะสม'}
             </span>
           </div>
           <div className="w-full bg-brand-surface h-4 rounded-full overflow-hidden mb-3">
             <div 
               className={cn(
                 "h-full rounded-full transition-all duration-1000",
                 monthsCovered >= 6 ? "bg-emerald-500" : monthsCovered >= 3 ? "bg-blue-500" : "bg-red-500"
               )}
               style={{ width: `${Math.min(100, (monthsCovered / 12) * 100)}%` }}
             />
           </div>
           <div className="flex justify-between text-[10px] font-bold">
             <span className="text-brand-muted">ครอบคลุมรายจ่าย: {monthsCovered.toFixed(1)} เดือน</span>
             <span className="text-brand-text">แนะนำ: 6.0 เดือน (ขั้นต่ำ)</span>
           </div>
        </motion.div>
      </div>

      {/* Main Chart */}
      <motion.div variants={item} className="bg-white p-8 rounded-3xl border border-brand-border shadow-sm">
        <div className="flex items-center justify-between mb-8">
           <div>
             <h3 className="text-lg font-black text-brand-text">Net Worth Trend</h3>
             <p className="text-[10px] font-bold text-brand-muted uppercase">แนวโน้มความมั่งคั่งสุทธิรายเดือน</p>
           </div>
           <button 
            onClick={onTakeSnapshot}
            className="flex items-center gap-2 px-4 py-2 bg-brand-surface text-brand-text border border-brand-border rounded-xl text-xs font-bold hover:bg-white transition-all shadow-sm active:scale-95"
          >
            <Camera size={14} /> บันทึกเดือนนี้
          </button>
        </div>

        <div className="h-[350px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={sortedHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
               <defs>
                 <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                   <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                dy={10}
               />
               <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                tickFormatter={(val) => {
                  if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}k`;
                  return val;
                }}
                domain={['auto', 'auto']}
                allowDecimals={false}
               />
               <Tooltip 
                 contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 formatter={(val: number) => [formatCurrency(val), 'Net Worth']}
                 labelStyle={{ fontWeight: 800, fontSize: '12px', color: '#1e293b', marginBottom: '4px' }}
               />
               <Area 
                type="monotone" 
                dataKey="netWorth" 
                stroke="#2563eb" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorNetWorth)" 
                animationDuration={2000}
               />
             </AreaChart>
           </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Income Projection Forecast Chart */}
      {projections.length > 0 && (
        <motion.div variants={item} className="bg-white p-8 rounded-3xl border border-brand-border shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <LineChartIcon className="text-emerald-600 w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-brand-text uppercase tracking-widest">คาดการณ์รายได้ 12 เดือนข้างหน้า</h3>
              <p className="text-[10px] font-bold text-brand-muted uppercase">คำนวณตามแผนก้าวสำคัญของรายได้ที่คุณระบุไว้</p>
            </div>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  tickFormatter={(val) => {
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return val;
                  }}
                  domain={['dataMin - 10000', 'dataMax + 10000']}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
                  formatter={(val: number) => [formatCurrency(val), 'Projected Income']}
                />
                <Area 
                  type="stepAfter" 
                  dataKey="income" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorIncome)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {projections.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 bg-brand-surface rounded-full border border-brand-border">
                <span className={p.type === 'increase' ? "text-emerald-600" : "text-red-600"}>
                  {p.type === 'increase' ? '+' : '-'}{formatCurrency(p.monthlyAmountChange)}
                </span>
                <span className="text-brand-text">{p.name}</span>
                <span className="text-brand-muted">({p.startDate})</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Secondary Charts */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-brand-border shadow-sm">
           <h3 className="text-sm font-black text-brand-text uppercase tracking-widest mb-6">Savings Rate History (%)</h3>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={sortedHistory}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                 <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                   tickFormatter={(val) => `${val}%`}
                 />
                 <Tooltip 
                   cursor={{ fill: '#f8fafc' }}
                   contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
                   formatter={(val: number) => [`${val.toFixed(1)}%`, 'Savings Rate']}
                 />
                 <Bar dataKey="savingsRate" radius={[4, 4, 0, 0]} animationDuration={1500}>
                   {sortedHistory.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.savingsRate >= 20 ? '#10b981' : '#3b82f6'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-brand-border shadow-sm">
           <h3 className="text-sm font-black text-brand-text uppercase tracking-widest mb-6">Wealth vs Debt Distribution</h3>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={sortedHistory}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                 <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                   tickFormatter={(val) => {
                     if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                     if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}k`;
                     return val;
                   }}
                 />
                 <Tooltip contentStyle={{ borderRadius: '16px' }} />
                 <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingBottom: '20px' }} />
                 <Area type="monotone" dataKey="totalWealth" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Total Wealth" animationDuration={1500} />
                 <Area type="monotone" dataKey="totalDebt" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Total Debt" animationDuration={1500} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
