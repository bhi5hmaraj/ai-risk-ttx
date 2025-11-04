/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

beforeAll(() => {
  // Enable backend-state mode for this test only
  process.env.NEXT_PUBLIC_BACKEND_STATE = '1';
});

vi.mock('../services/sessionClient', () => {
  let revision = 1;
  const getActionOptions = vi.fn(async () => ({ options: [{ title: 'Option', description: 'desc', cost: 1 }] }));
  return {
    createSession: vi.fn(async () => ({ id: 'sess_test', revision, hostToken: 'host_test', state: { phase: 0, round: 0 } })),
    submitActions: vi.fn(async (_id: string, _playerId: string, _actions: any[], expectedRevision: number) => {
      revision = expectedRevision + 1; // bump to 2
      return { id: 'sess_test', state: { phase: 2, round: 1, coreMetric: { name: 'Trust', description: 'desc', value: 75 }, eventLog: [], currentEvent: null }, revision, submitted: { human: true } };
    }),
    advance: vi.fn(async (_id: string, expectedRevision: number, _host: string) => {
      revision = expectedRevision + 1; // bump to 3
      return { id: 'sess_test', state: { phase: 2, round: 2, coreMetric: { name: 'Trust', description: 'desc', value: 75 }, eventLog: [], currentEvent: null }, revision };
    }),
    getActionOptions,
  };
});
import * as sessionClientModule from '../services/sessionClient';

vi.mock('../services/llmApiClient', async () => {
  const { mockConsequenceResponse, mockActionOptions, mockCounterfactualResponse } = await import('./fixtures/game-data');
  const generateConsequencesChat = vi.fn(async () => ({ consequences: mockConsequenceResponse, chatHistory: [] }));
  return {
    generateInitialScenarioChat: vi.fn(async () => ({ scenario: mockConsequenceResponse, chatHistory: [] })),
    generateActionOptions: vi.fn(async () => ({ options: mockActionOptions })),
    generateCounterfactualConsequences: vi.fn(async () => mockCounterfactualResponse),
    generateAITurn: vi.fn(async () => ({ options: mockActionOptions, chosenActions: [mockActionOptions[0]], reasoning: 'ok' })),
    generateConsequencesChat,
    generateCustomScenario: vi.fn(async () => null),
  };
});
import * as llmModule from '../services/llmApiClient';

import { GamePhase, RoleName } from '../types';
import { useGameController } from '../hooks/useGameController';
// Avoid client-only modular hook usage during unit tests
vi.mock('../hooks/useRoundOptions', () => ({ useRoundOptions: () => ({ loadHumanOptions: vi.fn() }) }));

afterEach(() => {
  vi.clearAllMocks();
});

describe.skip('useGameController with BACKEND_STATE=1 — legacy controller pending modular migration', () => {
  it('submits actions and advances round via sessionClient', async () => {
    const { result } = renderHook(() => useGameController());

    act(() => { result.current.actions.setSelectedRoleName(RoleName.TECH_CEO); });
    act(() => { result.current.actions.setGamePath('classic'); });
    await waitFor(() => expect(result.current.state.selectedRoleName).toBe(RoleName.TECH_CEO));
    act(() => { result.current.actions.handleStartGame(); });

    // Wait until players are populated
    await waitFor(() => expect(result.current.state.players.length).toBeGreaterThan(0));
    // Directly submit actions; backend sessionClient path will create session if needed
    act(() => {
      result.current.actions.handleConfirmActions([]);
    });

    // After backend advance, phase/round should reflect mocked response
    await waitFor(() => expect(result.current.state.gameState.phase).toBe(GamePhase.ACTION));
    await waitFor(() => expect(result.current.state.gameState.round).toBe(2));
    // Ensure no client chat-mode consequences call was made in backend mode
    expect((llmModule as any).generateConsequencesChat).not.toHaveBeenCalled();
  });

  it('does not call chat consequences when session exists even if env flag is off', async () => {
    // Disable env flag
    (process.env as any).NEXT_PUBLIC_BACKEND_STATE = undefined as any;
    const { result } = renderHook(() => useGameController());
    act(() => { result.current.actions.setSelectedRoleName(RoleName.TECH_CEO); });
    act(() => { result.current.actions.setGamePath('classic'); });
    await waitFor(() => expect(result.current.state.selectedRoleName).toBe(RoleName.TECH_CEO));
    act(() => { result.current.actions.handleStartGame(); });
    await waitFor(() => expect(result.current.state.players.length).toBeGreaterThan(0));
    // ensure backend path engaged at least once for options
    await waitFor(() => expect((sessionClientModule as any).getActionOptions).toHaveBeenCalled());
    act(() => { result.current.actions.handleConfirmActions([]); });
    await waitFor(() => expect(result.current.state.gameState.phase).toBe(GamePhase.ACTION));
    // Chat-mode path must not be used once sessionMeta is set
    expect((llmModule as any).generateConsequencesChat).not.toHaveBeenCalled();
  });
});
