"use client";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  {
    variants: {
      variant: {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-95",
        secondary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-95",
        outline:
          "bg-white text-brand-text border border-brand-border hover:bg-brand-surface active:scale-95",
        ghost:
          "bg-transparent text-brand-muted hover:text-brand-text hover:bg-brand-surface active:scale-95",
        danger: "bg-red-50 text-red-600 hover:bg-red-100 active:scale-95",
        surface:
          "bg-brand-surface text-brand-text border border-brand-border hover:bg-white active:scale-95 shadow-sm",
      },
      size: {
        xs: "px-2 py-1 text-[10px] rounded-lg",
        sm: "px-3 py-1.5 text-xs rounded-xl",
        md: "px-4 py-2 text-sm rounded-xl",
        lg: "px-6 py-3 text-base rounded-2xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, asChild, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={loading || disabled}
        {...props}
      >
        {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";
