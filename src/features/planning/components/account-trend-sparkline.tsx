"use client";

import type { Transaction } from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";
import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { reconstructBalanceHistory } from "../lib/balance-history";

interface Props {
  amount: number;
  transactions: Transaction[];
  trend?: "up" | "down" | "flat";
}

const TREND_COLORS = {
  up: "#10b981",
  down: "#f97316",
  flat: "#64748b",
} as const;

/**
 * Tiny balance sparkline derived from the transaction log. Renders nothing
 * when there aren't at least two points to plot — a single dot is not a
 * trend.
 */
export function AccountTrendSparkline({ amount, transactions, trend = "flat" }: Props) {
  // All hooks must run unconditionally on every render — keep them above any
  // early return so React's hook order stays stable. Returning null after
  // calling useId/useMemo would crash with "Rendered more hooks than during
  // the previous render" the next time data crosses the 2-point threshold.
  const data = React.useMemo(
    () => reconstructBalanceHistory(amount, transactions),
    [amount, transactions],
  );
  const gradientId = React.useId();

  if (data.length < 2) return null;

  const color = TREND_COLORS[trend];

  return (
    <div className="h-12 w-full -mx-1" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            wrapperStyle={{ outline: "none" }}
            contentStyle={{
              borderRadius: "10px",
              border: "none",
              boxShadow: "0 8px 16px -4px rgb(15 23 42 / 0.18)",
              fontSize: "10px",
              padding: "6px 8px",
            }}
            labelFormatter={(ts) => new Date(Number(ts)).toLocaleDateString("th-TH")}
            formatter={(value) => [formatCurrency(Number(value ?? 0)), "ยอดคงเหลือ"]}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
