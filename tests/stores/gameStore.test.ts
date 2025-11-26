import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/stores/gameStore';
import { GamePhase } from '@/types';
import type { Player, GameLogEntry } from '@/types';

describe('gameStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useGameStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have correct initial gameState', () => {
      const { gameState } = useGameStore.getState();

      expect(gameState.phase).toBe(GamePhase.LOBBY);
      expect(gameState.round).toBe(0);
      expect(gameState.coreMetric.name).toBe('Democratic Legitimacy');
      expect(gameState.coreMetric.value).toBe(100);
      expect(gameState.eventLog).toEqual([]);
      expect(gameState.currentEvent).toBeNull();
    });

    it('should have empty players array', () => {
      const { players } = useGameStore.getState();
      expect(players).toEqual([]);
    });

    it('should have null gameSetup', () => {
      const { gameSetup } = useGameStore.getState();
      expect(gameSetup).toBeNull();
    });
  });

  describe('setGameState', () => {
    it('should update gameState with new object', () => {
      const newGameState = {
        phase: GamePhase.ACTION,
        round: 1,
        coreMetric: { name: 'Trust', description: 'Public trust', value: 90 },
        eventLog: [],
        currentEvent: null,
      };

      useGameStore.getState().setGameState(newGameState);

      const { gameState } = useGameStore.getState();
      expect(gameState).toEqual(newGameState);
      expect(gameState.phase).toBe(GamePhase.ACTION);
      expect(gameState.round).toBe(1);
      expect(gameState.coreMetric.value).toBe(90);
    });

    it('should update gameState with updater function', () => {
      useGameStore.getState().setGameState((prev) => ({
        ...prev,
        round: prev.round + 1,
        phase: GamePhase.ACTION,
      }));

      const { gameState } = useGameStore.getState();
      expect(gameState.round).toBe(1);
      expect(gameState.phase).toBe(GamePhase.ACTION);
    });

    it('should preserve other gameState properties when using updater', () => {
      useGameStore.getState().setGameState((prev) => ({
        ...prev,
        round: 5,
      }));

      const { gameState } = useGameStore.getState();
      expect(gameState.round).toBe(5);
      expect(gameState.coreMetric.name).toBe('Democratic Legitimacy');
      expect(gameState.eventLog).toEqual([]);
    });
  });

  describe('setPlayers', () => {
    it('should set players array', () => {
      const mockPlayers: Player[] = [
        {
          id: '1',
          roleName: 'Tech CEO',
          isHuman: true,
          isHost: true,
          hiddenScore: 0,
          actions: [],
          hasSubmittedActions: false,
        },
        {
          id: '2',
          roleName: 'Journalist',
          isHuman: false,
          isHost: false,
          hiddenScore: 0,
          actions: [],
          hasSubmittedActions: false,
        },
      ];

      useGameStore.getState().setPlayers(mockPlayers);

      const { players } = useGameStore.getState();
      expect(players).toHaveLength(2);
      expect(players[0].roleName).toBe('Tech CEO');
      expect(players[1].roleName).toBe('Journalist');
    });

    it('should update players with updater function', () => {
      const initialPlayers: Player[] = [
        {
          id: '1',
          roleName: 'Tech CEO',
          isHuman: true,
          isHost: true,
          hiddenScore: 0,
          actions: [],
          hasSubmittedActions: false,
        },
      ];

      useGameStore.getState().setPlayers(initialPlayers);

      // Update using function
      useGameStore.getState().setPlayers((prev) =>
        prev.map((p) => ({ ...p, hasSubmittedActions: true }))
      );

      const { players } = useGameStore.getState();
      expect(players[0].hasSubmittedActions).toBe(true);
    });
  });

  describe('humanPlayer', () => {
    it('should return null when no players', () => {
      const humanPlayer = useGameStore.getState().humanPlayer();
      expect(humanPlayer).toBeNull();
    });

    it('should return human player when present', () => {
      const mockPlayers: Player[] = [
        {
          id: '1',
          roleName: 'Tech CEO',
          isHuman: false,
          isHost: false,
          hiddenScore: 0,
          actions: [],
          hasSubmittedActions: false,
        },
        {
          id: '2',
          roleName: 'Journalist',
          isHuman: true,
          isHost: true,
          hiddenScore: 10,
          actions: [],
          hasSubmittedActions: false,
        },
      ];

      useGameStore.getState().setPlayers(mockPlayers);

      const humanPlayer = useGameStore.getState().humanPlayer();
      expect(humanPlayer).not.toBeNull();
      expect(humanPlayer?.roleName).toBe('Journalist');
      expect(humanPlayer?.isHuman).toBe(true);
    });

    it('should return first human player when multiple humans', () => {
      const mockPlayers: Player[] = [
        {
          id: '1',
          roleName: 'Tech CEO',
          isHuman: true,
          isHost: true,
          hiddenScore: 0,
          actions: [],
          hasSubmittedActions: false,
        },
        {
          id: '2',
          roleName: 'Journalist',
          isHuman: true,
          isHost: false,
          hiddenScore: 0,
          actions: [],
          hasSubmittedActions: false,
        },
      ];

      useGameStore.getState().setPlayers(mockPlayers);

      const humanPlayer = useGameStore.getState().humanPlayer();
      expect(humanPlayer?.roleName).toBe('Tech CEO');
    });
  });

  describe('latestLogEntry', () => {
    it('should return null when eventLog is empty', () => {
      const latestEntry = useGameStore.getState().latestLogEntry();
      expect(latestEntry).toBeNull();
    });

    it('should return last entry in eventLog', () => {
      const mockLogEntries: GameLogEntry[] = [
        {
          round: 1,
          event: 'First event',
          availableOptions: {},
          allPlayerActions: [],
          coreMetricChange: 0,
          coreMetricAfter: 100,
          scoreChanges: {},
        },
        {
          round: 2,
          event: 'Second event',
          availableOptions: {},
          allPlayerActions: [],
          coreMetricChange: -5,
          coreMetricAfter: 95,
          scoreChanges: {},
        },
      ];

      useGameStore.getState().setGameState((prev) => ({
        ...prev,
        eventLog: mockLogEntries,
      }));

      const latestEntry = useGameStore.getState().latestLogEntry();
      expect(latestEntry).not.toBeNull();
      expect(latestEntry?.round).toBe(2);
      expect(latestEntry?.event).toBe('Second event');
    });
  });

  describe('setGameSetup', () => {
    it('should set gameSetup', () => {
      const mockSetup = {
        scenario: {
          title: 'AI Crisis',
          description: 'Test scenario',
          initialEvent: 'Crisis begins',
          coreMetric: { name: 'Trust', description: 'Public trust', value: 100 },
        },
        playerSetup: [
          {
            roleName: 'Tech CEO',
            publicObjective: 'Test objective',
            hiddenObjective: 'Hidden objective',
            isHuman: true,
          },
        ],
      };

      useGameStore.getState().setGameSetup(mockSetup);

      const { gameSetup } = useGameStore.getState();
      expect(gameSetup).toEqual(mockSetup);
      expect(gameSetup?.scenario.title).toBe('AI Crisis');
    });

    it('should update gameSetup with updater function', () => {
      const initialSetup = {
        scenario: {
          title: 'Initial',
          description: 'Test',
          initialEvent: 'Event',
          coreMetric: { name: 'Trust', description: 'Trust', value: 100 },
        },
        playerSetup: [],
      };

      useGameStore.getState().setGameSetup(initialSetup);

      useGameStore.getState().setGameSetup((prev) =>
        prev ? { ...prev, scenario: { ...prev.scenario, title: 'Updated' } } : prev
      );

      const { gameSetup } = useGameStore.getState();
      expect(gameSetup?.scenario.title).toBe('Updated');
    });

    it('should allow setting to null', () => {
      const mockSetup = {
        scenario: {
          title: 'Test',
          description: 'Test',
          initialEvent: 'Event',
          coreMetric: { name: 'Trust', description: 'Trust', value: 100 },
        },
        playerSetup: [],
      };

      useGameStore.getState().setGameSetup(mockSetup);
      expect(useGameStore.getState().gameSetup).not.toBeNull();

      useGameStore.getState().setGameSetup(null);
      expect(useGameStore.getState().gameSetup).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Modify all state
      useGameStore.getState().setGameState({
        phase: GamePhase.END,
        round: 5,
        coreMetric: { name: 'Custom', description: 'Custom metric', value: 50 },
        eventLog: [
          {
            round: 1,
            event: 'Test',
            availableOptions: {},
            allPlayerActions: [],
            coreMetricChange: 0,
            coreMetricAfter: 100,
            scoreChanges: {},
          },
        ],
        currentEvent: 'Test event',
      });

      useGameStore.getState().setPlayers([
        {
          id: '1',
          roleName: 'Test',
          isHuman: true,
          isHost: true,
          hiddenScore: 10,
          actions: [],
          hasSubmittedActions: true,
        },
      ]);

      useGameStore.getState().setGameSetup({
        scenario: {
          title: 'Test',
          description: 'Test',
          initialEvent: 'Test',
          coreMetric: { name: 'Test', description: 'Test', value: 100 },
        },
        playerSetup: [],
      });

      // Reset
      useGameStore.getState().reset();

      // Verify reset
      const state = useGameStore.getState();
      expect(state.gameState.phase).toBe(GamePhase.LOBBY);
      expect(state.gameState.round).toBe(0);
      expect(state.gameState.coreMetric.name).toBe('Democratic Legitimacy');
      expect(state.gameState.coreMetric.value).toBe(100);
      expect(state.gameState.eventLog).toEqual([]);
      expect(state.gameState.currentEvent).toBeNull();
      expect(state.players).toEqual([]);
      expect(state.gameSetup).toBeNull();
    });
  });
});
