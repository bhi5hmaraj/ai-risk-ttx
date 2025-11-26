"use client";

import React from 'react';
import type { CoreMetricSectionProps } from './types';

export function CoreMetricSection({ register, disabled, errors, comments, setFieldComment }: CoreMetricSectionProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="block text-sm text-gray-300">Core Metric Name <span className="text-red-400">*</span></label>
        <input aria-required disabled={!!disabled} className={`w-full bg-gray-900 border rounded px-3 py-2 ${errors?.coreMetric?.name ? 'border-red-500' : 'border-gray-700'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Public Trust" {...register('coreMetric.name' as const)} />
        {errors?.coreMetric?.name && <p className="text-xs text-red-400">Required</p>}
        <input disabled={!!disabled} className={`w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} value={comments['coreMetric.name'] || ''} onChange={(e) => setFieldComment('coreMetric.name', e.target.value)} placeholder="Comment (e.g., should be legible to non-experts)" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm text-gray-300">Core Metric Description <span className="text-red-400">*</span></label>
        <input aria-required disabled={!!disabled} className={`w-full bg-gray-900 border rounded px-3 py-2 ${errors?.coreMetric?.description ? 'border-red-500' : 'border-gray-700'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="What the score represents…" {...register('coreMetric.description' as const)} />
        {errors?.coreMetric?.description && <p className="text-xs text-red-400">Required</p>}
        <input disabled={!!disabled} className={`w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} value={comments['coreMetric.description'] || ''} onChange={(e) => setFieldComment('coreMetric.description', e.target.value)} placeholder="Comment (e.g., drivers of increases/decreases)" />
      </div>
      <div>
        <label className="block text-sm text-gray-300">Starting Value (70–100) <span className="text-red-400">*</span></label>
        <input aria-required disabled={!!disabled} type="number" min={70} max={100} className={`w-full bg-gray-900 border rounded px-3 py-2 ${errors?.coreMetric?.value ? 'border-red-500' : 'border-gray-700'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} {...register('coreMetric.value' as const, { valueAsNumber: true })} />
        {errors?.coreMetric?.value && <p className="text-xs text-red-400">Enter a value 70–100</p>}
        <input disabled={!!disabled} className={`w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} value={comments['coreMetric.value'] || ''} onChange={(e) => setFieldComment('coreMetric.value', e.target.value)} placeholder="Comment (calibration, trend)" />
      </div>
      <div>
        <label className="block text-sm text-gray-300">Max Rounds (optional)</label>
        <input disabled={!!disabled} className={`w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="5" {...register('maxRounds' as const)} />
        <input disabled={!!disabled} className={`mt-1 w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} value={comments['maxRounds'] || ''} onChange={(e) => setFieldComment('maxRounds', e.target.value)} placeholder="Comment (e.g., keep pacing brisk)" />
      </div>
    </section>
  );
}

export default CoreMetricSection;

