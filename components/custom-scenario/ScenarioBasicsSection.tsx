"use client";

import React from 'react';
import type { BasicsSectionProps } from './types';

export function ScenarioBasicsSection({ register, disabled, errors, comments, setFieldComment }: BasicsSectionProps) {
  return (
    <section className="space-y-2">
      <label className="block text-sm text-gray-300">Scenario Title <span className="text-red-400">*</span></label>
      <input aria-required disabled={!!disabled} className={`w-full bg-gray-900 border rounded px-3 py-2 ${errors?.scenarioTitle ? 'border-red-500' : 'border-gray-700'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="e.g., Gridlock: AI-Induced Supply Shock" {...register('scenarioTitle')} />
      {errors?.scenarioTitle && <p className="text-xs text-red-400">Required</p>}
      <input disabled={!!disabled} className={`w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} value={comments['scenarioTitle'] || ''} onChange={(e) => setFieldComment('scenarioTitle', e.target.value)} placeholder="Comment (e.g., tone, constraints, naming cues)" />

      <label className="block text-sm text-gray-300 mt-4">Scenario Description <span className="text-red-400">*</span></label>
      <textarea aria-required disabled={!!disabled} className={`w-full h-28 bg-gray-900 border rounded px-3 py-2 ${errors?.scenarioDescription ? 'border-red-500' : 'border-gray-700'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="One paragraph overview of the crisis…" {...register('scenarioDescription')} />
      {errors?.scenarioDescription && <p className="text-xs text-red-400">Required</p>}
      <input disabled={!!disabled} className={`w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} value={comments['scenarioDescription'] || ''} onChange={(e) => setFieldComment('scenarioDescription', e.target.value)} placeholder="Comment (e.g., emphasize realism, cite sources, avoid hype)" />
    </section>
  );
}

export default ScenarioBasicsSection;

