/* @vitest-environment jsdom */
import React from 'react';
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Limit AI players in tests to simplify behavior (human-only)
beforeAll(() => {
  process.env.NEXT_PUBLIC_GAME_AI_PLAYERS = '0';
});

// Mock LLM client used by the hook
vi.mock('../services/llmApiClient', async () => {
  const { mockConsequenceResponse, mockActionOptions, mockCounterfactualResponse } = await import('./fixtures/game-data');
  return {
    generateInitialScenarioChat: vi.fn(async () => ({ scenario: mockConsequenceResponse, chatHistory: [] })),
    generateActionOptions: vi.fn(async () => ({ options: mockActionOptions })),
    generateCounterfactualConsequences: vi.fn(async () => mockCounterfactualResponse),
    generateAITurn: vi.fn(async () => ({ options: mockActionOptions, chosenActions: [mockActionOptions[0]], reasoning: 'ok' })),
    generateConsequencesChat: vi.fn(async () => ({ consequences: mockConsequenceResponse, chatHistory: [] })),
    generateCustomScenario: vi.fn(async () => null),
  };
});

// Import after env and mocks are set
import { GamePhase, RoleName } from '../types';
// Mock modular hook that uses client-only hooks to avoid invalid hook call in tests
vi.mock('../hooks/useRoundOptions', () => ({ useRoundOptions: () => ({ loadHumanOptions: vi.fn() }) }));
import { useGameController } from '../hooks/useGameController';

afterEach(() => {
  vi.clearAllMocks();
});

describe.skip('useGameController (behavior) — legacy controller pending modular migration', () => {
  it('starts classic, loads options, confirms actions, advances round', async () => {
    const { result } = renderHook(() => useGameController());

    // Lobby → select role and start game (ai_safety preset path avoids chat init)
    act(() => {
      result.current.actions.setSelectedRoleName(RoleName.TECH_CEO);
      result.current.actions.setGamePath('classic');
    });
    // let state update propagate before starting
    await waitFor(() => expect(result.current.state.gamePath).toBe('classic'));
    act(() => {
      result.current.actions.handleStartGame();
    });

    // Expect ACTION phase after chat init
    await waitFor(() => expect(result.current.state.gameState.phase).toBe(GamePhase.STARTING), { timeout: 1000 }).catch(() => {});
    await waitFor(() => expect(result.current.state.gameState.phase).toBe(GamePhase.ACTION));
    expect(result.current.state.gameState.round).toBe(1);
    expect(result.current.state.error).toBeNull();

    // Action options auto-load for human player
    await waitFor(() => expect(result.current.state.actionOptions.length).toBeGreaterThan(0));
    const options = result.current.state.actionOptions;
    expect(options.length).toBe(5);

    // Confirm two actions and advance the round via consequences
    act(() => {
      result.current.actions.handleConfirmActions([options[0], options[1]]);
    });

    await waitFor(() => expect(result.current.state.gameState.round).toBe(2));
    expect(result.current.state.gameState.phase).toBe(GamePhase.ACTION);
    expect(result.current.state.error).toBeNull();
    // Event log should have at least one entry (round 0) after applyConsequences
    expect(result.current.state.gameState.eventLog.length).toBeGreaterThanOrEqual(1);
  });

  it('handles initialization failure gracefully', async () => {
    const llm = await import('../services/llmApiClient');
    // Ensure all calls in this test return null (StrictMode may re-invoke)
    (llm.generateInitialScenarioChat as any).mockResolvedValue(null);

    const { result } = renderHook(() => useGameController());

    act(() => {
      result.current.actions.setSelectedRoleName(RoleName.TECH_CEO);
      result.current.actions.setGamePath('classic');
    });
    await waitFor(() => expect(result.current.state.gamePath).toBe('classic'));
    act(() => {
      result.current.actions.handleStartGame();
    });

    // Falls back to LOBBY with error
    await waitFor(() => expect(result.current.state.gameState.phase).toBe(GamePhase.LOBBY));
    await waitFor(() => expect(result.current.state.error).toBeTruthy());
  });
});
