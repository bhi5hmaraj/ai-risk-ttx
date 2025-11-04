/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { RouteOrchestrator } from '@/components/RouteOrchestrator';
import { GamePhase } from '@/types';
import type { Player, GameState } from '@/types';

// Mock router and pathname
let mockPathname = '/';
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
}));

// Mock game state
let mockGameState: GameState = {
  phase: GamePhase.LOBBY,
  round: 0,
  coreMetric: { name: 'Trust', description: 'Public trust', value: 100 },
  eventLog: [],
  currentEvent: null,
};

let mockPlayers: Player[] = [];

// Mock useGameStore
vi.mock('@/stores/gameStore', () => ({
  useGameStore: (selector: any) => {
    if (typeof selector === 'function') {
      return selector({ gameState: mockGameState, players: mockPlayers });
    }
    return { gameState: mockGameState, players: mockPlayers };
  },
}));

// Mock sessionStore
let mockHasStartIntent = false;
let mockSessionMeta = null as any;

vi.mock('@/stores/sessionStore', () => ({
  useSessionStore: () => ({
    hasStartIntent: mockHasStartIntent,
    sessionMeta: mockSessionMeta,
  }),
}));

describe('RouteOrchestrator - Comprehensive Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
    mockRouter.back.mockClear();

    // Reset state
    mockPathname = '/';
    mockGameState = {
      phase: GamePhase.LOBBY,
      round: 0,
      coreMetric: { name: 'Trust', description: 'Public trust', value: 100 },
      eventLog: [],
      currentEvent: null,
    };
    mockPlayers = [];
    mockHasStartIntent = false;
    mockSessionMeta = null;
  });

  describe('GamePhase.END - Always routes to /end', () => {
    it('should redirect to /end when phase is END and on home', () => {
      mockPathname = '/';
      mockGameState.phase = GamePhase.END;

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/end');
    });

    it('should redirect to /end when phase is END and on /game', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.END;

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/end');
    });

    it('should redirect to /end when phase is END and on /lobby', () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.END;

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/end');
    });

    it('should NOT redirect when already on /end', () => {
      mockPathname = '/end';
      mockGameState.phase = GamePhase.END;

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('GamePhase.STARTING - Routes to /game', () => {
    it('should redirect to /game when phase is STARTING', () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.STARTING;
      mockHasStartIntent = true;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/game');
    });

    it('should not redirect when already on /game during STARTING', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.STARTING;
      mockHasStartIntent = true;

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('GamePhase.ACTION - Routes to /game', () => {
    it('should redirect to /game when phase is ACTION', () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.ACTION;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/game');
    });

    it('should stay on /game when phase is ACTION', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.ACTION;

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('GamePhase.CONSEQUENCE - Routes to /game', () => {
    it('should redirect to /game when phase is CONSEQUENCE', () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.CONSEQUENCE;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/game');
    });

    it('should stay on /game when phase is CONSEQUENCE', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.CONSEQUENCE;

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('hasStartIntent Logic', () => {
    it('should allow /game access with hasStartIntent=true and players', () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = true;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/game');
    });

    it('should allow /game access with hasStartIntent=true and sessionMeta', () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = true;
      mockSessionMeta = { id: 'session-123', revision: 1, hostToken: 'token' };

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/game');
    });

    it('should NOT allow /game without hasStartIntent', () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = false;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).not.toHaveBeenCalledWith('/game');
    });
  });

  describe('Guard: Redirect /game to /lobby when invalid', () => {
    it('should redirect to /lobby when on /game with LOBBY phase and no start intent', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = false;
      mockPlayers = [];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/lobby');
    });

    it('should NOT redirect when on /game with players', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = false;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      render(<RouteOrchestrator />);

      // Should NOT redirect because players exist (ongoing game)
      expect(mockRouter.replace).not.toHaveBeenCalledWith('/lobby');
    });

    it('should redirect when on /game with sessionMeta but no players or startIntent', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = false;
      mockPlayers = [];
      mockSessionMeta = { id: 'session-123', revision: 1, hostToken: 'token' };

      render(<RouteOrchestrator />);

      // SHOULD redirect because sessionMeta alone without hasStartIntent or players
      // doesn't grant access to /game
      expect(mockRouter.replace).toHaveBeenCalledWith('/lobby');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mid-game page refresh (players present, ACTION phase)', () => {
      mockPathname = '/';
      mockGameState.phase = GamePhase.ACTION;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/game');
    });

    it('should handle game start flow (LOBBY → hasStartIntent → /game)', () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = true;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/game');
    });

    it('should handle game end flow (GAME → END → /end)', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.END;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/end');
    });

    it('should not cause navigation loop (already on correct path)', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.ACTION;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('should allow staying on /lobby during LOBBY phase', () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = false;
      mockPlayers = [];

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty players array with hasStartIntent and sessionMeta', () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = true;
      mockPlayers = [];
      mockSessionMeta = { id: 'session-123', revision: 1, hostToken: 'token' };

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/game');
    });

    it('should handle direct /game access without any context (redirect to /lobby)', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = false;
      mockPlayers = [];
      mockSessionMeta = null;

      render(<RouteOrchestrator />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/lobby');
    });

    it('should prioritize END phase over all other logic', () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.END;
      mockHasStartIntent = true;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];
      mockSessionMeta = { id: 'session-123', revision: 1, hostToken: 'token' };

      render(<RouteOrchestrator />);

      // Should redirect to /end even though all game conditions are met
      expect(mockRouter.replace).toHaveBeenCalledWith('/end');
    });
  });

  describe('Reactivity to State Changes', () => {
    it('should react to gamePhase changes', async () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.ACTION;

      const { rerender } = render(<RouteOrchestrator />);

      expect(mockRouter.replace).not.toHaveBeenCalled();

      // Change phase to END
      mockGameState = { ...mockGameState, phase: GamePhase.END };
      rerender(<RouteOrchestrator />);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/end');
      });
    });

    it('should react to hasStartIntent changes', async () => {
      mockPathname = '/lobby';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = false;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      const { rerender } = render(<RouteOrchestrator />);

      expect(mockRouter.replace).not.toHaveBeenCalled();

      // Set start intent
      mockHasStartIntent = true;
      rerender(<RouteOrchestrator />);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/game');
      });
    });

    it('should react to players length changes', async () => {
      mockPathname = '/game';
      mockGameState.phase = GamePhase.LOBBY;
      mockHasStartIntent = false;
      mockPlayers = [{ id: '1', roleName: 'Test', isHuman: true } as Player];

      const { rerender } = render(<RouteOrchestrator />);

      expect(mockRouter.replace).not.toHaveBeenCalled();

      // Clear players
      mockPlayers = [];
      rerender(<RouteOrchestrator />);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/lobby');
      });
    });
  });
});
