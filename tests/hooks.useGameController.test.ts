/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameController } from '../hooks/useGameController';
import { GamePhase } from '../types';

vi.mock('../services/llmApiClient', () => {
  const mockActionOptions = Array.from({ length: 5 }, (_, i) => ({
    title: `Action ${i + 1}`,
    description: `Desc ${i + 1}`,
    cost: i % 3 === 0 ? 2 : 1,
  }));

  return {
    generateInitialScenarioChat: vi.fn(async (_setup: any, _players: any[]) => ({
      scenario: {
        roundSummary: 'Opening crisis',
        outcomeTimeline: [{ title: 'Event 1', description: 'E1', impact: 'neutral' }],
        counterfactualNote: 'If no one acted...',
        publicScoreUpdate: +5,
        hiddenScoreUpdates: [{ roleName: 'Tech CEO', update: 1, justification: 'Good call' }],
        nextEvent: { headline: 'Next step', detail: 'Details' },
      },
      chatHistory: [{ role: 'system', content: 'ok' }],
    })),

    generateActionOptions: vi.fn(async () => ({ options: mockActionOptions })),

    generateAITurn: vi.fn(async () => ({
      options: mockActionOptions,
      chosenActions: [mockActionOptions[0]],
      reasoning: 'Pick first for speed',
    })),

    generateCounterfactualConsequences: vi.fn(async () => ({ publicScoreUpdate: -3 })),

    generateConsequencesChat: vi.fn(async () => ({
      consequences: {
        roundSummary: 'Round resolved',
        outcomeTimeline: [],
        counterfactualNote: '',
        publicScoreUpdate: -4,
        hiddenScoreUpdates: [{ roleName: 'Tech CEO', update: 2, justification: 'Impactful' }],
        nextEvent: { headline: 'Follow-on', detail: '...' },
      },
      chatHistory: [{ role: 'system', content: 'ok2' }],
    })),
  };
});

describe('useGameController (integration via jsdom)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.error as any).mockRestore?.();
    (console.log as any).mockRestore?.();
  });

  it('starts classic, loads options, confirms actions, advances round', async () => {
    const { result } = renderHook(() => useGameController());

    act(() => {
      result.current.actions.setSelectedRoleName('Tech CEO');
      result.current.actions.setGamePath('classic');
    });
    // Ensure state updates propagate before invoking start handler
    await waitFor(() => expect(result.current.state.selectedRoleName).toBe('Tech CEO'));
    act(() => {
      result.current.actions.handleStartGame();
    });

    await waitFor(() => expect(result.current.state.gameState.phase).toBe(GamePhase.ACTION));
    expect(result.current.state.gameState.round).toBe(1);
    expect(result.current.state.error).toBeNull();

    await waitFor(() => expect(result.current.state.actionOptions.length).toBe(5));

    const chosen = result.current.state.actionOptions.slice(0, 2);
    act(() => {
      result.current.actions.handleConfirmActions(chosen);
    });

    await waitFor(() => expect(result.current.state.gameState.round).toBe(2));
    // Behavior: event log should have at least one entry now
    expect(result.current.state.gameState.eventLog.length).toBeGreaterThan(0);
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('surfaces an error when consequences chat fails and does not advance round', async () => {
    const mod = await import('../services/llmApiClient');
    const mockedCons = (mod as any).generateConsequencesChat as ReturnType<typeof vi.fn>;

    const { result } = renderHook(() => useGameController());
    act(() => {
      result.current.actions.setSelectedRoleName('Tech CEO');
      result.current.actions.setGamePath('classic');
    });
    await waitFor(() => expect(result.current.state.selectedRoleName).toBe('Tech CEO'));
    act(() => {
      result.current.actions.handleStartGame();
    });
    await waitFor(() => expect(result.current.state.gameState.phase).toBe(GamePhase.ACTION));

    await waitFor(() => expect(result.current.state.actionOptions.length).toBe(5));
    const chosen = result.current.state.actionOptions.slice(0, 1);
    // Simulate backend returning null once
    mockedCons.mockResolvedValueOnce(null);
    const prevRound = result.current.state.gameState.round;
    act(() => {
      result.current.actions.handleConfirmActions(chosen);
    });
    // Error should be set and round not advanced
    await waitFor(() => expect(result.current.state.error).toBeTruthy());
    expect(result.current.state.gameState.round).toBe(prevRound);
  });
});
