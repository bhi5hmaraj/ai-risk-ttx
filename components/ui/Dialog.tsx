import * as React from 'react';
import { cn } from '@/lib/ui/cn';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function Dialog({ open, onClose, title, children }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={cn('relative z-10 w-full max-w-lg rounded-md border border-border bg-card p-4 shadow-xl')}>
        {title && <h3 className="mb-2 text-base font-semibold text-text">{title}</h3>}
        <div>{children}</div>
      </div>
    </div>
  );
}

