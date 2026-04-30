"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface NavButtonProps {
  icon: LucideIcon;
  active: boolean;
  label: string;
  onClick: () => void;
  mobile?: boolean;
}

export function NavButton({ icon: Icon, active, label, onClick, mobile }: NavButtonProps) {
  if (mobile) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[64px]",
          active ? "text-blue-700" : "text-brand-muted",
        )}
      >
        <div
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            active ? "bg-blue-50" : "bg-transparent",
          )}
        >
          <Icon size={20} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13px] font-black uppercase tracking-[0.1em] transition-all relative group",
        active
          ? "text-blue-700 bg-brand-surface border border-brand-border/50 shadow-[var(--shadow-soft)]"
          : "text-brand-muted hover:text-brand-text",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          active
            ? "bg-blue-600 text-white shadow-[var(--shadow-blue)]"
            : "bg-brand-surface text-brand-secondary group-hover:text-brand-text",
        )}
      >
        <Icon size={16} />
      </div>
      {label}
      {active && (
        <motion.div
          layoutId="nav-glow"
          className="absolute left-0 w-1 h-4 bg-blue-600 rounded-r-full"
        />
      )}
    </button>
  );
}
