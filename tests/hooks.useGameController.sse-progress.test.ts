/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameController } from '../hooks/useGameController';
import { useGameStore } from '../stores/gameStore';
import { GamePhase } from '../types';

// Mock EventSource to capture listeners and trigger events
class MockEventSource {
  url: string;
  listeners: Record<string, Function[]> = {};
  constructor(url: string) { this.url = url; (global as any).lastES = this; }
  addEventListener(type: string, cb: any) { (this.listeners[type] ||= []).push(cb); }
  removeEventListener(type: string, cb: any) { this.listeners[type] = (this.listeners[type]||[]).filter(f => f !== cb); }
  close() {}
  emit(type: string, data: any) { (this.listeners[type]||[]).forEach(fn => fn({ data: JSON.stringify(data) })); }
}

// @ts-ignore
global.EventSource = MockEventSource as any;

vi.mock('../services/sessionClient', () => ({
  createSession: vi.fn(async () => ({ id: 'sess_test', revision: 1, hostToken: 'host', state: {} })),
  getActionOptions: vi.fn(async () => ({ options: [] })),
  submitActions: vi.fn(async (_id: string, _pid: string, _actions: any[], rev: number) => ({ id: 'sess_test', revision: rev + 1, submitted: {} })),
  advance: vi.fn(async (_id: string, rev: number) => ({ id: 'sess_test', revision: rev + 1, state: {} })),
}));

describe('useGameController SSE progress', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_STATE', '1');
    // Seed store with ACTION phase + human
    useGameStore.setState({
      gameState: {
        phase: GamePhase.ACTION,
        round: 1,
        coreMetric: { name: 'Trust', description: '', value: 100 },
        eventLog: [],
        currentEvent: { headline: 'h', detail: 'd' },
      } as any,
      players: [
        { id: 'human', isHuman: true, role: { name: 'Leader' }, actionPoints: 3, actions: [], hasSubmittedActions: false, hiddenScore: 0 },
        { id: 'ai1', isHuman: false, role: { name: 'AI-1' }, actionPoints: 3, actions: [], hasSubmittedActions: false, hiddenScore: 0 },
        { id: 'ai2', isHuman: false, role: { name: 'AI-2' }, actionPoints: 3, actions: [], hasSubmittedActions: false, hiddenScore: 0 },
      ] as any,
    });
  });

  it('marks AI roles as complete when progress events arrive', async () => {
    const { result } = renderHook(() => useGameController());
    // Wait for EventSource to be created by the hook
    const source = await waitFor(() => {
      const es = (global as any).lastES as MockEventSource | undefined;
      if (!es) throw new Error('no ES yet');
      return es;
    });

    // Initially not complete
    expect(result.current.state.aiCompletionStatus['AI-1']).toBeFalsy();

    // Emit progress for AI-1
    act(() => {
      source.emit('session', { type: 'progress', snapshot: { revision: 2, state: {} }, payload: { role: 'AI-1' } });
    });

    // Expect AI-1 marked complete
    expect(result.current.state.aiCompletionStatus['AI-1']).toBe(true);
  });
});
