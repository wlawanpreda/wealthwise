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
    Healthy: { text: 'text-emerald-600', bg: 'bg-emerald-50', iconColor: '#059669' },
    Warning: { text: 'text-orange-600', bg: 'bg-orange-50', iconColor: '#d97706' },
    Critical: { text: 'text-red-600', bg: 'bg-red-50', iconColor: '#dc2626' },
  };

  const config = statusConfig[pillar.status];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card variant="surface" padding="md" className="flex flex-col h-full hover:border-brand-text/10 duration-300">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-colors shadow-sm", config.bg)}>
          <Icon size={18} stroke={config.iconColor} strokeWidth={2.5} />
        </div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-muted mb-2">เสาหลัก {pillar.name}</h4>
        <div className={cn("text-2xl font-black transition-colors mb-1", config.text)}>
          {Math.round(pillar.score)}%
        </div>
        <p className={cn("text-[10px] font-black uppercase tracking-widest mb-3", config.text)}>
          {pillar.status === 'Healthy' ? 'ยอดเยี่ยม' : pillar.status === 'Warning' ? 'ควรเฝ้าระวัง' : 'ต้องแก้ไข'}
        </p>
        <p className="text-[10px] font-bold text-brand-muted mt-auto pt-4 border-t border-brand-border/50 leading-relaxed">
          {pillar.insight}
        </p>
      </Card>
    </motion.div>
  );
}
