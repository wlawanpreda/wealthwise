"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, newId } from "@/lib/utils";
import { useDerivedFinancials, useFinancialStore } from "@/stores/financial-store";
import { AlertTriangle, Calendar, CreditCard, Plus, Trash2, Zap } from "lucide-react";
import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDebounced } from "../hooks/use-debounced";
import { simulateDebtPayoff } from "../lib/debt-timeline";
import { SortIcon } from "./sort-icon";

type SortKey = "name" | "totalAmount" | "monthlyPayment" | "dueDate";

const COLORS = ["#ef4444", "#f97316", "#facc15", "#3b82f6", "#8b5cf6", "#ec4899"];
const AREA_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function isDueSoon(dayStr?: string): boolean {
  if (!dayStr) return false;
  const day = Number.parseInt(dayStr, 10);
  if (Number.isNaN(day) || day < 1 || day > 31) return false;
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  let diff = day - today.getDate();
  if (diff < 0) diff += lastDay;
  return diff >= 0 && diff <= 3;
}

export function LiabilitiesSection() {
  const liabilities = useFinancialStore((s) => s.liabilities);
  const setLiabilities = useFinancialStore((s) => s.setLiabilities);
  const { totalDebt } = useDerivedFinancials();

  const [sortKey, setSortKey] = React.useState<SortKey>("dueDate");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [strategy, setStrategy] = React.useState<"snowball" | "avalanche">("snowball");
  const [extraPaymentInput, setExtraPaymentInput] = React.useState(0);

  // Debounce inputs that drive the timeline simulation
  const debouncedLiabilities = useDebounced(liabilities, 350);
  const debouncedExtra = useDebounced(extraPaymentInput, 350);

  const debtTimeline = React.useMemo(
    () => simulateDebtPayoff(debouncedLiabilities, strategy, debouncedExtra),
    [debouncedLiabilities, strategy, debouncedExtra],
  );

  const sorted = React.useMemo(() => {
    return [...liabilities].sort((a, b) => {
      let valA: number | string = a[sortKey] ?? "";
      let valB: number | string = b[sortKey] ?? "";
      if (sortKey === "name") {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      } else if (sortKey === "dueDate") {
        valA = Number.parseInt(String(valA), 10) || 99;
        valB = Number.parseInt(String(valB), 10) || 99;
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [liabilities, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const addLiability = () =>
    setLiabilities((prev) => [
      ...prev,
      { id: newId(), name: "", totalAmount: 0, monthlyPayment: 0, dueDate: "" },
    ]);

  return (
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
                  data={liabilities.map((l) => ({
                    name: l.name || "ไม่ระบุชื่อ",
                    value: l.totalAmount,
                  }))}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {liabilities.map((l, idx) => (
                    <Cell key={l.id} fill={COLORS[idx % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-8 flex flex-col justify-center">
            <h3 className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-4">
              สัดส่วนหนี้สินรวม
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...liabilities]
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .slice(0, 4)
                .map((debt, i) => (
                  <div key={debt.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-[11px] font-bold text-brand-text truncate">
                        {debt.name || "ไม่ระบุ"}
                      </span>
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
              <th
                className="px-6 py-4 text-[10px] uppercase font-black tracking-widest cursor-pointer"
                onClick={() => toggleSort("name")}
              >
                ชื่อรายการ <SortIcon active={sortKey === "name"} order={sortOrder} />
              </th>
              <th
                className="px-6 py-4 text-[10px] uppercase font-black tracking-widest cursor-pointer"
                onClick={() => toggleSort("totalAmount")}
              >
                ยอดคงเหลือ <SortIcon active={sortKey === "totalAmount"} order={sortOrder} />
              </th>
              <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest">
                ดอกเบี้ย (%)
              </th>
              <th
                className="px-6 py-4 text-[10px] uppercase font-black tracking-widest cursor-pointer"
                onClick={() => toggleSort("monthlyPayment")}
              >
                ผ่อน/เดือน <SortIcon active={sortKey === "monthlyPayment"} order={sortOrder} />
              </th>
              <th
                className="px-6 py-4 text-[10px] uppercase font-black tracking-widest cursor-pointer"
                onClick={() => toggleSort("dueDate")}
              >
                วันครบกำหนด <SortIcon active={sortKey === "dueDate"} order={sortOrder} />
              </th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/50">
            {sorted.map((debt) => (
              <tr
                key={debt.id}
                className={cn(
                  "group hover:bg-brand-surface/30",
                  isDueSoon(debt.dueDate) && "bg-red-50/50 hover:bg-red-50",
                )}
              >
                <td className="px-6 py-4">
                  <Input
                    variant="ghost"
                    value={debt.name}
                    onChange={(e) =>
                      setLiabilities((prev) =>
                        prev.map((l) => (l.id === debt.id ? { ...l, name: e.target.value } : l)),
                      )
                    }
                    placeholder="ระบุชื่อหนี้..."
                    className="font-bold bg-transparent"
                    leftIcon={
                      isDueSoon(debt.dueDate) ? (
                        <AlertTriangle size={14} className="text-red-500" />
                      ) : undefined
                    }
                  />
                </td>
                <td className="px-6 py-4">
                  <Input
                    type="number"
                    value={debt.totalAmount === 0 ? "" : debt.totalAmount}
                    onChange={(e) =>
                      setLiabilities((prev) =>
                        prev.map((l) =>
                          l.id === debt.id ? { ...l, totalAmount: Number(e.target.value) } : l,
                        ),
                      )
                    }
                    className="text-brand-secondary bg-transparent"
                  />
                </td>
                <td className="px-6 py-4">
                  <Input
                    type="number"
                    value={debt.interestRate ?? ""}
                    onChange={(e) =>
                      setLiabilities((prev) =>
                        prev.map((l) =>
                          l.id === debt.id
                            ? {
                                ...l,
                                interestRate: e.target.value ? Number(e.target.value) : undefined,
                              }
                            : l,
                        ),
                      )
                    }
                    className="text-brand-text bg-transparent"
                    placeholder="0"
                  />
                </td>
                <td className="px-6 py-4">
                  <Input
                    type="number"
                    value={debt.monthlyPayment === 0 ? "" : debt.monthlyPayment}
                    onChange={(e) =>
                      setLiabilities((prev) =>
                        prev.map((l) =>
                          l.id === debt.id ? { ...l, monthlyPayment: Number(e.target.value) } : l,
                        ),
                      )
                    }
                    className="text-red-600 font-black bg-transparent"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-brand-muted">วันที่</span>
                    <Input
                      value={debt.dueDate ?? ""}
                      onChange={(e) =>
                        setLiabilities((prev) =>
                          prev.map((l) =>
                            l.id === debt.id ? { ...l, dueDate: e.target.value } : l,
                          ),
                        )
                      }
                      className="w-12 text-center text-xs p-1 h-8"
                      maxLength={2}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => setLiabilities((prev) => prev.filter((l) => l.id !== debt.id))}
                    className="text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-500 p-2"
                    aria-label="Delete debt"
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
                  <h3 className="text-sm font-black text-brand-text uppercase tracking-widest">
                    แผนปลดหนี้อัจฉริยะ
                  </h3>
                  <p className="text-[10px] font-bold text-brand-muted uppercase">
                    เลือกกลยุทธ์ที่เหมาะกับคุณ
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setStrategy("snowball")}
                  className={cn(
                    "flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all text-left",
                    strategy === "snowball"
                      ? "bg-white border-blue-600 shadow-md"
                      : "bg-white/50 border-brand-border opacity-60 hover:opacity-100",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Snowball
                    </span>
                    {strategy === "snowball" && (
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <p className="text-[9px] font-bold text-brand-muted leading-tight">
                    เน้นปิดยอดที่น้อยที่สุดก่อน เพื่อสร้างกำลังใจ (Quick Wins)
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy("avalanche")}
                  className={cn(
                    "flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all text-left",
                    strategy === "avalanche"
                      ? "bg-white border-blue-600 shadow-md"
                      : "bg-white/50 border-brand-border opacity-60 hover:opacity-100",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Avalanche
                    </span>
                    {strategy === "avalanche" && (
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <p className="text-[9px] font-bold text-brand-muted leading-tight">
                    เน้นปิดยอดที่มีดอกเบี้ยสูงที่สุดก่อน เพื่อลดต้นทุนดอกเบี้ยรวม
                  </p>
                </button>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand-border">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                    เงินก้อนพิเศษต่อเดือน (Extra)
                  </p>
                  <span className="text-[10px] font-bold text-blue-600">เร่งการปลดหนี้</span>
                </div>
                <Input
                  type="number"
                  value={extraPaymentInput === 0 ? "" : extraPaymentInput}
                  onChange={(e) => setExtraPaymentInput(Number(e.target.value))}
                  leftIcon={<span className="font-bold text-blue-600">+</span>}
                  placeholder="ระบุจำนวนเงินที่จ่ายเพิ่มได้..."
                  className="text-lg font-black"
                />
              </div>
            </div>

            <div className="flex-1 bg-white p-8 rounded-[40px] shadow-xl shadow-brand-text/5 border border-brand-border flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-50/50 rounded-full -ml-12 -mb-12" />

              <div className="p-4 bg-blue-50 rounded-3xl mb-2">
                <Calendar size={32} className="text-blue-600" />
              </div>

              <div className="flex flex-col">
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mb-1">
                  ระยะเวลาปลดหนี้ทั้งหมด
                </p>
                <h4 className="text-6xl font-black text-brand-text tracking-tighter">
                  {debtTimeline.years} <span className="text-xl font-bold text-brand-muted">ปี</span>
                </h4>
                <p className="text-xs font-bold text-emerald-600 mt-2">
                  ประมาณ {debtTimeline.months} เดือน นับจากนี้
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white p-6 rounded-[32px] border border-brand-border shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xs font-black text-brand-text uppercase tracking-widest">
                  Debt Reduction Forecast
                </h4>
                <p className="text-[10px] font-bold text-brand-muted uppercase">
                  กราฟคาดการณ์การลดลงของหนี้แต่ละรายการ (รายเดือน)
                </p>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={debtTimeline.history}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    {liabilities.map((l, i) => (
                      <linearGradient
                        key={l.id}
                        id={`debt-color-${l.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={AREA_COLORS[i % AREA_COLORS.length]}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={AREA_COLORS[i % AREA_COLORS.length]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(val: number) =>
                      val >= 1_000_000
                        ? `${(val / 1_000_000).toFixed(1)}M`
                        : val >= 1000
                          ? `${(val / 1000).toFixed(0)}k`
                          : String(val)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      fontSize: "11px",
                    }}
                    formatter={(value, name) => {
                      const debt = liabilities.find((l) => l.id === String(name));
                      return [formatCurrency(Number(value ?? 0)), debt ? debt.name : "Total"];
                    }}
                  />
                  {liabilities.map((l, i) => (
                    <Area
                      key={l.id}
                      type="monotone"
                      dataKey={l.id}
                      stackId="1"
                      stroke={AREA_COLORS[i % AREA_COLORS.length]}
                      fill={`url(#debt-color-${l.id})`}
                      strokeWidth={2}
                      animationDuration={800}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
