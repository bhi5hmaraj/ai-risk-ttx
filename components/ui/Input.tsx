import * as React from 'react';
import { cn } from '@/lib/ui/cn';

type Props = React.InputHTMLAttributes<HTMLInputElement> & { iconLeft?: React.ReactNode };

export function Input({ className, iconLeft, ...props }: Props) {
  return (
    <div className={cn('relative w-full', iconLeft && 'pl-8')}>
      {iconLeft && <div className="absolute inset-y-0 left-2 flex items-center text-muted">{iconLeft}</div>}
      <input
        className={cn(
          'w-full h-10 rounded-md border border-border bg-panel text-text placeholder:text-muted',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong',
          iconLeft && 'pl-7',
          className,
        )}
        {...props}
      />
    </div>
  );
}

