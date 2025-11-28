"use client";

import { useEffect, useState } from 'react';
import { GamePhase } from '@/types';

export function useTimer(params: { phase: GamePhase; humanHasSubmitted: boolean; onTimeout: () => void; initial?: number; paused?: boolean }) {
  const { phase, humanHasSubmitted, onTimeout, initial = 300, paused = false } = params;
  const [timer, setTimer] = useState(initial);
  const [isPaused, setIsPaused] = useState(paused);

  useEffect(() => {
    let interval: any;
    if (phase === GamePhase.ACTION && !isPaused && !humanHasSubmitted && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (phase === GamePhase.ACTION && !humanHasSubmitted && timer <= 0) {
      onTimeout();
    }
    return () => interval && clearInterval(interval);
  }, [phase, isPaused, humanHasSubmitted, timer, onTimeout]);

  const togglePause = () => setIsPaused((v) => !v);
  const reset = (value = initial) => setTimer(value);

  return { timer, isPaused, togglePause, reset, setTimer } as const;
}

