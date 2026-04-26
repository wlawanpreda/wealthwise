import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { FinancialSnapshot } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Minus, History, Camera } from 'lucide-react';
import { motion } from 'motion/react';

interface TrendDashboardProps {
  history: FinancialSnapshot[];
  onTakeSnapshot: () => void;
}

export default function TrendDashboard({ history, onTakeSnapshot }: TrendDashboardProps) {
  const sortedHistory = React.useMemo(() => {
    return [...history].sort((a, b) => a.timestamp - b.timestamp);
  }, [history]);

  const latest = sortedHistory[sortedHistory.length - 1];
  const previous = sortedHistory[sortedHistory.length - 2];

  const netWorthDiff = latest && previous ? latest.netWorth - previous.netWorth : 0;
  const isUp = netWorthDiff > 0;

  if (history.length === 0) {
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
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">ความมั่งคั่งสุทธิ (Net Worth)</p>
          <div className="flex items-end gap-3">
             <h3 className="text-3xl font-black text-brand-text">{formatCurrency(latest.netWorth)}</h3>
             {previous && (
               <div className={cn(
                 "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1",
                 isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
               )}>
                 {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                 {formatCurrency(Math.abs(netWorthDiff))}
               </div>
             )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">ทรัพย์สินรวม (Total Wealth)</p>
          <h3 className="text-3xl font-black text-blue-600">{formatCurrency(latest.totalWealth)}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">ภาระหนี้สิน (Total Debt)</p>
          <h3 className="text-3xl font-black text-red-600">{formatCurrency(latest.totalDebt)}</h3>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-8 rounded-3xl border border-brand-border shadow-sm">
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
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
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
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-brand-border shadow-sm">
           <h3 className="text-sm font-black text-brand-text uppercase tracking-widest mb-6">Savings Rate History (%)</h3>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={sortedHistory}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                 <Tooltip 
                   cursor={{ fill: '#f8fafc' }}
                   contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
                   formatter={(val: number) => [`${val.toFixed(1)}%`, 'Savings Rate']}
                 />
                 <Bar dataKey="savingsRate" radius={[4, 4, 0, 0]}>
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
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                 <Tooltip contentStyle={{ borderRadius: '16px' }} />
                 <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingBottom: '20px' }} />
                 <Area type="monotone" dataKey="totalWealth" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Total Wealth" />
                 <Area type="monotone" dataKey="totalDebt" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Total Debt" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}
