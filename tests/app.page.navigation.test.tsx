/**
 * Navigation tests for App Router pages
 */

/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from '../app/page';
import LobbyPage from '../app/lobby/page';
import GamePage from '../app/game/page';
import EndPage from '../app/end/page';
import { RouteOrchestrator } from '../components/RouteOrchestrator';
import { GamePhase } from '../types';

const push = vi.fn();
const replace = vi.fn();
const back = vi.fn();

vi.mock('next/navigation', async () => {
  return {
    useRouter: () => ({ push, replace, back }),
    usePathname: () => '/',
  };
});

vi.mock('../screens', () => ({
  LobbyScreen: ({ selectedRoleName }: any) => (
    <div data-testid="lobby-screen">Lobby Screen {selectedRoleName}</div>
  ),
  GameScreen: () => <div data-testid="game-screen">Game Screen</div>,
  EndScreen: () => <div data-testid="end-screen">End Screen</div>,
  LoadingScreen: ({ message }: any) => <div data-testid="loading-screen">{message}</div>,
  GameRulesScreen: ({ onNavigateToLobby }: any) => (
    <div data-testid="game-rules-screen">
      <button onClick={onNavigateToLobby}>Go to Lobby</button>
    </div>
  ),
  AboutScreen: ({ onBack }: any) => (
    <div data-testid="about-screen">
      <button onClick={onBack}>Back</button>
    </div>
  ),
  UpdatesScreen: ({ onBack }: any) => (
    <div data-testid="updates-screen">
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

vi.mock('../components/game', () => ({
  ActionTreePortal: () => <div data-testid="action-tree" />,
  FeedbackBanner: ({ onOpenFeedback }: any) => (
    <button data-testid="feedback-banner" onClick={onOpenFeedback}>
      Feedback
    </button>
  ),
  FeedbackModal: ({ isOpen }: any) => (
    isOpen ? <div data-testid="feedback-modal">Feedback Modal</div> : null
  ),
  MakePublicModal: ({ isOpen, onSubmitSuccess }: any) => (
    isOpen ? (
      <div data-testid="make-public-modal">
        Make Public
        <button onClick={onSubmitSuccess}>Submit</button>
      </div>
    ) : null
  ),
}));

vi.mock('../components/Navigation', () => ({
  Navigation: ({
    onNavigateHome,
    onOpenAbout,
    onOpenUpdates,
    onOpenFeedback,
  }: any) => (
    <nav data-testid="navigation">
      <button onClick={onNavigateHome}>Home</button>
      <button onClick={onOpenAbout}>About</button>
      <button onClick={onOpenUpdates}>Updates</button>
      <button onClick={onOpenFeedback}>Feedback</button>
    </nav>
  ),
}));

// Ensure RouteOrchestrator sees a start intent when phases advance
vi.mock('../stores/sessionStore', () => {
  const state = { hasStartIntent: true, sessionMeta: null } as any;
  const hook = (selector?: any) => (selector ? selector(state) : state);
  hook.getState = () => state;
  hook.setState = (partial: any) => Object.assign(state, typeof partial === 'function' ? partial(state) : partial);
  return { useSessionStore: hook };
});

// Mock game store used by RouteOrchestrator
vi.mock('../stores/gameStore', () => {
  const state = {
    get gameState() { return mockGameState as any; },
    get players() { return mockPlayers as any; },
  } as any;
  const hook = (selector?: any) => (selector ? selector(state) : state);
  hook.getState = () => state;
  hook.setState = (partial: any) => Object.assign(state, typeof partial === 'function' ? partial(state) : partial);
  return { useGameStore: hook };
});

const mockHumanPlayer = {
  id: 'player-1',
  role: {
    name: 'Prime Minister',
    publicObjective: 'Objective',
    hiddenObjective: 'Hidden',
    resources: [],
    constraints: [],
  },
  isHuman: true,
  actions: [],
  actionPoints: 3,
  hasSubmittedActions: false,
  hiddenScore: 50,
};

// Modular hooks used by LobbyPage and GamePage
let mockGameState = {
  phase: GamePhase.LOBBY,
  round: 0,
  coreMetric: { name: 'Trust', description: 'desc', value: 100 },
  eventLog: [],
  currentEvent: null,
};
let mockPlayers = [mockHumanPlayer] as any[];
let mockIsLoading = false;
let mockLoadingMessage = '';
let mockError: string | null = null;
let mockActionOptions: any[] = [];
let mockAiStatus: Record<string, boolean> = {};
let mockGameSetup: any = null;
let mockCustomScenario = '';
let mockGamePath: any = null;

vi.mock('../hooks/useGame', () => ({
  useGame: () => ({ gameState: mockGameState as any, players: mockPlayers as any }),
}));
vi.mock('../hooks/useUI', () => ({
  useUI: () => ({ isLoading: mockIsLoading, loadingMessage: mockLoadingMessage, error: mockError, setHistoryOpen: vi.fn() }),
}));
vi.mock('../hooks/useActions', () => ({
  useActions: () => ({ actionOptions: mockActionOptions, aiCompletionStatus: mockAiStatus }),
}));
vi.mock('../hooks/useLobby', () => ({
  useLobby: () => ({ gameSetup: mockGameSetup, customScenario: mockCustomScenario, gamePath: mockGamePath, setSelectedRoleName: vi.fn(), setGamePath: vi.fn(), setCustomScenario: vi.fn(), setGameSetup: vi.fn(), reset: vi.fn() }),
}));
vi.mock('../hooks/useGameActions', () => ({
  useGameActions: () => ({ handleConfirmActions: vi.fn(), handleStartGame: vi.fn(), runConsequencePhase: vi.fn() }),
}));

// EndPage still uses useGameController; provide a minimal shim for its state
vi.mock('../hooks/useGameController', () => ({
  useGameController: () => ({
    state: { gameState: mockGameState as any, players: mockPlayers as any },
    actions: { resetState: vi.fn(), setIsActionTreeOpen: vi.fn() },
    derived: { humanPlayer: mockPlayers.find((p:any)=>p.isHuman) || null },
  }),
}));

const resetRouterMocks = () => {
  push.mockReset();
  replace.mockReset();
  back.mockReset();
};

const resetControllerState = () => {
  mockGameState = { phase: GamePhase.LOBBY, round: 0, coreMetric: { name: 'Trust', description: 'desc', value: 100 }, eventLog: [], currentEvent: null } as any;
  mockPlayers = [mockHumanPlayer] as any[];
  mockIsLoading = false;
  mockLoadingMessage = '';
  mockError = null;
  mockActionOptions = [];
  mockAiStatus = {};
  mockGameSetup = null;
  mockCustomScenario = '';
  mockGamePath = null;
};

describe('App Router pages', () => {
  beforeEach(() => {
    resetRouterMocks();
    resetControllerState();
    vi.clearAllMocks();
  });

  describe('HomePage', () => {
    it('renders game rules and navigates to lobby', () => {
      render(<HomePage />);

      fireEvent.click(screen.getByText('Go to Lobby'));

      expect(push).toHaveBeenCalledWith('/lobby');
    });

    it('redirects to game when phase becomes ACTION', async () => {
      const { rerender } = render(
        <>
          <RouteOrchestrator />
          <HomePage />
        </>
      );

      mockGameState = { ...(mockGameState as any), phase: GamePhase.ACTION } as any;

      rerender(
        <>
          <RouteOrchestrator />
          <HomePage />
        </>
      );

      await waitFor(() => {
        expect(replace).toHaveBeenCalledWith('/game');
      });
    });
  });

  describe('LobbyPage', () => {
    it('renders lobby screen', () => {
      render(<LobbyPage />);
      expect(screen.getByTestId('lobby-screen')).toBeTruthy();
    });

    it('redirects to game when phase transitions to STARTING', async () => {
      const { rerender } = render(
        <>
          <RouteOrchestrator />
          <LobbyPage />
        </>
      );
      resetRouterMocks();

      mockGameState = { ...(mockGameState as any), phase: GamePhase.STARTING } as any;

      rerender(
        <>
          <RouteOrchestrator />
          <LobbyPage />
        </>
      );

      await waitFor(() => {
        expect(replace).toHaveBeenCalledWith('/game');
      });
    });
  });

  describe('GamePage', () => {
    beforeEach(() => {
      mockGameState = { ...(mockGameState as any), phase: GamePhase.ACTION } as any;
    });

    it('shows loading screen when human player not yet ready', () => {
      mockPlayers = [] as any[];
      render(<GamePage />);

      expect(screen.getByTestId('loading-screen')).toBeTruthy();
      expect(replace).not.toHaveBeenCalled();
    });

    it('redirects to end page when phase becomes END', async () => {
      const { rerender } = render(
        <>
          <RouteOrchestrator />
          <GamePage />
        </>
      );
      resetRouterMocks();

      mockGameState = { ...(mockGameState as any), phase: GamePhase.END } as any;

      rerender(
        <>
          <RouteOrchestrator />
          <GamePage />
        </>
      );

      await waitFor(() => {
        expect(replace).toHaveBeenCalledWith('/end');
      });
    });
  });

  describe('EndPage', () => {
    it('renders end screen when phase is END', () => {
      mockGameState = { ...(mockGameState as any), phase: GamePhase.END } as any;

      render(<EndPage />);

      expect(screen.getByTestId('end-screen')).toBeTruthy();
    });

    it('does not self-redirect when phase is not END (orchestrator owns routing)', () => {
      mockGameState = { ...(mockGameState as any), phase: GamePhase.ACTION } as any;

      render(<EndPage />);
      // Page renders nothing; RouteOrchestrator will handle routing elsewhere
      expect(replace).not.toHaveBeenCalled();
    });
  });
});
