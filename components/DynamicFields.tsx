"use client";

import React from 'react';

type Props = {
  base?: string;
  value: any;
  register: (name: any) => any;
  disabled?: boolean;
  known?: Set<string>;
};

export const DynamicFields: React.FC<Props> = ({ base = '', value, register, disabled, known }) => {
  const KNOWN = known || new Set(['scenarioTitle', 'scenarioDescription', 'coreMetric', 'stakeholders', 'maxRounds', 'comments']);
  if (!value || typeof value !== 'object') return null;
  const entries = Object.entries(value).filter(([k]) => !KNOWN.has(k));
  if (entries.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Additional Fields</h2>
      {entries.map(([key, val]) => {
        const path = base ? `${base}.${key}` : key;
        if (typeof val === 'string' || typeof val === 'number') {
          return (
            <div key={path} className="space-y-1">
              <label className="block text-sm text-gray-300">{key}</label>
              <input
                disabled={disabled}
                className={`w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                {...register(path as any)}
              />
            </div>
          );
        }
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          return (
            <div key={path} className="space-y-2">
              <div className="text-sm text-gray-400">{key}</div>
              <DynamicFields base={path} value={val} register={register} disabled={disabled} known={KNOWN} />
            </div>
          );
        }
        return null;
      })}
    </section>
  );
};

