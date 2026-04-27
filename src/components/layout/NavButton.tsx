import React from 'react';
import { cn } from '../../lib/utils';

interface NavButtonProps {
  icon: any;
  active: boolean;
  label: string;
  onClick: () => void;
  mobile?: boolean;
}

export const NavButton = ({ icon: Icon, active, label, onClick, mobile }: NavButtonProps) => {
  if (mobile) {
    return (
      <button 
        onClick={onClick}
        className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[64px]",
          active ? "text-blue-700" : "text-brand-muted"
        )}
      >
        <Icon size={20} className={active ? "text-blue-600" : "text-brand-secondary"} />
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        {active && <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />}
      </button>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all",
        active 
          ? "bg-brand-bg text-blue-700 shadow-sm" 
          : "text-brand-muted hover:bg-brand-surface hover:text-brand-text"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-blue-600" : "text-brand-secondary")} />
      {label}
    </button>
  );
};
