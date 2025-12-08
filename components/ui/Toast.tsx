import * as React from 'react';
import { cn } from '@/lib/ui/cn';

type ToastProps = {
  message: string;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'accent';
};

export function Toast({ message, tone = 'default' }: ToastProps) {
  const base = 'fixed bottom-4 right-4 z-50 rounded-md border bg-card px-4 py-2 shadow-lg';
  const tones = {
    default: 'border-border text-text',
    success: 'border-green-700/50 text-green-200',
    danger: 'border-red-700/50 text-red-200',
    warning: 'border-amber-700/50 text-amber-200',
    accent: 'border-accent-strong/40 text-accent-strong',
  } as const;
  return <div className={cn(base, tones[tone])}>{message}</div>;
}

