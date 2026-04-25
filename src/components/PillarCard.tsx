/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ShieldCheck, AlertTriangle, XCircle, TrendingUp, CreditCard, PiggyBank, HeartPulse } from 'lucide-react';
import { PillarStatus } from '../types';
import { cn } from '../lib/utils';

const iconMap = {
  'สภาพคล่อง': TrendingUp,
  'หนี้สิน': CreditCard,
  'ความมั่งคั่ง': PiggyBank,
  'การประกันความเสี่ยง': ShieldCheck,
};

interface PillarCardProps {
  pillar: PillarStatus;
  key?: string | number;
}

export default function PillarCard({ pillar }: PillarCardProps) {
  const Icon = iconMap[pillar.name as keyof typeof iconMap] || HeartPulse;
  
  const statusConfig = {
    Healthy: { text: 'text-[#16A34A]', bg: 'bg-green-100', iconColor: '#16A34A' },
    Warning: { text: 'text-amber-600', bg: 'bg-amber-100', iconColor: '#D97706' },
    Critical: { text: 'text-[#DC2626]', bg: 'bg-red-100', iconColor: '#DC2626' },
  };

  const config = statusConfig[pillar.status];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-brand-surface p-5 border border-brand-border rounded-2xl flex flex-col h-full shadow-sm"
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-4 transition-colors", config.bg)}>
        <Icon size={16} stroke={config.iconColor} strokeWidth={2.5} />
      </div>
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-muted mb-2">สถานะ {pillar.name}</h4>
      <div className={cn("text-xl font-black transition-colors mb-1", config.text)}>
        {Math.round(pillar.score)}%
      </div>
      <p className={cn("text-[11px] font-bold mb-2", config.text)}>
        {pillar.status === 'Healthy' ? 'มีประสิทธิภาพ' : pillar.status === 'Warning' ? 'ควรเฝ้าระวัง' : 'วิกฤต'}
      </p>
      <p className="text-[10px] font-medium text-brand-secondary mt-auto pt-4 leading-relaxed">
        {pillar.insight}
      </p>
    </motion.div>
  );
}
