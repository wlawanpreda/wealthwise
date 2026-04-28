import React from 'react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { Card } from './Card';

interface CSRCardProps {
  label: string;
  value: number;
  limit: number;
  targetLabel: string;
  status: string;
  statusColor: string;
  description: string;
}

export const CSRCard = ({ label, value, limit, targetLabel, status, statusColor, description }: CSRCardProps) => {
  const percentage = (value / limit) * 100;
  
  return (
    <Card padding="none" className="overflow-hidden border-brand-border h-full flex flex-col group">
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted leading-none mb-1">{label}</h3>
            <p className="text-[10px] font-bold text-brand-secondary opacity-60">Architectural Limit: {targetLabel}</p>
          </div>
          <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border shadow-sm transition-all duration-300", 
            statusColor.includes('green') || statusColor.includes('emerald') ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
            statusColor.includes('blue') ? "bg-blue-50 text-blue-700 border-blue-100" :
            statusColor.includes('orange') ? "bg-orange-50 text-orange-700 border-orange-100" :
            "bg-red-50 text-red-700 border-red-100"
          )}>
            {status}
          </span>
        </div>
        
        <div className="flex items-baseline gap-1.5 mb-4">
          <div className="text-2xl font-black font-mono tracking-tighter text-brand-text">{formatCurrency(value).replace('฿', '')}</div>
          <div className="text-[10px] font-bold text-brand-secondary">/ {formatCurrency(limit).replace('฿', '')} THB</div>
        </div>
        
        <div className="h-1 w-full bg-brand-bg rounded-full overflow-hidden mb-2 relative">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, percentage)}%` }}
            className={cn("h-full rounded-full transition-all duration-1000", 
              percentage > 100 ? "bg-red-500" : 
              percentage > 85 ? "bg-orange-500" : "bg-blue-600"
            )}
          />
        </div>
        
        <p className="text-[10px] font-bold text-brand-muted leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">{description}</p>
      </div>
      
      {/* Capacity Indicator */}
      <div className="bg-brand-surface border-t border-brand-border px-5 py-2 flex justify-between items-center bg-brand-bg/10">
        <span className="text-[8px] font-mono uppercase tracking-widest text-brand-muted">Capacity Usage</span>
        <span className={cn("text-[9px] font-black font-mono", percentage > 100 ? "text-red-600" : "text-brand-text")}>
          {percentage.toFixed(1)}%
        </span>
      </div>
    </Card>
  );
};
