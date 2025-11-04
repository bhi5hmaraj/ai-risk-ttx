import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useUIStore.getState();

      expect(state.isLoading).toBe(false);
      expect(state.loadingMessage).toBe('');
      expect(state.error).toBeNull();
      expect(state.isActionTreeOpen).toBe(false);
      expect(state.isHistoryOpen).toBe(true);
      expect(state.expandedRound).toBeNull();
    });

    it('should have all startProgress steps as idle', () => {
      const { startProgress } = useUIStore.getState();

      expect(startProgress.creatingSession).toBe('idle');
      expect(startProgress.buildingPlayers).toBe('idle');
      expect(startProgress.generatingScenario).toBe('idle');
      expect(startProgress.connectingStream).toBe('idle');
      expect(startProgress.ready).toBe('idle');
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useUIStore.getState().setLoading(true, 'Loading game...');

      const { isLoading, loadingMessage } = useUIStore.getState();
      expect(isLoading).toBe(true);
      expect(loadingMessage).toBe('Loading game...');
    });

    it('should set loading without message', () => {
      useUIStore.getState().setLoading(true);

      const { isLoading, loadingMessage } = useUIStore.getState();
      expect(isLoading).toBe(true);
      expect(loadingMessage).toBe('');
    });

    it('should clear loading', () => {
      useUIStore.getState().setLoading(true, 'Loading...');
      useUIStore.getState().setLoading(false);

      const { isLoading, loadingMessage } = useUIStore.getState();
      expect(isLoading).toBe(false);
      expect(loadingMessage).toBe('');
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      useUIStore.getState().setError('Something went wrong');

      const { error } = useUIStore.getState();
      expect(error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      useUIStore.getState().setError('Error');
      useUIStore.getState().setError(null);

      const { error } = useUIStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setActionTreeOpen', () => {
    it('should open action tree', () => {
      useUIStore.getState().setActionTreeOpen(true);

      const { isActionTreeOpen } = useUIStore.getState();
      expect(isActionTreeOpen).toBe(true);
    });

    it('should close action tree', () => {
      useUIStore.getState().setActionTreeOpen(true);
      useUIStore.getState().setActionTreeOpen(false);

      const { isActionTreeOpen } = useUIStore.getState();
      expect(isActionTreeOpen).toBe(false);
    });
  });

  describe('setHistoryOpen', () => {
    it('should open history', () => {
      useUIStore.getState().setHistoryOpen(false);
      useUIStore.getState().setHistoryOpen(true);

      const { isHistoryOpen } = useUIStore.getState();
      expect(isHistoryOpen).toBe(true);
    });

    it('should close history', () => {
      useUIStore.getState().setHistoryOpen(false);

      const { isHistoryOpen } = useUIStore.getState();
      expect(isHistoryOpen).toBe(false);
    });

    it('should clear expandedRound when closing history', () => {
      useUIStore.getState().setExpandedRound(2);
      useUIStore.getState().setHistoryOpen(false);

      const { expandedRound } = useUIStore.getState();
      // Store implementation sets to undefined, not null
      expect(expandedRound).toBeUndefined();
    });

    it('should clear expandedRound when opening history', () => {
      // Note: Store implementation clears expandedRound when opening history
      useUIStore.getState().setExpandedRound(3);
      useUIStore.getState().setHistoryOpen(true);

      const { expandedRound, isHistoryOpen } = useUIStore.getState();
      expect(isHistoryOpen).toBe(true);
      // expandedRound is cleared when history opens (see uiStore.ts line 48)
      expect(expandedRound).toBeNull();
    });
  });

  describe('setExpandedRound', () => {
    it('should set expanded round', () => {
      useUIStore.getState().setExpandedRound(2);

      const { expandedRound } = useUIStore.getState();
      expect(expandedRound).toBe(2);
    });

    it('should clear expanded round', () => {
      useUIStore.getState().setExpandedRound(3);
      useUIStore.getState().setExpandedRound(null);

      const { expandedRound } = useUIStore.getState();
      expect(expandedRound).toBeNull();
    });

    it('should change expanded round', () => {
      useUIStore.getState().setExpandedRound(1);
      useUIStore.getState().setExpandedRound(4);

      const { expandedRound } = useUIStore.getState();
      expect(expandedRound).toBe(4);
    });
  });

  describe('setStartProgress', () => {
    it('should update multiple progress steps', () => {
      useUIStore.getState().setStartProgress({
        creatingSession: 'running',
        buildingPlayers: 'running',
      });

      const { startProgress } = useUIStore.getState();
      expect(startProgress.creatingSession).toBe('running');
      expect(startProgress.buildingPlayers).toBe('running');
      expect(startProgress.generatingScenario).toBe('idle');
    });

    it('should partially update progress', () => {
      useUIStore.getState().setStartProgress({
        creatingSession: 'done',
      });

      const { startProgress } = useUIStore.getState();
      expect(startProgress.creatingSession).toBe('done');
      expect(startProgress.buildingPlayers).toBe('idle');
    });
  });

  describe('setStartStep', () => {
    it('should update single progress step', () => {
      useUIStore.getState().setStartStep('creatingSession', 'running');

      const { startProgress } = useUIStore.getState();
      expect(startProgress.creatingSession).toBe('running');
    });

    it('should complete progress step', () => {
      useUIStore.getState().setStartStep('buildingPlayers', 'running');
      useUIStore.getState().setStartStep('buildingPlayers', 'done');

      const { startProgress } = useUIStore.getState();
      expect(startProgress.buildingPlayers).toBe('done');
    });

    it('should set error state', () => {
      useUIStore.getState().setStartStep('generatingScenario', 'error');

      const { startProgress } = useUIStore.getState();
      expect(startProgress.generatingScenario).toBe('error');
    });

    it('should not affect other steps', () => {
      useUIStore.getState().setStartStep('creatingSession', 'done');
      useUIStore.getState().setStartStep('buildingPlayers', 'running');

      const { startProgress } = useUIStore.getState();
      expect(startProgress.creatingSession).toBe('done');
      expect(startProgress.buildingPlayers).toBe('running');
      expect(startProgress.generatingScenario).toBe('idle');
    });
  });

  describe('reset', () => {
    it('should reset all UI state', () => {
      // Modify all state
      useUIStore.getState().setLoading(true, 'Loading...');
      useUIStore.getState().setError('Test error');
      useUIStore.getState().setActionTreeOpen(true);
      useUIStore.getState().setHistoryOpen(false);
      useUIStore.getState().setExpandedRound(3);
      useUIStore.getState().setStartProgress({
        creatingSession: 'done',
        buildingPlayers: 'running',
        generatingScenario: 'error',
      });

      // Reset
      useUIStore.getState().reset();

      // Verify reset
      const state = useUIStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.loadingMessage).toBe('');
      expect(state.error).toBeNull();
      expect(state.isActionTreeOpen).toBe(false);
      expect(state.isHistoryOpen).toBe(true);
      expect(state.expandedRound).toBeNull();
      expect(state.startProgress.creatingSession).toBe('idle');
      expect(state.startProgress.buildingPlayers).toBe('idle');
      expect(state.startProgress.generatingScenario).toBe('idle');
      expect(state.startProgress.connectingStream).toBe('idle');
      expect(state.startProgress.ready).toBe('idle');
    });
  });

  describe('StartProgress Flow', () => {
    it('should simulate complete start flow', () => {
      // Step 1: Creating session
      useUIStore.getState().setStartStep('creatingSession', 'running');
      expect(useUIStore.getState().startProgress.creatingSession).toBe('running');

      useUIStore.getState().setStartStep('creatingSession', 'done');
      expect(useUIStore.getState().startProgress.creatingSession).toBe('done');

      // Step 2: Building players
      useUIStore.getState().setStartStep('buildingPlayers', 'running');
      expect(useUIStore.getState().startProgress.buildingPlayers).toBe('running');

      useUIStore.getState().setStartStep('buildingPlayers', 'done');
      expect(useUIStore.getState().startProgress.buildingPlayers).toBe('done');

      // Step 3: Generating scenario
      useUIStore.getState().setStartStep('generatingScenario', 'running');
      expect(useUIStore.getState().startProgress.generatingScenario).toBe('running');

      useUIStore.getState().setStartStep('generatingScenario', 'done');
      expect(useUIStore.getState().startProgress.generatingScenario).toBe('done');

      // Step 4: Connecting stream
      useUIStore.getState().setStartStep('connectingStream', 'running');
      expect(useUIStore.getState().startProgress.connectingStream).toBe('running');

      useUIStore.getState().setStartStep('connectingStream', 'done');
      expect(useUIStore.getState().startProgress.connectingStream).toBe('done');

      // Step 5: Ready
      useUIStore.getState().setStartStep('ready', 'done');
      expect(useUIStore.getState().startProgress.ready).toBe('done');

      // All steps should be done
      const { startProgress } = useUIStore.getState();
      expect(startProgress.creatingSession).toBe('done');
      expect(startProgress.buildingPlayers).toBe('done');
      expect(startProgress.generatingScenario).toBe('done');
      expect(startProgress.connectingStream).toBe('done');
      expect(startProgress.ready).toBe('done');
    });

    it('should handle error during start flow', () => {
      useUIStore.getState().setStartStep('creatingSession', 'running');
      useUIStore.getState().setStartStep('creatingSession', 'error');

      const { startProgress } = useUIStore.getState();
      expect(startProgress.creatingSession).toBe('error');
      expect(startProgress.buildingPlayers).toBe('idle');
    });
  });
});
