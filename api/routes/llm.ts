import { Hono } from 'hono';
import {
  generateInitialScenario,
  generateActionOptions,
  generateAIPlayerActions,
  generateConsequences,
  generateCounterfactualConsequences,
  generateCustomScenario,
} from '../services/llmService';
import type {
  GenerateActionOptionsRequest,
  GenerateAIPlayerActionsRequest,
  GenerateConsequencesRequest,
  GenerateCounterfactualRequest,
  GenerateCustomScenarioRequest,
} from '../types/llm/requests';

const llm = new Hono();

/**
 * POST /api/llm/initial-scenario
 * Generate the initial scenario for a game
 */
llm.post('/initial-scenario', async (c) => {
  try {
    console.log('[API /llm/initial-scenario] Request received');

    const result = await generateInitialScenario();

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate initial scenario',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/initial-scenario] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/action-options
 * Generate action options for a player
 */
llm.post('/action-options', async (c) => {
  try {
    console.log('[API /llm/action-options] Request received');

    const body = await c.req.json() as GenerateActionOptionsRequest;

    if (!body.player || !body.gameState) {
      return c.json({
        success: false,
        error: 'Missing required fields: player, gameState',
      }, 400);
    }

    const result = await generateActionOptions(
      body.player,
      body.gameState,
      body.previousActions || []
    );

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate action options',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/action-options] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/ai-player-actions
 * Generate AI player's chosen actions from their options
 */
llm.post('/ai-player-actions', async (c) => {
  try {
    console.log('[API /llm/ai-player-actions] Request received');

    const body = await c.req.json() as GenerateAIPlayerActionsRequest;

    if (!body.player || !body.gameState || !body.options) {
      return c.json({
        success: false,
        error: 'Missing required fields: player, gameState, options',
      }, 400);
    }

    const result = await generateAIPlayerActions(
      body.player,
      body.gameState,
      body.options
    );

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate AI player actions',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/ai-player-actions] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/consequences
 * Generate consequences for a round
 */
llm.post('/consequences', async (c) => {
  try {
    console.log('[API /llm/consequences] Request received');

    const body = await c.req.json() as GenerateConsequencesRequest;

    if (!body.gameState || !body.players || body.counterfactualScoreChange === undefined) {
      return c.json({
        success: false,
        error: 'Missing required fields: gameState, players, counterfactualScoreChange',
      }, 400);
    }

    const result = await generateConsequences(
      body.gameState,
      body.players,
      body.counterfactualScoreChange
    );

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate consequences',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/consequences] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/counterfactual
 * Generate counterfactual consequences (what would happen if no one acted)
 */
llm.post('/counterfactual', async (c) => {
  try {
    console.log('[API /llm/counterfactual] Request received');

    const body = await c.req.json() as GenerateCounterfactualRequest;

    if (!body.gameState) {
      return c.json({
        success: false,
        error: 'Missing required field: gameState',
      }, 400);
    }

    const result = await generateCounterfactualConsequences(body.gameState);

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate counterfactual consequences',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/counterfactual] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/custom-scenario
 * Generate a custom scenario from a user description
 */
llm.post('/custom-scenario', async (c) => {
  try {
    console.log('[API /llm/custom-scenario] Request received');

    const body = await c.req.json() as GenerateCustomScenarioRequest;

    if (!body.scenarioDescription) {
      return c.json({
        success: false,
        error: 'Missing required field: scenarioDescription',
      }, 400);
    }

    const result = await generateCustomScenario(body.scenarioDescription);

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate custom scenario',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/custom-scenario] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export default llm;
