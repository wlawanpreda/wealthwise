/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CSRCategory } from '../types';
import { formatCurrency } from '../lib/utils';
import { useFinancial } from '../context/FinancialContext';

const COLORS = {
  [CSRCategory.CONSTANT]: '#1e293b', // Dark Slate
  [CSRCategory.SPENDING]: '#3b82f6', // Blue 500
  [CSRCategory.RESERVE]: '#10b981',  // Emerald 500
};

const LABEL_MAP = {
  [CSRCategory.CONSTANT]: 'คงที่',
  [CSRCategory.SPENDING]: 'ใช้จ่าย',
  [CSRCategory.RESERVE]: 'สำรอง',
};

export default function CSRChart() {
  const { constantAmount, spendingAmount, reserveAmount } = useFinancial();

  const data = [
    { name: LABEL_MAP[CSRCategory.CONSTANT], value: constantAmount, category: CSRCategory.CONSTANT },
    { name: LABEL_MAP[CSRCategory.SPENDING], value: spendingAmount, category: CSRCategory.SPENDING },
    { name: LABEL_MAP[CSRCategory.RESERVE], value: reserveAmount, category: CSRCategory.RESERVE },
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return <div className="h-[240px] flex items-center justify-center text-[10px] text-brand-muted uppercase font-bold tracking-widest">ยังไม่มีข้อมูลการจัดสรร</div>;
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
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.category]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              borderRadius: '20px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '11px',
              fontFamily: 'inherit'
            }}
            formatter={(val: number) => [formatCurrency(val), 'Amount']}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
