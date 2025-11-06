'use client';

import React from 'react';
import { useSessionStore } from '@/stores/sessionStore';

export function ConnectionStatusPill() {
  const sseStatus = useSessionStore((s) => s.sseStatus);
  const sessionMeta = useSessionStore((s) => s.sessionMeta);

  const getStatusColor = () => {
    switch (sseStatus.state) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'disconnected':
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (sseStatus.state) {
      case 'connected': {
        if (!sseStatus.lastEventTime) return 'Connected';
        const age = Math.floor((Date.now() - sseStatus.lastEventTime) / 1000);
        if (age < 2) return `${sseStatus.lastEventType || 'event'}`;
        if (age < 60) return `${age}s ago`;
        return 'Connected';
      }
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return sseStatus.error || 'Error';
      case 'disconnected':
        return sessionMeta ? 'Disconnected' : 'No session';
    }
  };

  const pulseAnimation = sseStatus.state === 'connecting' ? 'animate-pulse' : '';

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700"
      title={
        sseStatus.state === 'error'
          ? `SSE Error: ${sseStatus.error}`
          : `SSE: ${sseStatus.state}${sessionMeta ? ` (${sessionMeta.id.slice(0, 12)}...)` : ''}`
      }
    >
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${pulseAnimation}`} />
      <span className="text-xs text-gray-300">{getStatusText()}</span>
    </div>
  );
}
