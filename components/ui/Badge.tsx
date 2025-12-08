import * as React from 'react';
import { cn } from '@/lib/ui/cn';

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'accent';
};

export function Badge({ className, tone = 'default', ...props }: Props) {
  const tones = {
    default: 'bg-accent-soft text-text border border-border',
    success: 'bg-green-900/20 text-green-300 border border-green-700/40',
    danger: 'bg-red-900/20 text-red-300 border border-red-700/40',
    warning: 'bg-amber-900/20 text-amber-300 border border-amber-700/40',
    accent: 'bg-accent-soft text-accent-strong border border-accent-strong/30',
  } as const;
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs', tones[tone], className)} {...props} />;
}

