/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { useFinancial } from '../context/FinancialContext';

export default function WealthProgress() {
  const { totalWealth, savingsTarget, reserveAmount } = useFinancial();

  const percentage = Math.min(100, (totalWealth / (savingsTarget || 1)) * 100);
  const remaining = Math.max(0, savingsTarget - totalWealth);
  const monthsToGoal = reserveAmount > 0 ? Math.ceil(remaining / reserveAmount) : Infinity;
  
  return (
    <header className="flex flex-col bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-brand-border shadow-soft gap-6 md:gap-10 relative overflow-hidden group">
      {/* Blueprint Grid Background */}
      <div className="absolute inset-0 blueprint-grid opacity-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/5 rounded-full blur-[60px] md:blur-[100px] -mr-32 md:-mr-64 -mt-32 md:-mt-64 pointer-events-none" />
      
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 md:gap-10 relative z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
             <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
             <p className="text-[9px] md:text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] leading-none">Financial Blueprint Target</p>
          </div>
          <h2 className="text-3xl md:text-6xl font-black tracking-tighter text-brand-text flex items-baseline gap-1 md:gap-2">
            <span className="font-mono">{formatCurrency(savingsTarget).replace('฿', '')}</span>
            <span className="text-sm md:text-xl font-bold text-brand-secondary">THB</span>
          </h2>
        </div>
        
        <div className="flex flex-row items-center gap-4 sm:gap-8 xl:gap-12 flex-wrap md:flex-nowrap">
          <div className="flex flex-col min-w-[120px]">
             <p className="text-[9px] md:text-[10px] font-black text-brand-muted uppercase tracking-widest leading-none mb-2">Current Wealth</p>
             <p className="text-xl md:text-3xl font-black text-blue-600 font-mono tracking-tight">{formatCurrency(totalWealth)}</p>
          </div>
          <div className="h-10 md:h-12 w-px bg-brand-border hidden sm:block" />
          <div className="flex flex-col items-start md:items-end">
             <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-emerald-50 text-emerald-700 text-[9px] md:text-[10px] font-black rounded-lg uppercase tracking-wider">{percentage.toFixed(1)}% Accured</span>
             </div>
             {remaining > 0 && (
                <p className="text-[10px] md:text-[11px] font-bold text-brand-muted uppercase tracking-wider">Gap: <span className="text-orange-600">{formatCurrency(remaining)}</span></p>
             )}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-6">
        <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden p-1 border border-brand-border/30">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-blue-600 rounded-full relative shadow-blue"
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
          </motion.div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-brand-bg rounded-xl border border-brand-border/50">
             <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
             <p className="text-[11px] font-medium text-brand-text">
               Target ETA: <span className="font-bold underline decoration-blue-600/30 underline-offset-4">
                 {monthsToGoal === Infinity ? 'Calculation Pending' : `${(monthsToGoal / 12).toFixed(1)} Years`}
               </span>
             </p>
          </div>
          
          <div className="flex items-center gap-1.5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
             <div className="flex gap-1">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className={cn("w-1 h-3 rounded-full", i < (percentage / 20) ? "bg-blue-600" : "bg-slate-300")} />
               ))}
             </div>
             <p className="text-[10px] font-black text-brand-muted tracking-[0.2em] uppercase">Projected Phase {Math.min(5, Math.floor(percentage / 20) + 1)}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
