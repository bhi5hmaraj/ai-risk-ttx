"use client";

import React, { useMemo } from 'react';
import { useUIStore } from '@/stores/uiStore';

const StepRow = ({ label, state }: { label: string; state: 'idle' | 'running' | 'done' | 'error' }) => {
  const color = state === 'done' ? 'text-green-400' : state === 'error' ? 'text-red-400' : 'text-blue-300';
  const badge = state === 'done' ? '✓' : state === 'error' ? '!' : '…';
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-300">{label}</span>
      <span className={`ml-3 font-semibold ${color}`}>{badge}</span>
    </div>
  );
};

export function StartProgress() {
  const progress = useUIStore((s) => s.startProgress);

  const visible = useMemo(() => {
    const vals = Object.values(progress);
    return vals.some((v) => v === 'running') || (vals.includes('done') && !vals.every((v) => v === 'done'));
  }, [progress]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 w-72 bg-gray-900/90 border border-gray-700 rounded-lg shadow-lg p-4 backdrop-blur-sm">
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Game Setup</div>
      <div className="space-y-2">
        <StepRow label="Creating session" state={progress.creatingSession} />
        <StepRow label="Building players" state={progress.buildingPlayers} />
        <StepRow label="Generating scenario" state={progress.generatingScenario} />
        <StepRow label="Connecting stream" state={progress.connectingStream} />
        <StepRow label="Ready" state={progress.ready} />
      </div>
    </div>
  );
}
