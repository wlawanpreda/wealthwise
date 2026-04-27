import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'surface' | 'ghost' | 'dark';
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
    white: 'bg-white border border-brand-border shadow-sm',
    surface: 'bg-brand-surface border border-brand-border shadow-sm',
    ghost: 'bg-transparent border border-dashed border-brand-border',
    dark: 'bg-brand-text text-white border border-brand-border shadow-sm',
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
        'rounded-3xl transition-all',
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
