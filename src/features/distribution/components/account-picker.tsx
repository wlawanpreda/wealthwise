"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FinancialAccount } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  Banknote,
  Briefcase,
  Check,
  ChevronDown,
  CreditCard,
  PiggyBank,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";

interface AccountPickerProps {
  value: string;
  onChange: (id: string) => void;
  accounts: FinancialAccount[];
  disabled?: boolean;
}

function accountIcon(type: FinancialAccount["type"]) {
  switch (type) {
    case "Savings":
      return <PiggyBank size={16} />;
    case "Investment":
      return <TrendingUp size={16} />;
    case "Fixed":
      return <CreditCard size={16} />;
    case "Other":
      return <Briefcase size={16} />;
    default:
      return <Banknote size={16} />;
  }
}

export function AccountPicker({ value, onChange, accounts, disabled }: AccountPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const selected = accounts.find((a) => a.id === value);

  const filtered = React.useMemo(() => {
    if (!search) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(q) || a.purpose.toLowerCase().includes(q),
    );
  }, [accounts, search]);

  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full md:w-48 h-10 px-3 flex items-center justify-between rounded-xl border transition-all duration-300 text-left",
            open
              ? "border-blue-600 ring-2 ring-blue-500/10 bg-white"
              : "border-brand-border bg-brand-bg hover:bg-white hover:border-blue-300",
            disabled && "opacity-50 cursor-not-allowed grayscale",
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div
              className={cn(
                "w-5 h-5 rounded-lg flex items-center justify-center shrink-0",
                selected ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400",
              )}
            >
              {selected ? accountIcon(selected.type) : <Banknote size={12} />}
            </div>
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-wider truncate",
                selected ? "text-brand-text" : "text-brand-muted",
              )}
            >
              {selected ? selected.name : "Select Account..."}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={cn(
              "text-brand-secondary transition-transform duration-300",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent className="p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col"
        >
          <div className="p-3 border-b border-brand-border bg-slate-50">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"
              />
              <input
                type="text"
                ref={(el) => {
                  // Focus on open without triggering noAutofocus a11y rule
                  el?.focus();
                }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search accounts..."
                className="w-full bg-white border border-brand-border rounded-lg pl-9 pr-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="p-10 text-center flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <Search size={20} />
                </div>
                <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                  No accounts found
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-500 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
                <X size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Unmap Account
                </span>
              </div>
            </button>

            <div className="h-px bg-brand-border/30 my-1 mx-2" />

            {filtered.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  onChange(acc.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                  value === acc.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                    value === acc.id
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-600 group-hover:scale-110",
                  )}
                >
                  {accountIcon(acc.type)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">
                    {acc.name}
                  </span>
                  {acc.purpose && (
                    <span className="text-[8px] font-bold text-brand-secondary uppercase tracking-widest truncate opacity-70">
                      {acc.purpose}
                    </span>
                  )}
                </div>
                {value === acc.id && (
                  <div className="ml-auto">
                    <Check size={14} className="text-blue-600" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
