"use client";

export interface ScenarioRow {
  title: string;
  started: number;
  completed: number;
  rate: number | null;
}

export function ScenarioTable({ rows }: { rows: ScenarioRow[] }) {
  const [sortKey, setSortKey] = React.useState<'started' | 'rate'>('started');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const sorted = React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const A = sortKey === 'started' ? a.started : (a.rate ?? -1);
      const B = sortKey === 'started' ? b.started : (b.rate ?? -1);
      const cmp = A === B ? 0 : A < B ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);
  const toggleSort = (key: 'started' | 'rate') => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="mt-4 bg-gray-900 border border-gray-800 rounded p-4">
      <div className="text-sm text-gray-300 mb-2">Top Scenarios</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900 text-gray-300">
            <tr>
              <th className="text-left px-3 py-2">Scenario</th>
              <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('started')} title="Sort by started">Started {sortKey==='started' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th className="text-left px-3 py-2">Completed</th>
              <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('rate')} title="Sort by finish rate">Avg Completion % {sortKey==='rate' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td className="px-3 py-3 text-gray-400" colSpan={4}>No data</td></tr>
            ) : (
              sorted.map((s) => (
                <tr key={s.title} className="border-t border-gray-800">
                  <td className="px-3 py-2">{s.title}</td>
                  <td className="px-3 py-2">{s.started}</td>
                  <td className="px-3 py-2">{s.completed}</td>
                  <td className="px-3 py-2">{s.rate != null ? `${Math.round(s.rate * 100)}%` : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import * as React from 'react';

