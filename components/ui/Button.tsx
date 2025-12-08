import * as React from 'react';
import { cn } from '@/lib/ui/cn';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 rounded-md';
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base',
  } as const;
  const variants = {
    primary: 'bg-accent text-black hover:bg-accent-strong',
    ghost: 'bg-transparent text-text hover:bg-accent-soft',
    outline: 'bg-transparent text-text border border-border hover:border-accent',
    danger: 'bg-danger text-white hover:opacity-90',
  } as const;
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />;
}

