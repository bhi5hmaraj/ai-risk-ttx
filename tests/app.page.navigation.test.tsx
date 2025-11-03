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

const mockGameController = {
  state: {
    gameState: {
      phase: GamePhase.LOBBY,
      round: 0,
      coreMetric: { name: 'Trust', description: 'desc', value: 100 },
      eventLog: [],
      currentEvent: null,
    },
    players: [mockHumanPlayer],
    selectedRoleName: null,
    gamePath: null,
    gameSetup: null,
    customScenario: '',
    isLoading: false,
    loadingMessage: '',
    error: null,
    timer: 300,
    isPaused: false,
    actionOptions: [],
    aiCompletionStatus: {},
    isActionTreeOpen: false,
    isHistoryOpen: true,
    expandedRound: null,
    latestLogEntry: null,
    selectedLogEntry: null,
    canViewActionTree: false,
  },
  actions: {
    setSelectedRoleName: vi.fn(),
    setGamePath: vi.fn(),
    setGameSetup: vi.fn(),
    setCustomScenario: vi.fn(),
    setIsActionTreeOpen: vi.fn(),
    handleCustomGameStart: vi.fn(),
    handleStartGame: vi.fn(),
    handleConfirmActions: vi.fn(),
    handleToggleHistory: vi.fn(),
    handleOpenActionTree: vi.fn(),
    setExpandedRound: vi.fn(),
    resetState: vi.fn(),
  },
  derived: {
    humanPlayer: mockHumanPlayer,
    handlePauseToggle: vi.fn(),
  },
};

vi.mock('../hooks/useGameController', () => ({
  useGameController: () => mockGameController,
}));

const resetRouterMocks = () => {
  push.mockReset();
  replace.mockReset();
  back.mockReset();
};

const resetControllerState = () => {
  mockGameController.state.gameState = {
    phase: GamePhase.LOBBY,
    round: 0,
    coreMetric: { name: 'Trust', description: 'desc', value: 100 },
    eventLog: [],
    currentEvent: null,
  };
  mockGameController.state.gamePath = null;
  mockGameController.state.customScenario = '';
  mockGameController.state.gameSetup = null;
  mockGameController.state.isLoading = false;
  mockGameController.state.loadingMessage = '';
  mockGameController.state.error = null;
  mockGameController.derived.humanPlayer = mockHumanPlayer;
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

      mockGameController.state.gameState = {
        ...mockGameController.state.gameState,
        phase: GamePhase.ACTION,
      };

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

      mockGameController.state.gameState = {
        ...mockGameController.state.gameState,
        phase: GamePhase.STARTING,
      };

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
      mockGameController.state.gameState = {
        ...mockGameController.state.gameState,
        phase: GamePhase.ACTION,
      };
    });

    it('shows loading screen when human player not yet ready', () => {
      mockGameController.derived.humanPlayer = null;
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

      mockGameController.state.gameState = {
        ...mockGameController.state.gameState,
        phase: GamePhase.END,
      };

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
      mockGameController.state.gameState = {
        ...mockGameController.state.gameState,
        phase: GamePhase.END,
      };

      render(<EndPage />);

      expect(screen.getByTestId('end-screen')).toBeTruthy();
    });

    it('does not self-redirect when phase is not END (orchestrator owns routing)', () => {
      mockGameController.state.gameState = {
        ...mockGameController.state.gameState,
        phase: GamePhase.ACTION,
      };

      render(<EndPage />);
      // Page renders nothing; RouteOrchestrator will handle routing elsewhere
      expect(replace).not.toHaveBeenCalled();
    });
  });
});
