"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  variant?: "default" | "ghost";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      leftIcon,
      rightIcon,
      containerClassName,
      variant = "default",
      id,
      ...props
    },
    ref,
  ) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[10px] font-black text-brand-muted uppercase tracking-widest pl-1"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-text transition-colors">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full rounded-xl px-3 py-2 text-xs font-bold outline-none transition-all",
              variant === "default" &&
                "bg-brand-surface border border-brand-border focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600/30",
              variant === "ghost" && "bg-transparent border-transparent focus:bg-brand-surface/50",
              "placeholder:text-brand-muted/50",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              error && "border-red-200 bg-red-50/30 focus:ring-red-500/10 focus:border-red-500/30",
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-[10px] text-red-500 font-bold pl-1">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
