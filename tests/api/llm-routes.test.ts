/**
 * Tests for LLM API routes
 * Each test follows Arrange-Act-Assert pattern
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import llmRoutes from '../../api/routes/llm';
import * as llmService from '../../api/services/llmService';
import { mockPlayer, mockGameState, mockAITurnResponse } from '../fixtures/game-data';

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

const app = new Hono();
app.route('/llm', llmRoutes);

const makeRequest = async (path: string, body: any) => {
  const req = new Request(`http://localhost/llm${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return app.fetch(req);
};

describe('POST /llm/initial-scenario', () => {
  it('returns 200 with data when service succeeds', async () => {
    // Arrange
    const mockResponse = {
      roundSummary: 'Crisis begins',
      outcomeTimeline: [],
      counterfactualNote: 'Note',
      publicScoreUpdate: -20,
      hiddenScoreUpdates: [],
      nextEvent: { headline: 'Test', detail: 'Detail' },
    };
    vi.spyOn(llmService, 'generateInitialScenario').mockResolvedValue(mockResponse);

    // Act
    const response = await makeRequest('/initial-scenario', {});
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockResponse);
  });

  it('returns 500 when service returns null', async () => {
    // Arrange
    vi.spyOn(llmService, 'generateInitialScenario').mockResolvedValue(null);

    // Act
    const response = await makeRequest('/initial-scenario', {});
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe('POST /llm/ai-turn', () => {
  it('returns 200 with AI turn data when service succeeds', async () => {
    // Arrange
    vi.spyOn(llmService, 'generateAITurn').mockResolvedValue(mockAITurnResponse);
    const requestBody = {
      player: mockPlayer,
      gameState: mockGameState,
      previousRoundActions: null,
    };

    // Act
    const response = await makeRequest('/ai-turn', requestBody);
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
    const requestBody = { gameState: mockGameState };

    // Act
    const response = await makeRequest('/ai-turn', requestBody);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing required fields');
  });

  it('returns 400 when gameState is missing', async () => {
    // Arrange
    const requestBody = { player: mockPlayer };

    // Act
    const response = await makeRequest('/ai-turn', requestBody);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 500 when service returns null', async () => {
    // Arrange
    vi.spyOn(llmService, 'generateAITurn').mockResolvedValue(null);
    const requestBody = {
      player: mockPlayer,
      gameState: mockGameState,
    };

    // Act
    const response = await makeRequest('/ai-turn', requestBody);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('calls service with player and gameState', async () => {
    // Arrange
    const spy = vi.spyOn(llmService, 'generateAITurn').mockResolvedValue(mockAITurnResponse);
    const requestBody = {
      player: mockPlayer,
      gameState: mockGameState,
      previousRoundActions: null,
    };

    // Act
    await makeRequest('/ai-turn', requestBody);

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0];
    expect(call[0].role.name).toBe('Tech CEO');
    expect(call[1].round).toBe(1);
    expect(call[2]).toBe(null);
  });
});

describe('POST /llm/counterfactual', () => {
  it('returns 200 with score update when service succeeds', async () => {
    // Arrange
    const mockResponse = { publicScoreUpdate: -15 };
    vi.spyOn(llmService, 'generateCounterfactualConsequences').mockResolvedValue(mockResponse);
    const requestBody = { gameState: mockGameState };

    // Act
    const response = await makeRequest('/counterfactual', requestBody);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.publicScoreUpdate).toBe(-15);
  });

  it('returns 400 when gameState is missing', async () => {
    // Arrange
    const requestBody = {};

    // Act
    const response = await makeRequest('/counterfactual', requestBody);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('POST /llm/action-options', () => {
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
    const requestBody = {
      player: mockPlayer,
      gameState: mockGameState,
      previousActions: [],
    };

    // Act
    const response = await makeRequest('/action-options', requestBody);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.options).toHaveLength(5);
  });

  it('returns 400 when player is missing', async () => {
    // Arrange
    const requestBody = { gameState: mockGameState };

    // Act
    const response = await makeRequest('/action-options', requestBody);
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
    const requestBody = {
      player: mockPlayer,
      gameState: mockGameState,
    };

    // Act
    const response = await makeRequest('/ai-turn', requestBody);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('LLM timeout');
  });
});
