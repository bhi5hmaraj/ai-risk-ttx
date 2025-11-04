import { describe, it, expect, beforeEach } from 'vitest';
import { useActionStore } from '@/stores/actionStore';
import type { ActionOption } from '@/types';

describe('actionStore', () => {
  beforeEach(() => {
    useActionStore.getState().resetRound();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useActionStore.getState();

      expect(state.actionOptions).toEqual([]);
      expect(state.aiCompletionStatus).toEqual({});
      expect(state.llmCallsThisRound).toBe(0);
      expect(state.chatHistory).toBeNull();
    });
  });

  describe('setActionOptions', () => {
    it('should set action options', () => {
      const mockOptions: ActionOption[] = [
        { title: 'Action 1', description: 'Desc 1', cost: 1 },
        { title: 'Action 2', description: 'Desc 2', cost: 2 },
        { title: 'Action 3', description: 'Desc 3', cost: 3 },
      ];

      useActionStore.getState().setActionOptions(mockOptions);

      const { actionOptions } = useActionStore.getState();
      expect(actionOptions).toHaveLength(3);
      expect(actionOptions[0].title).toBe('Action 1');
      expect(actionOptions[2].cost).toBe(3);
    });

    it('should replace existing action options', () => {
      const firstOptions: ActionOption[] = [
        { title: 'Old 1', description: 'Desc', cost: 1 },
      ];

      const newOptions: ActionOption[] = [
        { title: 'New 1', description: 'Desc', cost: 2 },
        { title: 'New 2', description: 'Desc', cost: 3 },
      ];

      useActionStore.getState().setActionOptions(firstOptions);
      useActionStore.getState().setActionOptions(newOptions);

      const { actionOptions } = useActionStore.getState();
      expect(actionOptions).toHaveLength(2);
      expect(actionOptions[0].title).toBe('New 1');
    });

    it('should clear action options', () => {
      const mockOptions: ActionOption[] = [
        { title: 'Action 1', description: 'Desc', cost: 1 },
      ];

      useActionStore.getState().setActionOptions(mockOptions);
      useActionStore.getState().setActionOptions([]);

      const { actionOptions } = useActionStore.getState();
      expect(actionOptions).toEqual([]);
    });
  });

  describe('setAICompletionStatus', () => {
    it('should set AI completion status', () => {
      const mockStatus = {
        'Tech CEO': true,
        Journalist: false,
        'Campaign Manager': true,
      };

      useActionStore.getState().setAICompletionStatus(mockStatus);

      const { aiCompletionStatus } = useActionStore.getState();
      expect(aiCompletionStatus).toEqual(mockStatus);
      expect(aiCompletionStatus['Tech CEO']).toBe(true);
      expect(aiCompletionStatus.Journalist).toBe(false);
    });

    it('should replace existing completion status', () => {
      useActionStore.getState().setAICompletionStatus({ Role1: true });
      useActionStore.getState().setAICompletionStatus({ Role2: false, Role3: true });

      const { aiCompletionStatus } = useActionStore.getState();
      expect(aiCompletionStatus).toEqual({ Role2: false, Role3: true });
      expect(aiCompletionStatus.Role1).toBeUndefined();
    });
  });

  describe('updateAICompletion', () => {
    it('should update single AI completion', () => {
      useActionStore.getState().updateAICompletion('Tech CEO', true);

      const { aiCompletionStatus } = useActionStore.getState();
      expect(aiCompletionStatus['Tech CEO']).toBe(true);
    });

    it('should add to existing completion status', () => {
      useActionStore.getState().updateAICompletion('Tech CEO', true);
      useActionStore.getState().updateAICompletion('Journalist', false);

      const { aiCompletionStatus } = useActionStore.getState();
      expect(aiCompletionStatus['Tech CEO']).toBe(true);
      expect(aiCompletionStatus.Journalist).toBe(false);
    });

    it('should update existing completion', () => {
      useActionStore.getState().updateAICompletion('Tech CEO', false);
      useActionStore.getState().updateAICompletion('Tech CEO', true);

      const { aiCompletionStatus } = useActionStore.getState();
      expect(aiCompletionStatus['Tech CEO']).toBe(true);
    });

    it('should handle multiple role updates', () => {
      useActionStore.getState().updateAICompletion('Role1', false);
      useActionStore.getState().updateAICompletion('Role2', false);
      useActionStore.getState().updateAICompletion('Role3', false);
      useActionStore.getState().updateAICompletion('Role1', true);
      useActionStore.getState().updateAICompletion('Role2', true);

      const { aiCompletionStatus } = useActionStore.getState();
      expect(aiCompletionStatus.Role1).toBe(true);
      expect(aiCompletionStatus.Role2).toBe(true);
      expect(aiCompletionStatus.Role3).toBe(false);
    });
  });

  describe('incrementLLMCalls', () => {
    it('should increment LLM call count', () => {
      useActionStore.getState().incrementLLMCalls();

      const { llmCallsThisRound } = useActionStore.getState();
      expect(llmCallsThisRound).toBe(1);
    });

    it('should increment multiple times', () => {
      useActionStore.getState().incrementLLMCalls();
      useActionStore.getState().incrementLLMCalls();
      useActionStore.getState().incrementLLMCalls();

      const { llmCallsThisRound } = useActionStore.getState();
      expect(llmCallsThisRound).toBe(3);
    });

    it('should continue incrementing from current value', () => {
      useActionStore.getState().incrementLLMCalls();
      useActionStore.getState().incrementLLMCalls();

      const beforeReset = useActionStore.getState().llmCallsThisRound;
      expect(beforeReset).toBe(2);

      useActionStore.getState().incrementLLMCalls();

      const { llmCallsThisRound } = useActionStore.getState();
      expect(llmCallsThisRound).toBe(3);
    });
  });

  describe('resetRound', () => {
    it('should reset all round-specific state', () => {
      // Set all state
      const mockOptions: ActionOption[] = [
        { title: 'Action 1', description: 'Desc', cost: 1 },
      ];

      useActionStore.getState().setActionOptions(mockOptions);
      useActionStore.getState().setAICompletionStatus({
        'Tech CEO': true,
        Journalist: false,
      });
      useActionStore.getState().incrementLLMCalls();
      useActionStore.getState().incrementLLMCalls();

      // Reset
      useActionStore.getState().resetRound();

      // Verify reset
      const state = useActionStore.getState();
      expect(state.actionOptions).toEqual([]);
      expect(state.aiCompletionStatus).toEqual({});
      expect(state.llmCallsThisRound).toBe(0);
      expect(state.chatHistory).toBeNull();
    });
  });

  describe('Action Round Flow', () => {
    it('should simulate complete action round', () => {
      // 1. Start of round - no options yet
      let state = useActionStore.getState();
      expect(state.actionOptions).toEqual([]);
      expect(state.llmCallsThisRound).toBe(0);

      // 2. Generate human player options (1 LLM call)
      useActionStore.getState().incrementLLMCalls();
      const humanOptions: ActionOption[] = [
        { title: 'Option 1', description: 'Desc 1', cost: 1 },
        { title: 'Option 2', description: 'Desc 2', cost: 2 },
        { title: 'Option 3', description: 'Desc 3', cost: 3 },
        { title: 'Option 4', description: 'Desc 4', cost: 1 },
        { title: 'Option 5', description: 'Desc 5', cost: 2 },
      ];
      useActionStore.getState().setActionOptions(humanOptions);

      state = useActionStore.getState();
      expect(state.actionOptions).toHaveLength(5);
      expect(state.llmCallsThisRound).toBe(1);

      // 3. Generate AI player 1 actions (1 LLM call)
      useActionStore.getState().incrementLLMCalls();
      useActionStore.getState().updateAICompletion('Tech CEO', false);

      // 4. Generate AI player 2 actions (1 LLM call)
      useActionStore.getState().incrementLLMCalls();
      useActionStore.getState().updateAICompletion('Journalist', false);

      // 5. AI players complete actions
      useActionStore.getState().updateAICompletion('Tech CEO', true);
      useActionStore.getState().updateAICompletion('Journalist', true);

      state = useActionStore.getState();
      expect(state.aiCompletionStatus['Tech CEO']).toBe(true);
      expect(state.aiCompletionStatus.Journalist).toBe(true);
      expect(state.llmCallsThisRound).toBe(3);

      // 6. Generate consequences (1 LLM call)
      useActionStore.getState().incrementLLMCalls();

      state = useActionStore.getState();
      expect(state.llmCallsThisRound).toBe(4);

      // 7. Round ends, reset for next round
      useActionStore.getState().resetRound();

      state = useActionStore.getState();
      expect(state.actionOptions).toEqual([]);
      expect(state.aiCompletionStatus).toEqual({});
      expect(state.llmCallsThisRound).toBe(0);
    });

    it('should track AI completion progress', () => {
      const aiRoles = ['Tech CEO', 'Journalist', 'Campaign Manager', 'Federal Regulator'];

      // Initialize all as not complete
      aiRoles.forEach((role) => {
        useActionStore.getState().updateAICompletion(role, false);
      });

      let state = useActionStore.getState();
      aiRoles.forEach((role) => {
        expect(state.aiCompletionStatus[role]).toBe(false);
      });

      // Complete them one by one
      useActionStore.getState().updateAICompletion('Tech CEO', true);
      expect(useActionStore.getState().aiCompletionStatus['Tech CEO']).toBe(true);
      expect(useActionStore.getState().aiCompletionStatus.Journalist).toBe(false);

      useActionStore.getState().updateAICompletion('Journalist', true);
      expect(useActionStore.getState().aiCompletionStatus.Journalist).toBe(true);
      expect(useActionStore.getState().aiCompletionStatus['Campaign Manager']).toBe(false);

      useActionStore.getState().updateAICompletion('Campaign Manager', true);
      useActionStore.getState().updateAICompletion('Federal Regulator', true);

      state = useActionStore.getState();
      aiRoles.forEach((role) => {
        expect(state.aiCompletionStatus[role]).toBe(true);
      });
    });
  });
});
