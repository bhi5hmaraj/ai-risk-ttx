import React from 'react';

export function Metric({ name, value, unit, delta }) {
  const formatValue = () => {
    if (unit === '×') return value.toFixed(2) + '×';
    if (unit === 'lvl') return 'lvl ' + value.toFixed(1);
    return (value * 100).toFixed(0) + '%';
  };

  const formatDelta = () => {
    const sign = delta >= 0 ? '+' : '';
    if (unit === '×') return sign + delta.toFixed(2) + '×';
    if (unit === 'lvl') return sign + delta.toFixed(1);
    return sign + (delta * 100).toFixed(0) + '%';
  };

  return (
    <div className="flex items-end justify-between py-1.5">
      <div className="text-xs text-slate-600">{name}</div>
      <div className="text-right">
        <div className="text-lg font-semibold tabular-nums text-slate-900">
          {formatValue()}
        </div>
        {typeof delta === 'number' && delta !== 0 && (
          <div className={'text-[11px] ' + (delta >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
            {formatDelta()} since last
          </div>
        )}
      </div>
    </div>
  );
}
