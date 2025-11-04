import { describe, it, expect, beforeEach } from 'vitest';
import { useLobbyStore } from '@/stores/lobbyStore';

describe('lobbyStore', () => {
  beforeEach(() => {
    useLobbyStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useLobbyStore.getState();

      expect(state.selectedRoleName).toBeNull();
      expect(state.gamePath).toBeNull();
      expect(state.gameSetup).toBeNull();
      expect(state.customScenario).toBe('');
    });
  });

  describe('setSelectedRoleName', () => {
    it('should set selected role name', () => {
      useLobbyStore.getState().setSelectedRoleName('Tech CEO');

      const { selectedRoleName } = useLobbyStore.getState();
      expect(selectedRoleName).toBe('Tech CEO');
    });

    it('should change selected role', () => {
      useLobbyStore.getState().setSelectedRoleName('Tech CEO');
      useLobbyStore.getState().setSelectedRoleName('Journalist');

      const { selectedRoleName } = useLobbyStore.getState();
      expect(selectedRoleName).toBe('Journalist');
    });

    it('should clear selected role', () => {
      useLobbyStore.getState().setSelectedRoleName('Tech CEO');
      useLobbyStore.getState().setSelectedRoleName(null);

      const { selectedRoleName } = useLobbyStore.getState();
      expect(selectedRoleName).toBeNull();
    });
  });

  describe('setGamePath', () => {
    it('should set classic game path', () => {
      useLobbyStore.getState().setGamePath('classic');

      const { gamePath } = useLobbyStore.getState();
      expect(gamePath).toBe('classic');
    });

    it('should set custom game path', () => {
      useLobbyStore.getState().setGamePath('custom');

      const { gamePath } = useLobbyStore.getState();
      expect(gamePath).toBe('custom');
    });

    it('should set ai_safety game path', () => {
      useLobbyStore.getState().setGamePath('ai_safety');

      const { gamePath } = useLobbyStore.getState();
      expect(gamePath).toBe('ai_safety');
    });

    it('should change game path', () => {
      useLobbyStore.getState().setGamePath('classic');
      useLobbyStore.getState().setGamePath('ai_safety');

      const { gamePath } = useLobbyStore.getState();
      expect(gamePath).toBe('ai_safety');
    });

    it('should clear game path', () => {
      useLobbyStore.getState().setGamePath('classic');
      useLobbyStore.getState().setGamePath(null);

      const { gamePath } = useLobbyStore.getState();
      expect(gamePath).toBeNull();
    });
  });

  describe('setGameSetup', () => {
    it('should set game setup', () => {
      const mockSetup = {
        scenario: {
          title: 'Election Crisis',
          description: 'A crisis scenario',
          initialEvent: 'Crisis begins',
          coreMetric: { name: 'Trust', description: 'Public trust', value: 100 },
        },
        playerSetup: [
          {
            roleName: 'Tech CEO',
            publicObjective: 'Protect reputation',
            hiddenObjective: 'Maximize profit',
            isHuman: true,
          },
        ],
      };

      useLobbyStore.getState().setGameSetup(mockSetup);

      const { gameSetup } = useLobbyStore.getState();
      expect(gameSetup).toEqual(mockSetup);
      expect(gameSetup?.scenario.title).toBe('Election Crisis');
      expect(gameSetup?.playerSetup).toHaveLength(1);
    });

    it('should clear game setup', () => {
      const mockSetup = {
        scenario: {
          title: 'Test',
          description: 'Test',
          initialEvent: 'Test',
          coreMetric: { name: 'Test', description: 'Test', value: 100 },
        },
        playerSetup: [],
      };

      useLobbyStore.getState().setGameSetup(mockSetup);
      useLobbyStore.getState().setGameSetup(null);

      const { gameSetup } = useLobbyStore.getState();
      expect(gameSetup).toBeNull();
    });
  });

  describe('setCustomScenario', () => {
    it('should set custom scenario text', () => {
      const scenarioText = 'A global pandemic threatens humanity...';

      useLobbyStore.getState().setCustomScenario(scenarioText);

      const { customScenario } = useLobbyStore.getState();
      expect(customScenario).toBe(scenarioText);
    });

    it('should update custom scenario text', () => {
      useLobbyStore.getState().setCustomScenario('First version');
      useLobbyStore.getState().setCustomScenario('Second version');

      const { customScenario } = useLobbyStore.getState();
      expect(customScenario).toBe('Second version');
    });

    it('should clear custom scenario', () => {
      useLobbyStore.getState().setCustomScenario('Some text');
      useLobbyStore.getState().setCustomScenario('');

      const { customScenario } = useLobbyStore.getState();
      expect(customScenario).toBe('');
    });
  });

  describe('reset', () => {
    it('should reset all lobby state', () => {
      // Set all state
      useLobbyStore.getState().setSelectedRoleName('Tech CEO');
      useLobbyStore.getState().setGamePath('ai_safety');
      useLobbyStore.getState().setGameSetup({
        scenario: {
          title: 'Test',
          description: 'Test',
          initialEvent: 'Test',
          coreMetric: { name: 'Test', description: 'Test', value: 100 },
        },
        playerSetup: [],
      });
      useLobbyStore.getState().setCustomScenario('Custom scenario text');

      // Reset
      useLobbyStore.getState().reset();

      // Verify reset
      const state = useLobbyStore.getState();
      expect(state.selectedRoleName).toBeNull();
      expect(state.gamePath).toBeNull();
      expect(state.gameSetup).toBeNull();
      expect(state.customScenario).toBe('');
    });
  });

  describe('Lobby Flow', () => {
    it('should handle classic game selection flow', () => {
      // 1. User enters lobby
      let state = useLobbyStore.getState();
      expect(state.selectedRoleName).toBeNull();
      expect(state.gamePath).toBeNull();

      // 2. User selects role
      useLobbyStore.getState().setSelectedRoleName('Tech CEO');
      state = useLobbyStore.getState();
      expect(state.selectedRoleName).toBe('Tech CEO');

      // 3. User selects classic path
      useLobbyStore.getState().setGamePath('classic');
      state = useLobbyStore.getState();
      expect(state.gamePath).toBe('classic');

      // 4. Game setup generated (by useGameController)
      const mockSetup = {
        scenario: {
          title: 'Election Crisis',
          description: 'Crisis',
          initialEvent: 'Event',
          coreMetric: { name: 'Trust', description: 'Trust', value: 100 },
        },
        playerSetup: [
          {
            roleName: 'Tech CEO',
            publicObjective: 'Test',
            hiddenObjective: 'Test',
            isHuman: true,
          },
        ],
      };
      useLobbyStore.getState().setGameSetup(mockSetup);
      state = useLobbyStore.getState();
      expect(state.gameSetup).not.toBeNull();

      // 5. User starts game and returns to lobby later
      useLobbyStore.getState().reset();
      state = useLobbyStore.getState();
      expect(state.selectedRoleName).toBeNull();
      expect(state.gamePath).toBeNull();
    });

    it('should handle custom scenario flow', () => {
      // 1. User selects custom path
      useLobbyStore.getState().setGamePath('custom');

      // 2. User writes custom scenario
      useLobbyStore.getState().setCustomScenario('A new kind of crisis...');

      // 3. User selects role
      useLobbyStore.getState().setSelectedRoleName('Journalist');

      const state = useLobbyStore.getState();
      expect(state.gamePath).toBe('custom');
      expect(state.customScenario).toBe('A new kind of crisis...');
      expect(state.selectedRoleName).toBe('Journalist');
    });

    it('should allow role switching before start', () => {
      useLobbyStore.getState().setSelectedRoleName('Tech CEO');
      useLobbyStore.getState().setSelectedRoleName('Campaign Manager');
      useLobbyStore.getState().setSelectedRoleName('Journalist');

      const { selectedRoleName } = useLobbyStore.getState();
      expect(selectedRoleName).toBe('Journalist');
    });

    it('should allow path switching before start', () => {
      useLobbyStore.getState().setGamePath('classic');
      useLobbyStore.getState().setGamePath('ai_safety');

      const { gamePath } = useLobbyStore.getState();
      expect(gamePath).toBe('ai_safety');
    });
  });
});
