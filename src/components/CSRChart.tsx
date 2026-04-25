/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CSRBreakdown, CSRCategory } from '../types';
import { CSR_TARGETS, USER_INCOME } from '../constants';
import { formatCurrency } from '../lib/utils';

const COLORS = {
  [CSRCategory.CONSTANT]: '#344054', // Dark Slate
  [CSRCategory.SPENDING]: '#2563EB', // Blue 600
  [CSRCategory.RESERVE]: '#10B981',  // Emerald 500
};

const LABEL_MAP = {
  [CSRCategory.CONSTANT]: 'คงที่ (Constant)',
  [CSRCategory.SPENDING]: 'ใช้จ่าย (Spending)',
  [CSRCategory.RESERVE]: 'สำรอง (Reserve)',
};

export default function CSRChart({ actual, income }: { actual: CSRBreakdown; income: number }) {
  const data = Object.entries(actual).map(([name, value]) => ({
    name: LABEL_MAP[name as CSRCategory] || name,
    value,
    target: CSR_TARGETS[name as CSRCategory] * income,
  }));

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
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[Object.keys(LABEL_MAP).find(key => LABEL_MAP[key as CSRCategory] === entry.name) as CSRCategory]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #EAECF0', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '11px',
              fontFamily: 'Inter'
            }}
            itemStyle={{ fontWeight: 'bold' }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
