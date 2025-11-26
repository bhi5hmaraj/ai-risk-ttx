import React, { useEffect, useRef, useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, className = '', children }) => {
  const [open, setOpen] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // Prefer capability detection over touch flags to avoid false positives on hybrid laptops
    const mq = typeof window !== 'undefined' ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
    const compute = () => setIsTouch(!(mq?.matches ?? false));
    compute();
    if (mq?.addEventListener) {
      mq.addEventListener('change', compute);
      return () => mq.removeEventListener('change', compute);
    }
    return () => {};
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent | TouchEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className={`relative inline-block group ${className}`}
      onMouseEnter={() => !isTouch && setOpen(true)}
      onMouseLeave={() => !isTouch && setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}
      role="button"
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      {children}

      {/* Desktop hover / anchored popover */}
      <span
        className={`absolute z-50 left-1/2 -translate-x-1/2 -top-2 translate-y-[-100%] min-w-[260px] max-w-[40rem] ${
          isTouch ? 'hidden' : 'hidden group-hover:block'
        } ${open && !isTouch ? '!block' : ''}`}
        role="tooltip"
      >
        <span className="block rounded-md border border-gray-700 bg-gray-900/80 backdrop-blur-sm shadow-xl p-3 text-xs text-gray-200 ring-1 ring-white/10 max-h-96 overflow-auto whitespace-pre-wrap break-words">
          {content}
        </span>
      </span>

      {/* Mobile tap: bottom-centered floating card with backdrop click-to-close */}
      {isTouch && open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/30"
            aria-hidden
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
          />
          <div className="fixed z-[61] left-1/2 -translate-x-1/2 bottom-24 w-[92vw] max-w-sm" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <div className="rounded-lg border border-gray-700 bg-gray-900/85 backdrop-blur-md shadow-2xl p-3 text-xs text-gray-200 ring-1 ring-white/10 max-h-[70vh] overflow-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">{content}</div>
                <button
                  className="ml-2 px-2 py-1 text-gray-300 hover:text-white rounded"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  onTouchStart={() => setOpen(false)}
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </span>
  );
};
