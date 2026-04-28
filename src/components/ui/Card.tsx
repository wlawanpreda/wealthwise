import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'surface' | 'ghost' | 'dark' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = ({ 
  className, 
  variant = 'white', 
  padding = 'md', 
  children, 
  ...props 
}: CardProps) => {
  const variants = {
    white: 'bg-white border border-brand-border shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06),0_4px_6px_-1px_rgba(0,0,0,0.1)]',
    surface: 'bg-brand-surface border border-brand-border shadow-sm',
    ghost: 'bg-transparent border border-dashed border-brand-border',
    dark: 'bg-brand-text text-white border border-brand-border shadow-soft',
    glass: 'bg-white/70 backdrop-blur-xl border border-white/40 shadow-soft',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div 
      className={cn(
        'rounded-3xl transition-all duration-300',
        variants[variant],
        paddings[padding],
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
};
