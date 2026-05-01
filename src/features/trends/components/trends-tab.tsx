"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn, formatCurrency } from "@/lib/utils";
import { useDerivedFinancials, useFinancialStore } from "@/stores/financial-store";
import {
  Calendar,
  Camera,
  Eye,
  EyeOff,
  History,
  LineChart as LineChartIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { type Variants, motion } from "motion/react";
import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Metric = "netWorth" | "totalWealth" | "totalDebt";

const METRIC_COLORS: Record<Metric, string> = {
  netWorth: "#2563eb",
  totalWealth: "#10b981",
  totalDebt: "#f59e0b",
};

export default function TrendsTab() {
  const history = useFinancialStore((s) => s.history ?? []);
  const takeSnapshot = useFinancialStore((s) => s.takeSnapshot);
  const savingsTarget = useFinancialStore((s) => s.savingsTarget);
  const income = useFinancialStore((s) => s.income);
  const projections = useFinancialStore((s) => s.projections ?? []);
  const { totalWealth, totalDebt, netWorth, monthlyExpenses } = useDerivedFinancials();

  const [dateRange, setDateRange] = React.useState({ start: "", end: "" });
  const [selectedMetrics, setSelectedMetrics] = React.useState<Metric[]>([
    "netWorth",
    "totalWealth",
    "totalDebt",
  ]);

  const sortedHistory = React.useMemo(() => {
    let filtered = [...history].sort((a, b) => a.timestamp - b.timestamp);
    if (dateRange.start) filtered = filtered.filter((h) => h.month >= dateRange.start);
    if (dateRange.end) filtered = filtered.filter((h) => h.month <= dateRange.end);
    return filtered;
  }, [history, dateRange]);

  const availableMonths = React.useMemo(
    () => Array.from(new Set(history.map((h) => h.month))).sort(),
    [history],
  );

  const latest = sortedHistory[sortedHistory.length - 1];
  const previous = sortedHistory[sortedHistory.length - 2];

  const netWorthDiff = latest && previous ? latest.netWorth - previous.netWorth : 0;
  const wealthDiff = latest && previous ? latest.totalWealth - previous.totalWealth : 0;
  const debtDiff = latest && previous ? latest.totalDebt - previous.totalDebt : 0;
  const isNetUp = netWorthDiff > 0;
  const isWealthUp = wealthDiff > 0;
  const isDebtUp = debtDiff > 0;

  const savingsProgress = savingsTarget ? (totalWealth / savingsTarget) * 100 : 0;
  const monthsCovered = monthlyExpenses ? totalWealth / monthlyExpenses : 0;

  const projectionData = React.useMemo(() => {
    const data: { month: string; income: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const target = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = target.toISOString().slice(0, 7);
      let projected = income;
      for (const p of projections) {
        if (p.startDate <= monthStr) {
          const change = p.type === "increase" ? p.monthlyAmountChange : -p.monthlyAmountChange;
          projected += change;
        }
      }
      data.push({
        month: target.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
        income: projected,
      });
    }
    return data;
  }, [income, projections]);

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const item: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  if (history.length === 0 && totalWealth === 0) {
    return (
      <Card
        variant="white"
        padding="lg"
        className="flex flex-col items-center justify-center text-center"
      >
        <div className="p-4 bg-brand-surface rounded-2xl mb-4 text-brand-muted">
          <History size={48} />
        </div>
        <h3 className="text-xl font-bold text-brand-text mb-2">ยังไม่มีประวัติข้อมูล</h3>
        <p className="text-base text-brand-text/80 leading-relaxed mb-8 max-w-sm">
          บันทึกสถานะทางการเงินของคุณในแต่ละเดือนเพื่อดูแนวโน้มการเติบโต
        </p>
        <Button onClick={takeSnapshot} size="lg">
          <Camera size={18} className="mr-2" /> บันทึกเดือนนี้ (Snapshot)
        </Button>
      </Card>
    );
  }

  const toggleMetric = (m: Metric) =>
    setSelectedMetrics((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-8"
    >
      <motion.div variants={item}>
        <Card variant="surface" padding="md" className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm text-brand-text">
            {isNetUp ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div>
            <h2 className="text-xl font-black text-brand-text mb-1">
              {isNetUp ? "ความมั่งคั่งของคุณกำลังเติบโต" : "สถานะการเงินของคุณมีความผันผวน"}
            </h2>
            <p className="text-xs text-brand-muted font-bold">
              {isNetUp
                ? `ในเดือนนี้ความมั่งคั่งสุทธิของคุณเพิ่มขึ้น ${formatCurrency(Math.abs(netWorthDiff))}`
                : `ความมั่งคั่งสุทธิลดลง ${formatCurrency(Math.abs(netWorthDiff))} ในเดือนนี้`}
            </p>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          variants={item}
          label="ความมั่งคั่งสุทธิ"
          value={netWorth}
          diff={netWorthDiff}
          isUp={isNetUp}
          color="emerald"
        />
        <StatCard
          variants={item}
          label="ทรัพย์สินรวม"
          value={totalWealth}
          diff={wealthDiff}
          isUp={isWealthUp}
          color="blue"
        />
        <StatCard
          variants={item}
          label="หนี้คงค้างรวม"
          value={totalDebt}
          diff={debtDiff}
          isUp={!isDebtUp}
          color="orange"
        />
        <motion.div variants={item}>
          <Card variant="dark" padding="md" className="h-full group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                Financial Health
              </p>
              <TrendingUp
                size={16}
                className="text-white/20 group-hover:text-emerald-400 transition-colors"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white">
                  {Math.min(100, Math.max(0, (netWorth / (totalWealth || 1)) * 100)).toFixed(0)}
                </h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressCard
          variants={item}
          label="เป้าหมายความมั่งคั่ง"
          progress={savingsProgress}
          current={totalWealth}
          target={savingsTarget}
        />
        <ProgressCard
          variants={item}
          label="เงินสำรองฉุกเฉิน (เป้าหมาย 6 เดือน)"
          progress={(monthsCovered / 6) * 100}
          current={monthsCovered}
          target={6}
          unit="เดือน"
        />
      </div>

      <motion.div variants={item}>
        <Card padding="lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h3 className="text-lg font-black text-brand-text uppercase tracking-tight">
                Financial Trends
              </h3>
              <p className="text-[10px] font-bold text-brand-muted uppercase">
                เฝ้าติดตามความมั่งคั่งและหนี้สินรายเดือน
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={takeSnapshot} size="sm" variant="secondary">
                <Camera size={14} className="mr-2" /> Snapshot
              </Button>

              <div className="flex items-center gap-2 bg-brand-surface p-1.5 rounded-xl border border-brand-border">
                <Calendar size={12} className="text-blue-600 ml-2" />
                <Select
                  value={dateRange.start}
                  onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
                  className="h-7 text-[10px] min-w-[80px]"
                  aria-label="Start month"
                >
                  <option value="">เริ่ม</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
                <Select
                  value={dateRange.end}
                  onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
                  className="h-7 text-[10px] min-w-[80px]"
                  aria-label="End month"
                >
                  <option value="">จบ</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-1 bg-brand-surface p-1.5 rounded-xl border border-brand-border">
                <MetricToggle
                  label="Net"
                  active={selectedMetrics.includes("netWorth")}
                  onClick={() => toggleMetric("netWorth")}
                  color="bg-blue-600"
                />
                <MetricToggle
                  label="Wealth"
                  active={selectedMetrics.includes("totalWealth")}
                  onClick={() => toggleMetric("totalWealth")}
                  color="bg-emerald-600"
                />
                <MetricToggle
                  label="Debt"
                  active={selectedMetrics.includes("totalDebt")}
                  onClick={() => toggleMetric("totalDebt")}
                  color="bg-orange-600"
                />
              </div>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sortedHistory}>
                <defs>
                  {(Object.entries(METRIC_COLORS) as [Metric, string][]).map(([metric, color]) => (
                    <linearGradient key={metric} id={`color-${metric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1000
                        ? `${(v / 1000).toFixed(0)}k`
                        : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "20px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                {(["netWorth", "totalWealth", "totalDebt"] as Metric[]).map((m) =>
                  selectedMetrics.includes(m) ? (
                    <Area
                      key={m}
                      type="monotone"
                      dataKey={m}
                      stroke={METRIC_COLORS[m]}
                      strokeWidth={3}
                      fill={`url(#color-${m})`}
                    />
                  ) : null,
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {projections.length > 0 && (
        <motion.div variants={item}>
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <LineChartIcon className="text-emerald-600 w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-brand-text uppercase tracking-widest">
                คาดการณ์รายได้ 12 เดือนข้างหน้า
              </h3>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip />
                  <Area
                    type="stepAfter"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorIncome)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  diff,
  isUp,
  color,
  variants,
}: {
  label: string;
  value: number;
  diff: number;
  isUp: boolean;
  color: "emerald" | "blue" | "orange";
  variants: Variants;
}) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
  };
  return (
    <motion.div variants={variants}>
      <Card padding="md">
        <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2">
          {label}
        </p>
        <div className="flex items-end justify-between">
          <h3 className={cn("text-2xl font-black", colors[color])}>{formatCurrency(value)}</h3>
          {diff !== 0 && (
            <div
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1",
                isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
              )}
            >
              {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {formatCurrency(Math.abs(diff))}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function ProgressCard({
  label,
  progress,
  current,
  target,
  unit = "฿",
  variants,
}: {
  label: string;
  progress: number;
  current: number;
  target: number;
  unit?: string;
  variants: Variants;
}) {
  return (
    <motion.div variants={variants}>
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
            {label}
          </h3>
          <span className="text-xs font-black text-brand-text">
            {Math.min(100, progress).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-brand-surface h-3 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-brand-muted">
            ปัจจุบัน: {unit === "฿" ? formatCurrency(current) : `${current.toFixed(1)} ${unit}`}
          </span>
          <span className="text-brand-text">
            เป้าหมาย: {unit === "฿" ? formatCurrency(target) : `${target} ${unit}`}
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

function MetricToggle({
  label,
  active,
  color,
  onClick,
}: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all border text-[9px] font-black uppercase tracking-tight",
        active
          ? "bg-white border-brand-border text-brand-text shadow-sm"
          : "bg-transparent border-transparent text-brand-muted",
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full", active ? color : "bg-gray-300")} />
      {label}
      {active ? <Eye size={10} /> : <EyeOff size={10} />}
    </button>
  );
}
