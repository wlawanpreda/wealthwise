import React from 'react';
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
  return (
    <Card padding="md">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-bold text-brand-muted">{label} ({targetLabel})</h3>
        <span className={cn("text-[10px] font-bold px-2 py-1 rounded leading-none", statusColor)}>
          {status}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold">{formatCurrency(value).replace('฿', '')}</div>
        <div className="text-xs font-medium text-brand-secondary">/ {formatCurrency(limit).replace('฿', '')}</div>
      </div>
      <p className="text-[11px] text-brand-muted mt-2">{description}</p>
    </Card>
  );
};
