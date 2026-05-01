import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

const cardVariants = cva("rounded-3xl transition-all duration-300", {
  variants: {
    variant: {
      white:
        "bg-white border border-brand-border shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06),0_4px_6px_-1px_rgba(0,0,0,0.1)]",
      surface: "bg-brand-surface border border-brand-border shadow-sm",
      ghost: "bg-transparent border border-dashed border-brand-border",
      dark: "bg-brand-text text-white border border-brand-border shadow-[var(--shadow-soft)]",
      glass: "bg-white/70 backdrop-blur-xl border border-white/40 shadow-[var(--shadow-soft)]",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: { variant: "white", padding: "md" },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding }), className)} {...props} />
  ),
);
Card.displayName = "Card";
