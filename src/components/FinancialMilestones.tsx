import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Star, ShieldCheck, Zap, Trophy } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { PillarStatus } from '../types';

interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: any;
  isCompleted: boolean;
  color: string;
}

interface FinancialMilestonesProps {
  pillars: PillarStatus[];
  totalWealth: number;
  emergencyMonths: number;
  dti: number;
  savingsTarget: number;
}

export default function FinancialMilestones({ pillars, totalWealth, emergencyMonths, dti, savingsTarget }: FinancialMilestonesProps) {
  const milestones: Milestone[] = [
    {
      id: '1',
      name: 'The Survivor',
      description: 'มีเงินสำรองฉุกเฉินครอบคลุม 3 เดือน',
      icon: Zap,
      isCompleted: emergencyMonths >= 3,
      color: 'text-orange-500'
    },
    {
      id: '2',
      name: 'Debt Warrior',
      description: 'ภาระหนี้ต่อรายได้ (DTI) ต่ำกว่า 35%',
      icon: ShieldCheck,
      isCompleted: dti < 0.35,
      color: 'text-blue-500'
    },
    {
      id: '3',
      name: 'Millionaire Club',
      description: 'มีทรัพย์สินรวมแตะ 1,000,000 บาทแรก',
      icon: Star,
      isCompleted: totalWealth >= 1000000,
      color: 'text-emerald-500'
    },
    {
      id: '4',
      name: 'Financial Mastery',
      description: 'บรรลุเป้าหมายการออมระยะยาว',
      icon: Trophy,
      isCompleted: totalWealth >= savingsTarget,
      color: 'text-purple-500'
    }
  ];

  const completedCount = milestones.filter(m => m.isCompleted).length;

  return (
    <div className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-black text-brand-text uppercase tracking-widest">Financial Roadmap</h3>
          <p className="text-[10px] font-bold text-brand-muted">ด่านความสำเร็จสู่ความมั่งคั่ง</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-black text-brand-text">{completedCount}/{milestones.length}</span>
          <p className="text-[10px] font-bold text-brand-muted uppercase">ด่านที่ผ่านแล้ว</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {milestones.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "p-4 rounded-2xl border transition-all relative overflow-hidden",
                m.isCompleted 
                  ? "bg-brand-surface border-emerald-100 ring-1 ring-emerald-50" 
                  : "bg-white border-brand-border grayscale opacity-60"
              )}
            >
              {m.isCompleted && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                </div>
              )}
              <div className={cn("p-2 rounded-lg w-fit mb-3 bg-white shadow-sm border border-brand-border", m.color)}>
                <Icon size={18} />
              </div>
              <h4 className="text-xs font-black text-brand-text mb-1">{m.name}</h4>
              <p className="text-[10px] font-medium text-brand-muted leading-relaxed">
                {m.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
