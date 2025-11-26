"use client";

import React from 'react';
import { useCopilotChat } from '@/components/copilot/adapter';

export default function ErrorRenderer({ error }: { error: any }) {
  const { stopGeneration } = (useCopilotChat?.() as any) || { stopGeneration: () => {} };
  React.useEffect(() => {
    try { stopGeneration?.(); } catch {}
  }, [stopGeneration]);
  const msg = String(error?.message || 'Something went wrong');
  return (
    <div className="m-2 rounded border border-red-700 bg-red-900/30 text-red-200 text-xs p-2">
      {msg.includes('missing role for choice') ? (
        <span>Model stream glitch detected. I’ve stopped the turn. Please send again.</span>
      ) : (
        <span>{msg}</span>
      )}
    </div>
  );
}

