import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, History, Camera, LineChart as LineChartIcon, Calendar, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Select } from './ui/Select';

export default function TrendDashboard() {
  const {
    history,
    takeSnapshot,
    totalWealth,
    totalDebt,
    netWorth,
    savingsTarget,
    monthlyExpenses,
    income,
    projections,
    savingsRate
  } = useFinancial();

  const [dateRange, setDateRange] = React.useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>(['netWorth', 'totalWealth', 'totalDebt']);

  const sortedHistory = React.useMemo(() => {
    let filtered = [...history].sort((a, b) => a.timestamp - b.timestamp);
    
    if (dateRange.start) {
      filtered = filtered.filter(h => h.month >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter(h => h.month <= dateRange.end);
    }
    
    return filtered;
  }, [history, dateRange]);

  const availableMonths = React.useMemo(() => {
    return Array.from(new Set(history.map(h => h.month))).sort();
  }, [history]);

  const latestSnap = sortedHistory[sortedHistory.length - 1];
  const previousSnap = sortedHistory[sortedHistory.length - 2];

  // Comparison logic
  const netWorthDiff = latestSnap && previousSnap ? latestSnap.netWorth - previousSnap.netWorth : 0;
  const isNetUp = netWorthDiff > 0;
  const wealthDiff = latestSnap && previousSnap ? latestSnap.totalWealth - previousSnap.totalWealth : 0;
  const isWealthUp = wealthDiff > 0;
  const debtDiff = latestSnap && previousSnap ? latestSnap.totalDebt - previousSnap.totalDebt : 0;
  const isDebtUp = debtDiff > 0;

  // Derived Metrics
  const savingsProgress = savingsTarget ? (totalWealth / savingsTarget) * 100 : 0;
  const monthsCovered = monthlyExpenses ? totalWealth / monthlyExpenses : 0;
  
  // Projection Data
  const projectionData = React.useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const targetMonthStr = targetDate.toISOString().slice(0, 7);
      
      let projectedIncome = income;
      projections.forEach(p => {
        if (p.startDate <= targetMonthStr) {
          const change = p.type === 'increase' ? p.monthlyAmountChange : -p.monthlyAmountChange;
          projectedIncome += change;
        }
      });
      
      data.push({
        month: targetDate.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
        income: projectedIncome
      });
    }
    return data;
  }, [income, projections]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (history.length === 0 && totalWealth === 0) {
    return (
      <Card variant="white" padding="lg" className="flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-brand-surface rounded-2xl mb-4 text-brand-muted">
          <History size={48} />
        </div>
        <h3 className="text-xl font-bold text-brand-text mb-2">ยังไม่มีประวัติข้อมูล</h3>
        <p className="text-sm text-brand-muted mb-8 max-w-sm">
          บันทึกสถานะทางการเงินของคุณในแต่ละเดือนเพื่อดูแนวโน้มการเติบโตและความมั่งคั่งที่เพิ่มขึ้น
        </p>
        <Button onClick={takeSnapshot} size="lg">
          <Camera size={18} className="mr-2" /> บันทึกเดือนนี้ (Snapshot)
        </Button>
      </Card>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-8">
      {/* Overview Highlight */}
      <motion.div variants={item}>
        <Card variant="surface" padding="md" className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm text-brand-text">
            {isNetUp ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div>
            <h2 className="text-xl font-black text-brand-text mb-1">
              {isNetUp ? 'ความมั่งคั่งของคุณกำลังเติบโต' : 'สถานะการเงินของคุณมีความผันผวน'}
            </h2>
            <p className="text-xs text-brand-muted font-bold">
              {isNetUp 
                ? `ในเดือนนี้ความมั่งคั่งสุทธิของคุณเพิ่มขึ้น ${formatCurrency(Math.abs(netWorthDiff))} สะท้อนถึงการเติบโตที่ดี`
                : `ความมั่งคั่งสุทธิลดลง ${formatCurrency(Math.abs(netWorthDiff))} ในเดือนนี้ โปรดตรวจสอบภาระหนี้หรือรายจ่าย`
              }
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="ความมั่งคั่งสุทธิ" 
          value={netWorth} 
          diff={netWorthDiff} 
          isUp={isNetUp} 
          color="emerald" 
          variants={item} 
        />
        <StatCard 
          label="ทรัพย์สินรวม" 
          value={totalWealth} 
          diff={wealthDiff} 
          isUp={isWealthUp} 
          color="blue" 
          variants={item} 
        />
        <StatCard 
          label="หนี้คงค้างรวม" 
          value={totalDebt} 
          diff={debtDiff} 
          isUp={!isDebtUp} 
          color="orange" 
          variants={item} 
          inverse
        />
        <motion.div variants={item}>
          <Card variant="dark" padding="md" className="h-full group">
            <div className="flex items-center justify-between mb-4">
               <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Financial Health</p>
               <TrendingUp size={16} className="text-white/20 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white">{(Math.min(100, Math.max(0, (netWorth / (totalWealth || 1)) * 100))).toFixed(0)}</h3>
                <p className="text-[9px] font-bold text-emerald-400 uppercase">Equity %</p>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white">{monthsCovered.toFixed(1)}</h3>
                <p className="text-[9px] font-bold text-blue-400 uppercase">Buffer (Mo)</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressCard 
          label="เป้าหมายความมั่งคั่ง" 
          progress={savingsProgress} 
          current={totalWealth} 
          target={savingsTarget} 
          variants={item}
        />
        <ProgressCard 
          label="เงินสำรองฉุกเฉิน (เป้าหมาย 6 เดือน)" 
          progress={(monthsCovered / 6) * 100} 
          current={monthsCovered} 
          target={6} 
          unit="เดือน"
          variants={item}
        />
      </div>

      {/* Main Trends Chart */}
      <motion.div variants={item}>
        <Card padding="lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
             <div>
               <h3 className="text-lg font-black text-brand-text uppercase tracking-tight">Financial Trends</h3>
               <p className="text-[10px] font-bold text-brand-muted uppercase">เฝ้าติดตามความมั่งคั่งและหนี้สินรายเดือน</p>
             </div>
             
             <div className="flex flex-wrap items-center gap-3">
               <Button onClick={takeSnapshot} size="sm" variant="secondary">
                 <Camera size={14} className="mr-2" /> Snapshot
               </Button>

               <div className="flex items-center gap-2 bg-brand-surface p-1.5 rounded-xl border border-brand-border">
                  <Calendar size={12} className="text-blue-600 ml-2" />
                  <Select 
                    value={dateRange.start} 
                    onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                    className="h-7 text-[10px] min-w-[80px]"
                  >
                    <option value="">เริ่ม</option>
                    {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </Select>
                  <Select 
                    value={dateRange.end} 
                    onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                    className="h-7 text-[10px] min-w-[80px]"
                  >
                    <option value="">จบ</option>
                    {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </Select>
               </div>

               <div className="flex items-center gap-1 bg-brand-surface p-1.5 rounded-xl border border-brand-border">
                  <MetricToggle label="Net" active={selectedMetrics.includes('netWorth')} color="bg-blue-600" onClick={() => toggleMetric('netWorth')} />
                  <MetricToggle label="Wealth" active={selectedMetrics.includes('totalWealth')} color="bg-emerald-600" onClick={() => toggleMetric('totalWealth')} />
                  <MetricToggle label="Debt" active={selectedMetrics.includes('totalDebt')} color="bg-orange-600" onClick={() => toggleMetric('totalDebt')} />
               </div>
             </div>
          </div>

          <div className="h-[350px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={sortedHistory}>
                 <defs>
                   <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                 <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                 {selectedMetrics.includes('netWorth') && <Area type="monotone" dataKey="netWorth" stroke="#2563eb" strokeWidth={3} fill="url(#colorNetWorth)" />}
                 {selectedMetrics.includes('totalWealth') && <Area type="monotone" dataKey="totalWealth" stroke="#10b981" strokeWidth={3} fill="url(#colorWealth)" />}
                 {selectedMetrics.includes('totalDebt') && <Area type="monotone" dataKey="totalDebt" stroke="#f59e0b" strokeWidth={3} fill="url(#colorDebt)" />}
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Projection Chart */}
      {projections.length > 0 && (
        <motion.div variants={item}>
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <LineChartIcon className="text-emerald-600 w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-brand-text uppercase tracking-widest">คาดการณ์รายได้ 12 เดือนข้างหน้า</h3>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip />
                  <Area type="stepAfter" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#colorInc)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );

  function toggleMetric(id: string) {
    setSelectedMetrics(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  }
}

function StatCard({ label, value, diff, isUp, color, inverse, variants }: any) {
  const colors = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    orange: 'text-orange-600 bg-orange-50',
  };

  return (
    <motion.div variants={variants}>
      <Card padding="md">
        <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-end justify-between">
          <h3 className={cn("text-2xl font-black", colors[color as keyof typeof colors].split(' ')[0])}>
            {formatCurrency(value)}
          </h3>
          {diff !== 0 && (
             <div className={cn(
               "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1",
               isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
             )}>
               {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
               {formatCurrency(Math.abs(diff))}
             </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function ProgressCard({ label, progress, current, target, unit = '฿', variants }: any) {
  return (
    <motion.div variants={variants}>
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{label}</h3>
          <span className="text-xs font-black text-brand-text">{Math.min(100, progress).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-brand-surface h-3 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-brand-muted">ปัจจุบัน: {unit === '฿' ? formatCurrency(current) : `${current.toFixed(1)} ${unit}`}</span>
          <span className="text-brand-text">เป้าหมาย: {unit === '฿' ? formatCurrency(target) : `${target} ${unit}`}</span>
        </div>
      </Card>
    </motion.div>
  );
}

function MetricToggle({ label, active, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all border text-[9px] font-black uppercase tracking-tight",
        active ? "bg-white border-brand-border text-brand-text shadow-sm" : "bg-transparent border-transparent text-brand-muted"
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full", active ? color : "bg-gray-300")} />
      {label}
      {active ? <Eye size={10} /> : <EyeOff size={10} />}
    </button>
  );
}
