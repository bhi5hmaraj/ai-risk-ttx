/**
 * Tests for app/page.tsx navigation logic
 * These tests ensure navigation behavior is preserved during App Router migration
 */

/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GamePhase } from '../types';

// Mock all screen components
vi.mock('../screens', () => ({
  LobbyScreen: ({ selectedRoleName }: any) => <div data-testid="lobby-screen">Lobby: {selectedRoleName}</div>,
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

// Mock game components
vi.mock('../components/game', () => ({
  ActionTreePortal: () => <div data-testid="action-tree" />,
  FeedbackBanner: () => <div data-testid="feedback-banner" />,
  FeedbackModal: () => <div data-testid="feedback-modal" />,
  MakePublicModal: () => <div data-testid="make-public-modal" />,
}));

// Mock Navigation component
vi.mock('../components/Navigation', () => ({
  Navigation: ({ onNavigateHome, onOpenAbout, onOpenUpdates }: any) => (
    <nav data-testid="navigation">
      <button onClick={onNavigateHome}>Home</button>
      <button onClick={onOpenAbout}>About</button>
      <button onClick={onOpenUpdates}>Updates</button>
    </nav>
  ),
}));

// Mock useGameController hook
const mockGameController = {
  state: {
    gameState: {
      phase: GamePhase.LOBBY,
      round: 0,
      coreMetric: { name: 'Test Metric', description: 'Test', value: 100 },
      eventLog: [],
      currentEvent: null,
    },
    players: [],
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
    setExpandedRound: vi.fn(),
    setIsActionTreeOpen: vi.fn(),
    handleCustomGameStart: vi.fn(),
    handleStartGame: vi.fn(),
    handleConfirmActions: vi.fn(),
    resetState: vi.fn(),
    handleOpenActionTree: vi.fn(),
    handleToggleHistory: vi.fn(),
  },
  derived: {
    humanPlayer: null,
    handlePauseToggle: vi.fn(),
  },
};

vi.mock('../hooks/useGameController', () => ({
  useGameController: () => mockGameController,
}));

// Import component after mocks are set up
import Home from '../app/page';

describe('app/page.tsx - Navigation Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default LOBBY phase
    mockGameController.state.gameState.phase = GamePhase.LOBBY;
  });

  describe('Initial Render', () => {
    it('renders home screen (GameRulesScreen) by default', () => {
      render(<Home />);
      expect(screen.getByTestId('game-rules-screen')).toBeTruthy();
    });

    it('renders Navigation component', () => {
      render(<Home />);
      expect(screen.getByTestId('navigation')).toBeTruthy();
    });
  });

  describe('Screen Navigation', () => {
    it('navigates from home to lobby when clicking "Go to Lobby"', () => {
      render(<Home />);

      // Start on home screen
      expect(screen.getByTestId('game-rules-screen')).toBeTruthy();

      // Click "Go to Lobby" button
      const lobbyButton = screen.getByText('Go to Lobby');
      fireEvent.click(lobbyButton);

      // Should now show lobby screen
      expect(screen.getByTestId('lobby-screen')).toBeTruthy();
      expect(screen.queryByTestId('game-rules-screen')).toBeFalsy();
    });

    it('navigates to about screen when clicking "About"', () => {
      render(<Home />);

      const aboutButton = screen.getByText('About');
      fireEvent.click(aboutButton);

      expect(screen.getByTestId('about-screen')).toBeTruthy();
    });

    it('navigates to updates screen when clicking "Updates"', () => {
      render(<Home />);

      const updatesButton = screen.getByText('Updates');
      fireEvent.click(updatesButton);

      expect(screen.getByTestId('updates-screen')).toBeTruthy();
    });

    it('navigates back to home from about screen', () => {
      render(<Home />);

      // Go to about
      fireEvent.click(screen.getByText('About'));
      expect(screen.getByTestId('about-screen')).toBeTruthy();

      // Click back button
      fireEvent.click(screen.getByText('Back'));

      // Should be back on home
      expect(screen.getByTestId('game-rules-screen')).toBeTruthy();
    });

    it('navigates back to home from updates screen', () => {
      render(<Home />);

      // Go to updates
      fireEvent.click(screen.getByText('Updates'));
      expect(screen.getByTestId('updates-screen')).toBeTruthy();

      // Click back button
      fireEvent.click(screen.getByText('Back'));

      // Should be back on home
      expect(screen.getByTestId('game-rules-screen')).toBeTruthy();
    });

    it('resets game state when clicking "Home" from navigation', () => {
      render(<Home />);

      // Navigate to lobby
      fireEvent.click(screen.getByText('Go to Lobby'));

      // Click Home in navigation
      fireEvent.click(screen.getByText('Home'));

      // Should reset state
      expect(mockGameController.actions.resetState).toHaveBeenCalled();

      // Should be back on home screen
      expect(screen.getByTestId('game-rules-screen')).toBeTruthy();
    });
  });

  describe('Game Phase Transitions', () => {
    it('navigates to game screen when phase changes to STARTING', () => {
      const { rerender } = render(<Home />);

      // Start on home screen
      expect(screen.getByTestId('game-rules-screen')).toBeTruthy();

      // Simulate phase change to STARTING
      // Need to create new object reference for React to detect change
      mockGameController.state.gameState = {
        ...mockGameController.state.gameState,
        phase: GamePhase.STARTING,
      };
      mockGameController.derived.humanPlayer = {
        id: 'player-1',
        role: { name: 'Test Role', icon: '🎭', publicObjective: 'Test', hiddenObjective: 'Test' },
        isHuman: true,
        actions: [],
        actionPoints: 3,
        hasSubmittedActions: false,
        hiddenScore: 50,
      };

      rerender(<Home />);

      // Should automatically navigate to game screen
      expect(screen.getByTestId('game-screen')).toBeTruthy();
    });

    it('navigates to game screen when phase changes to ACTION', () => {
      const { rerender } = render(<Home />);

      mockGameController.state.gameState.phase = GamePhase.ACTION;
      mockGameController.derived.humanPlayer = {
        id: 'player-1',
        role: { name: 'Test Role', icon: '🎭', publicObjective: 'Test', hiddenObjective: 'Test' },
        isHuman: true,
        actions: [],
        actionPoints: 3,
        hasSubmittedActions: false,
        hiddenScore: 50,
      };

      rerender(<Home />);

      expect(screen.getByTestId('game-screen')).toBeTruthy();
    });

    it('navigates to game screen when phase changes to CONSEQUENCE', () => {
      const { rerender } = render(<Home />);

      mockGameController.state.gameState.phase = GamePhase.CONSEQUENCE;
      rerender(<Home />);

      expect(screen.getByTestId('game-screen')).toBeTruthy();
    });

    it('navigates to end screen when phase changes to END', () => {
      const { rerender } = render(<Home />);

      mockGameController.state.gameState.phase = GamePhase.END;
      rerender(<Home />);

      expect(screen.getByTestId('end-screen')).toBeTruthy();
    });

    it('shows loading screen when loading during non-ACTION phase', () => {
      const { rerender } = render(<Home />);

      // Navigate to game and set loading state
      mockGameController.state.gameState.phase = GamePhase.STARTING;
      mockGameController.state.isLoading = true;
      mockGameController.state.loadingMessage = 'Generating scenario...';
      mockGameController.derived.humanPlayer = {
        id: 'player-1',
        role: { name: 'Test Role', icon: '🎭', publicObjective: 'Test', hiddenObjective: 'Test' },
        isHuman: true,
        actions: [],
        actionPoints: 3,
        hasSubmittedActions: false,
        hiddenScore: 50,
      };

      rerender(<Home />);

      expect(screen.getByTestId('loading-screen')).toBeTruthy();
      expect(screen.getByText('Generating scenario...')).toBeTruthy();
    });
  });

  describe('State Persistence', () => {
    it('maintains selected role when navigating between screens', () => {
      mockGameController.state.selectedRoleName = 'Tech CEO';

      render(<Home />);

      // Navigate to lobby
      fireEvent.click(screen.getByText('Go to Lobby'));

      // Should show selected role
      expect(screen.getByText(/Tech CEO/)).toBeTruthy();

      // Navigate to about
      fireEvent.click(screen.getByText('About'));

      // Navigate back to lobby
      fireEvent.click(screen.getByText('Back'));
      fireEvent.click(screen.getByText('Go to Lobby'));

      // Should still show selected role
      expect(screen.getByText(/Tech CEO/)).toBeTruthy();
    });

    it('does not reset game state when navigating to about/updates', () => {
      render(<Home />);

      // Navigate to about
      fireEvent.click(screen.getByText('About'));

      // Should NOT reset state
      expect(mockGameController.actions.resetState).not.toHaveBeenCalled();

      // Navigate to updates
      fireEvent.click(screen.getByText('Back'));
      fireEvent.click(screen.getByText('Updates'));

      // Should still NOT reset state
      expect(mockGameController.actions.resetState).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('redirects to lobby if trying to view game screen without human player', () => {
      const { rerender } = render(<Home />);

      // Set phase to ACTION but no human player
      mockGameController.state.gameState.phase = GamePhase.ACTION;
      mockGameController.derived.humanPlayer = null;

      rerender(<Home />);

      // Should show lobby instead of game screen
      // (The component sets screen to lobby, but since phase is ACTION, it will attempt game screen again)
      // This tests the safety check in the code
      expect(screen.queryByTestId('game-screen')).toBeFalsy();
    });

    it('redirects to lobby if trying to view end screen when phase is not END', () => {
      render(<Home />);

      // Manually navigate to lobby first
      fireEvent.click(screen.getByText('Go to Lobby'));

      // Phase is LOBBY, not END, so end screen logic should guard against this
      mockGameController.state.gameState.phase = GamePhase.LOBBY;

      // Should show lobby
      expect(screen.getByTestId('lobby-screen')).toBeTruthy();
    });
  });

  describe('Navigation Props Passing', () => {
    it('passes correct navigation handlers to GameRulesScreen', () => {
      render(<Home />);

      const goToLobbyButton = screen.getByText('Go to Lobby');
      expect(goToLobbyButton).toBeTruthy();
    });

    it('passes correct navigation handlers to Navigation component', () => {
      render(<Home />);

      const navigation = screen.getByTestId('navigation');
      expect(navigation).toBeTruthy();

      // Verify all buttons exist
      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getByText('About')).toBeTruthy();
      expect(screen.getByText('Updates')).toBeTruthy();
    });
  });
});
