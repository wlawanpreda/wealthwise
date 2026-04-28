/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ShieldCheck, TrendingUp, CreditCard, PiggyBank, HeartPulse } from 'lucide-react';
import { PillarStatus } from '../types';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';

const iconMap = {
  'สภาพคล่อง': TrendingUp,
  'หนี้สิน': CreditCard,
  'ความมั่งคั่ง': PiggyBank,
  'การประกันความเสี่ยง': ShieldCheck,
};

interface PillarCardProps {
  pillar: PillarStatus;
}

export default function PillarCard({ pillar }: PillarCardProps) {
  const Icon = iconMap[pillar.name as keyof typeof iconMap] || HeartPulse;
  
  const statusConfig = {
    Healthy: { text: 'text-emerald-600', bg: 'bg-emerald-500/10', iconColor: '#10b981', ring: 'ring-emerald-500/20' },
    Warning: { text: 'text-orange-600', bg: 'bg-orange-500/10', iconColor: '#f59e0b', ring: 'ring-orange-500/20' },
    Critical: { text: 'text-red-600', bg: 'bg-red-500/10', iconColor: '#ef4444', ring: 'ring-red-500/20' },
  };

  const config = statusConfig[pillar.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="h-full"
    >
      <Card variant="white" padding="none" className="flex flex-col h-full overflow-hidden border-brand-border hover:border-blue-600/30 transition-all duration-500 hover:shadow-xl group">
        <div className="p-5 flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center ring-4 transition-all duration-500 group-hover:scale-110", config.bg, config.ring)}>
              <Icon size={18} stroke={config.iconColor} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-end">
              <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-1", config.text)}>
                {pillar.status}
              </span>
              <div className="flex gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={cn("w-3 h-1 rounded-full px-1", 
                    pillar.status === 'Healthy' ? "bg-emerald-500" : 
                    pillar.status === 'Warning' && i < 2 ? "bg-orange-500" :
                    pillar.status === 'Critical' && i < 1 ? "bg-red-500" : "bg-slate-200"
                  )} />
                ))}
              </div>
            </div>
          </div>

          <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-muted mb-1 leading-none">{pillar.name} Module</h4>
          <div className={cn("text-3xl font-black font-mono tracking-tighter mb-4", config.text)}>
            {Math.round(pillar.score)}<span className="text-xs ml-1 opacity-50 uppercase">pts</span>
          </div>

          <div className="mt-auto pt-4 border-t border-brand-border/40">
            <p className="text-[10px] font-bold text-brand-text leading-relaxed line-clamp-2 min-h-[2.5em] group-hover:line-clamp-none transition-all">
              {pillar.insight}
            </p>
          </div>
        </div>
        
        {/* Module ID Tag */}
        <div className="bg-brand-surface border-t border-brand-border px-5 py-2 flex justify-between items-center opacity-50 group-hover:opacity-100 transition-opacity">
          <span className="text-[8px] font-mono uppercase tracking-widest leading-none">ARC-MOD-{(pillar.name.charCodeAt(0) % 100).toString().padStart(3, '0')}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-brand-border group-hover:bg-blue-600 transition-colors" />
        </div>
      </Card>
    </motion.div>
  );
}
