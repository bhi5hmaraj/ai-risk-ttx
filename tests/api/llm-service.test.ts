/**
 * Tests for LLM Service
 * Each test follows Arrange-Act-Assert pattern
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as llmService from '../../server/services/llmService';
import OpenAI from 'openai';

// Mock OpenAI with hoisted mock function
const { mockCreate } = vi.hoisted(() => {
  return {
    mockCreate: vi.fn(),
  };
});

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe('LLM Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateInitialScenario', () => {
    it('returns scenario when LLM call succeeds', async () => {
      // Arrange
      const mockResponse = {
        roundSummary: 'Crisis begins',
        outcomeTimeline: [
          { title: 'Event 1', description: 'Desc 1', impact: 'Impact 1' },
          { title: 'Event 2', description: 'Desc 2', impact: 'Impact 2' },
          { title: 'Event 3', description: 'Desc 3', impact: 'Impact 3' },
        ],
        counterfactualNote: 'If no one acts...',
        publicScoreUpdate: -20,
        hiddenScoreUpdates: [],
        nextEvent: { headline: 'Test', detail: 'Detail' },
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              parsed: mockResponse,
            },
          },
        ],
      });

      // Act
      const result = await llmService.generateInitialScenario();

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('returns null when LLM call fails', async () => {
      // Arrange
      mockCreate.mockRejectedValue(new Error('API timeout'));

      // Act
      const result = await llmService.generateInitialScenario();

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when LLM refuses', async () => {
      // Arrange
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              refusal: 'I cannot help with that',
            },
          },
        ],
      });

      // Act
      const result = await llmService.generateInitialScenario();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('generateAITurn', () => {
    const mockPlayer = {
      id: 'test-1',
      role: {
        name: 'Tech CEO',
        publicObjective: 'Test',
        hiddenObjective: 'Secret',
        resources: [],
        constraints: [],
        icon: (() => null) as any,
      },
      isHuman: false,
      hiddenScore: 0,
      actions: [],
      hasSubmittedActions: false,
    };

    const mockGameState = {
      phase: 'ACTION' as const,
      round: 1,
      coreMetric: {
        name: 'Trust',
        description: 'Public trust',
        value: 80,
      },
      eventLog: [],
      currentEvent: {
        headline: 'Crisis',
        detail: 'A crisis happened',
      },
    };

    it('returns AI turn with options and choices when LLM succeeds', async () => {
      // Arrange
      const mockResponse = {
        options: [
          { title: 'Option 1', description: 'Desc 1', cost: 1 },
          { title: 'Option 2', description: 'Desc 2', cost: 2 },
          { title: 'Option 3', description: 'Desc 3', cost: 1 },
          { title: 'Option 4', description: 'Desc 4', cost: 3 },
          { title: 'Option 5', description: 'Desc 5', cost: 2 },
        ],
        chosenActions: [
          { title: 'Option 1', description: 'Desc 1', cost: 1 },
        ],
        reasoning: 'This is the best choice',
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              parsed: mockResponse,
            },
          },
        ],
      });

      // Act
      const result = await llmService.generateAITurn(mockPlayer, mockGameState, null);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(result?.options).toHaveLength(5);
      expect(result?.chosenActions).toBeDefined();
      expect(result?.reasoning).toBeDefined();
    });

    it('returns null when LLM call fails', async () => {
      // Arrange
      mockCreate.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await llmService.generateAITurn(mockPlayer, mockGameState, null);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('generateCounterfactualConsequences', () => {
    const mockGameState = {
      phase: 'ACTION' as const,
      round: 1,
      coreMetric: {
        name: 'Trust',
        description: 'Public trust',
        value: 80,
      },
      eventLog: [],
      currentEvent: {
        headline: 'Crisis',
        detail: 'A crisis happened',
      },
    };

    it('returns score update when LLM succeeds', async () => {
      // Arrange
      const mockResponse = {
        publicScoreUpdate: -15,
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              parsed: mockResponse,
            },
          },
        ],
      });

      // Act
      const result = await llmService.generateCounterfactualConsequences(mockGameState);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(result?.publicScoreUpdate).toBe(-15);
    });

    it('returns null when LLM call fails', async () => {
      // Arrange
      mockCreate.mockRejectedValue(new Error('Timeout'));

      // Act
      const result = await llmService.generateCounterfactualConsequences(mockGameState);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('generateActionOptions', () => {
    const mockPlayer = {
      id: 'test-1',
      role: {
        name: 'Journalist',
        publicObjective: 'Test',
        hiddenObjective: 'Secret',
        resources: [],
        constraints: [],
        icon: (() => null) as any,
      },
      isHuman: true,
      hiddenScore: 0,
      actions: [],
      hasSubmittedActions: false,
    };

    const mockGameState = {
      phase: 'ACTION' as const,
      round: 2,
      coreMetric: {
        name: 'Trust',
        description: 'Public trust',
        value: 75,
      },
      eventLog: [],
      currentEvent: {
        headline: 'New Crisis',
        detail: 'Another crisis',
      },
    };

    it('returns 5 action options when LLM succeeds', async () => {
      // Arrange
      const mockResponse = {
        options: [
          { title: 'Action 1', description: 'Desc 1', cost: 1 },
          { title: 'Action 2', description: 'Desc 2', cost: 2 },
          { title: 'Action 3', description: 'Desc 3', cost: 1 },
          { title: 'Action 4', description: 'Desc 4', cost: 3 },
          { title: 'Action 5', description: 'Desc 5', cost: 2 },
        ],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              parsed: mockResponse,
            },
          },
        ],
      });

      // Act
      const result = await llmService.generateActionOptions(mockPlayer, mockGameState, null);

      // Assert
      expect(result?.options).toHaveLength(5);
      expect(result?.options[0].title).toBe('Action 1');
    });

    it('returns null when LLM call fails', async () => {
      // Arrange
      mockCreate.mockRejectedValue(new Error('LLM error'));

      // Act
      const result = await llmService.generateActionOptions(mockPlayer, mockGameState, null);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('generateCustomScenario', () => {
    it('returns game setup when LLM succeeds', async () => {
      // Arrange
      const mockResponse = {
        scenarioTitle: 'Custom Crisis',
        scenarioDescription: 'A custom scenario',
        coreMetric: {
          name: 'Stability',
          description: 'System stability',
          initialValue: 100,
        },
        stakeholders: [
          {
            name: 'Role 1',
            icon: '🎯',
            publicObjective: 'Public goal',
            hiddenObjective: 'Secret goal',
            resources: ['Tool 1'],
            constraints: ['Limit 1'],
          },
          {
            name: 'Role 2',
            icon: '🔧',
            publicObjective: 'Public goal 2',
            hiddenObjective: 'Secret goal 2',
          },
          {
            name: 'Role 3',
            icon: '📊',
            publicObjective: 'Public goal 3',
            hiddenObjective: 'Secret goal 3',
          },
          {
            name: 'Role 4',
            icon: '🛡️',
            publicObjective: 'Public goal 4',
            hiddenObjective: 'Secret goal 4',
          },
        ],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              parsed: mockResponse,
            },
          },
        ],
      });

      // Act
      const result = await llmService.generateCustomScenario('A space crisis scenario');

      // Assert
      expect(result).toEqual(mockResponse);
      expect(result?.stakeholders).toHaveLength(4);
      expect(result?.coreMetric.name).toBe('Stability');
    });

    it('returns null when LLM call fails', async () => {
      // Arrange
      mockCreate.mockRejectedValue(new Error('Generation failed'));

      // Act
      const result = await llmService.generateCustomScenario('Test scenario');

      // Assert
      expect(result).toBeNull();
    });
  });
});
