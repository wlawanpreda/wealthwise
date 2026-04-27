/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import { useFinancial } from '../context/FinancialContext';

export default function WealthProgress() {
  const { totalWealth, savingsTarget, reserveAmount } = useFinancial();

  const percentage = Math.min(100, (totalWealth / (savingsTarget || 1)) * 100);
  const remaining = Math.max(0, savingsTarget - totalWealth);
  const monthsToGoal = reserveAmount > 0 ? Math.ceil(remaining / reserveAmount) : Infinity;
  
  return (
    <header className="flex flex-col bg-white p-8 rounded-3xl border border-brand-border shadow-sm gap-8 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-surface rounded-full -mr-32 -mt-32 opacity-50 z-0" />
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div className="flex flex-col">
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mb-2 leading-none">เป้าหมายเงินออมระยะยาว</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-brand-text">
            {formatCurrency(savingsTarget).replace('฿', '')} <span className="text-xl font-bold text-brand-secondary">บาท</span>
          </h2>
        </div>
        
        <div className="flex flex-col items-start md:items-end w-full md:w-auto">
          <div className="flex items-center gap-2 mb-2 text-[10px] font-bold">
            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">สะสมแล้ว {percentage.toFixed(1)}%</span>
            {remaining > 0 && (
               <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-full animate-bounce">ขาดอีก {formatCurrency(remaining)}</span>
            )}
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest leading-none">ความมั่งคั่งปัจจุบัน</p>
             <p className="text-2xl font-black text-brand-text">{formatCurrency(totalWealth)}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Progress</p>
          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-none">Target Remaining</p>
        </div>
        <div className="h-4 w-full bg-brand-surface rounded-full overflow-hidden border border-brand-border/50 shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 relative"
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px]" />
          </motion.div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             <p className="text-[11px] font-bold text-brand-text">
               {remaining > 0 
                ? `คาดว่าจะบรรลุเป้าหมายในอีก ${monthsToGoal === Infinity ? '...' : (monthsToGoal / 12).toFixed(1)} ปี` 
                : 'ยินดีด้วย! คุณบรรลุเป้าหมายแล้ว'}
             </p>
          </div>
          <p className="text-[11px] font-black text-brand-muted tracking-widest">{percentage.toFixed(1)}% COMPLETED</p>
        </div>
      </div>
    </header>
  );
}
