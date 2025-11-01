/**
 * Tests for LLM API Handler Functions
 * Tests the consolidated handler logic in lib/api/llm-handlers.ts
 * Each test follows Arrange-Act-Assert pattern
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  handleGenerateAITurn,
  handleGenerateCounterfactual,
  handleGenerateActionOptions,
} from '../../lib/api/llm-handlers';
import * as llmService from '../../server/services/llmService';
import { mockPlayer, mockGameState, mockAITurnResponse } from '../fixtures/game-data';

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

describe('handleGenerateAITurn', () => {
  it('returns 200 with AI turn data when service succeeds', async () => {
    // Arrange
    vi.spyOn(llmService, 'generateAITurn').mockResolvedValue(mockAITurnResponse);
    const body = {
      player: mockPlayer,
      gameState: mockGameState,
      previousRoundActions: null,
    };

    // Act
    const response = await handleGenerateAITurn(body);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.options).toHaveLength(5);
    expect(data.data.chosenActions).toBeDefined();
    expect(data.data.reasoning).toBeDefined();
  });

  it('returns 400 when player is missing', async () => {
    // Arrange
    const body = { gameState: mockGameState } as any;

    // Act
    const response = await handleGenerateAITurn(body);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing');
  });

  it('returns 400 when gameState is missing', async () => {
    // Arrange
    const body = { player: mockPlayer } as any;

    // Act
    const response = await handleGenerateAITurn(body);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 500 when service returns null', async () => {
    // Arrange
    vi.spyOn(llmService, 'generateAITurn').mockResolvedValue(null);
    const body = {
      player: mockPlayer,
      gameState: mockGameState,
      previousRoundActions: null,
    };

    // Act
    const response = await handleGenerateAITurn(body);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('calls service with player and gameState', async () => {
    // Arrange
    const spy = vi.spyOn(llmService, 'generateAITurn').mockResolvedValue(mockAITurnResponse);
    const body = {
      player: mockPlayer,
      gameState: mockGameState,
      previousRoundActions: null,
    };

    // Act
    await handleGenerateAITurn(body);

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0];
    expect(call[0].role.name).toBe('Tech CEO');
    expect(call[1].round).toBe(1);
    expect(call[2]).toBe(null);
  });
});

describe('handleGenerateCounterfactual', () => {
  it('returns 200 with score update when service succeeds', async () => {
    // Arrange
    const mockResponse = { publicScoreUpdate: -15 };
    vi.spyOn(llmService, 'generateCounterfactualConsequences').mockResolvedValue(mockResponse);
    const body = { gameState: mockGameState };

    // Act
    const response = await handleGenerateCounterfactual(body);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.publicScoreUpdate).toBe(-15);
  });

  it('returns 400 when gameState is missing', async () => {
    // Arrange
    const body = {} as any;

    // Act
    const response = await handleGenerateCounterfactual(body);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('handleGenerateActionOptions', () => {
  it('returns 200 with options when service succeeds', async () => {
    // Arrange
    const mockResponse = {
      options: [
        { title: 'Option 1', description: 'Desc 1', cost: 1 },
        { title: 'Option 2', description: 'Desc 2', cost: 2 },
        { title: 'Option 3', description: 'Desc 3', cost: 1 },
        { title: 'Option 4', description: 'Desc 4', cost: 3 },
        { title: 'Option 5', description: 'Desc 5', cost: 2 },
      ],
    };
    vi.spyOn(llmService, 'generateActionOptions').mockResolvedValue(mockResponse);
    const body = {
      player: mockPlayer,
      gameState: mockGameState,
      previousRoundActions: [],
    };

    // Act
    const response = await handleGenerateActionOptions(body);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.options).toHaveLength(5);
  });

  it('returns 400 when player is missing', async () => {
    // Arrange
    const body = { gameState: mockGameState } as any;

    // Act
    const response = await handleGenerateActionOptions(body);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('Error Handling', () => {
  it('returns 500 with error message when service throws', async () => {
    // Arrange
    vi.spyOn(llmService, 'generateAITurn').mockRejectedValue(new Error('LLM timeout'));
    const body = {
      player: mockPlayer,
      gameState: mockGameState,
      previousRoundActions: null,
    };

    // Act
    const response = await handleGenerateAITurn(body);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('LLM timeout');
  });
});
