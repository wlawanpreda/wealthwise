"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, containerClassName, children, id, ...props }, ref) => {
    const reactId = React.useId();
    const selectId = id ?? reactId;
    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-[10px] font-black text-brand-muted uppercase tracking-widest pl-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs font-bold outline-none transition-all cursor-pointer appearance-none",
              "focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600/30",
              error && "border-red-200 bg-red-50/30",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-muted">
            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
        {error && <p className="text-[10px] text-red-500 font-bold pl-1">{error}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";
