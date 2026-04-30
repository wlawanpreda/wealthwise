"use client";

import { type CSRCategory, CSR_CATEGORY } from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";
import { useDerivedFinancials } from "@/stores/financial-store";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS: Record<CSRCategory, string> = {
  [CSR_CATEGORY.CONSTANT]: "#1e293b",
  [CSR_CATEGORY.SPENDING]: "#3b82f6",
  [CSR_CATEGORY.RESERVE]: "#10b981",
};

const LABELS: Record<CSRCategory, string> = {
  [CSR_CATEGORY.CONSTANT]: "คงที่",
  [CSR_CATEGORY.SPENDING]: "ใช้จ่าย",
  [CSR_CATEGORY.RESERVE]: "สำรอง",
};

export function CSRChart() {
  const { constantAmount, spendingAmount, reserveAmount } = useDerivedFinancials();

  const data = [
    { name: LABELS[CSR_CATEGORY.CONSTANT], value: constantAmount, category: CSR_CATEGORY.CONSTANT },
    { name: LABELS[CSR_CATEGORY.SPENDING], value: spendingAmount, category: CSR_CATEGORY.SPENDING },
    { name: LABELS[CSR_CATEGORY.RESERVE], value: reserveAmount, category: CSR_CATEGORY.RESERVE },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-[10px] text-brand-muted uppercase font-bold tracking-widest">
        ยังไม่มีข้อมูลการจัดสรร
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.category} fill={COLORS[entry.category]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "20px",
              border: "none",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              fontSize: "11px",
              fontFamily: "inherit",
            }}
            formatter={(val) => [formatCurrency(Number(val ?? 0)), "Amount"]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
