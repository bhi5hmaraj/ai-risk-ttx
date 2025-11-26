/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GamePage from '../app/game/page';
import { GamePhase } from '../types';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/game',
}));

vi.mock('../components/Navigation', () => ({
  Navigation: () => <nav />, 
}));

vi.mock('../components/game', () => ({
  ActionTreePortal: () => null,
  FeedbackBanner: () => null,
  FeedbackModal: () => null,
  MakePublicModal: () => null,
}));

vi.mock('../screens', () => ({
  GameScreen: () => <div data-testid="game-screen">Game Screen</div>,
  LoadingScreen: ({ message }: any) => <div data-testid="loading-screen">{message}</div>,
}));

// Migrate test to modular hooks used by GamePage
vi.mock('../hooks/useGame', () => ({
  useGame: () => ({
    gameState: { phase: GamePhase.ACTION, round: 1, coreMetric: { name: 'Trust', description: '', value: 100 }, eventLog: [], currentEvent: { headline: 'h', detail: 'd' } },
    players: [{ id: 'human', isHuman: true, role: { name: 'Leader' }, actionPoints: 3, actions: [], hasSubmittedActions: false, hiddenScore: 0 }],
  }),
}));

vi.mock('../hooks/useUI', () => ({
  useUI: () => ({ isLoading: true, loadingMessage: 'Generating action options... please wait', error: null, setHistoryOpen: vi.fn() }),
}));

vi.mock('../hooks/useActions', () => ({
  useActions: () => ({ actionOptions: [], aiCompletionStatus: {} }),
}));

vi.mock('../hooks/useLobby', () => ({
  useLobby: () => ({ gameSetup: null, customScenario: '', gamePath: 'classic' }),
}));

vi.mock('../hooks/useGameActions', () => ({
  useGameActions: () => ({ handleConfirmActions: vi.fn(), handleStartGame: vi.fn(), runConsequencePhase: vi.fn() }),
}));

describe('GamePage overlay behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show full-screen loading overlay during action-options fetch', () => {
    render(<GamePage />);
    // LoadingScreen would render an element with data-testid="loading-screen" in app tests; ensure it is absent
    expect(screen.queryByTestId('loading-screen')).toBeNull();
  });
});
