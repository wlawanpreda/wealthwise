import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Star, ShieldCheck, Zap, Trophy, PiggyBank, TrendingUp } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useFinancial } from '../context/FinancialContext';
import { Card } from './ui/Card';

interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: any;
  isCompleted: boolean;
  color: string;
}

export default function FinancialMilestones() {
  const { totalWealth, emergencyMonths, dti, savingsTarget, savingsRate } = useFinancial();

  const milestones: Milestone[] = [
    {
      id: '0',
      name: 'Safety First',
      description: 'มีเงินสำรองพื้นฐาน 1 เดือน',
      icon: ShieldCheck,
      isCompleted: emergencyMonths >= 1,
      color: 'text-blue-400'
    },
    {
      id: '1',
      name: 'The Survivor',
      description: 'มีเงินสำรองฉุกเฉินครอบคลุม 3 เดือน',
      icon: Zap,
      isCompleted: emergencyMonths >= 3,
      color: 'text-orange-500'
    },
    {
      id: '1.5',
      name: 'Fortress',
      description: 'เงินสำรองแกร่งครอบคลุม 6 เดือน',
      icon: ShieldCheck,
      isCompleted: emergencyMonths >= 6,
      color: 'text-emerald-600'
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
      id: '2.5',
      name: 'Debt Free Spirit',
      description: 'ภาระหนี้ต่อรายได้ (DTI) ต่ำกว่า 15%',
      icon: CheckCircle2,
      isCompleted: dti < 0.15,
      color: 'text-emerald-500'
    },
    {
      id: 'saver-1',
      name: 'Saver Spirit',
      description: 'ออมเงินได้มากกว่า 15% ของรายได้',
      icon: PiggyBank,
      isCompleted: savingsRate >= 15,
      color: 'text-blue-600'
    },
    {
      id: 'saver-2',
      name: 'Wealth Accelerator',
      description: 'ออมเงินได้มากกว่า 30% ของรายได้',
      icon: TrendingUp,
      isCompleted: savingsRate >= 30,
      color: 'text-purple-600'
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

  const nextMilestone = milestones.find(m => !m.isCompleted);
  const completedCount = milestones.filter(m => m.isCompleted).length;

  return (
    <Card padding="md">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {milestones.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "p-4 rounded-3xl border transition-all relative overflow-hidden",
                m.isCompleted 
                  ? "bg-brand-surface border-emerald-100 ring-4 ring-emerald-50/30" 
                  : "bg-white border-brand-border grayscale opacity-40 hover:opacity-100 hover:grayscale-0"
              )}
            >
              {m.isCompleted && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                </div>
              )}
              <div className={cn("p-2 rounded-lg w-fit mb-3 bg-white shadow-sm border border-brand-border", m.color)}>
                <Icon size={16} />
              </div>
              <h4 className="text-[11px] font-black text-brand-text mb-1 uppercase tracking-tight">{m.name}</h4>
              <p className="text-[9px] font-bold text-brand-muted leading-tight">
                {m.description}
              </p>
            </motion.div>
          );
        })}
      </div>

      {nextMilestone && (
        <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border flex items-center gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-brand-border">
            <Zap className="text-blue-600 w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black text-brand-text uppercase tracking-widest">Next Goal: {nextMilestone.name}</h4>
            <p className="text-[10px] text-brand-muted font-bold mt-0.5">
              {nextMilestone.id === '0' || nextMilestone.id === '1' || nextMilestone.id === '1.5' 
                ? 'เน้นเก็บเงินสำรองฉุกเฉินให้ได้ตามเป้าหมาย เพื่อความมั่นคงสูงสุด' 
                : nextMilestone.id === '2' || nextMilestone.id === '2.5'
                ? 'โฟกัสการลดภาระหนี้ เพื่อเพิ่มสภาพคล่องในแต่ละเดือน'
                : nextMilestone.id.startsWith('saver')
                ? 'ปรับปรุงการจัดสรรงบประมาณเพื่อเพิ่มอัตราการออมและลงทุน'
                : 'ขยายพอร์ตการลงทุนอย่างสม่ำเสมอเพื่อเป้าหมายระยะยาว'}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-brand-muted uppercase">สถานะ</span>
            <span className="text-[10px] font-black text-blue-600 uppercase">กำลังดำเนินการ</span>
          </div>
        </div>
      )}
    </Card>
  );
}
