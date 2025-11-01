import { Hono } from 'hono';
import { sanitizeEnv } from '../lib/logger.js';
// Robust body reader that prefers raw.body stream/object when available,
// then falls back to c.req.text(). This avoids cases where c.req.text()
// returns "[object Object]" under certain dev adapters.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readJsonBody<T = unknown>(c: any): Promise<T> {
  const rid = c.get ? c.get('reqId') : undefined;
  // Safely get content-type without relying on c.req.header (which expects WHATWG Headers)
  let ct = '';
  try {
    const h: any = (c.req as any)?.raw?.headers || (c.req as any)?.headers;
    if (h) {
      if (typeof Headers !== 'undefined' && h instanceof Headers) ct = h.get('content-type') || '';
      else if (typeof h === 'object') {
        const key = Object.keys(h).find(k => k.toLowerCase() === 'content-type');
        if (key) ct = String(h[key] ?? '');
      }
    }
  } catch {}
  // 1) Prefer raw.body when present
  try {
    const raw: any = (c.req as any).raw;
    if (raw && typeof raw === 'object' && 'body' in raw && raw.body != null) {
      let rawText = '';
      try { rawText = await new Response(raw.body as any).text(); } catch {}
      if ((globalThis as any).DEBUG_API || process.env.DEBUG_API) {
        try { console.log(`[${rid ?? '-'}] body(raw) ct=${ct} len=${rawText?.length ?? 0}`); } catch {}
      }
      if (rawText && rawText.trim()) {
        try { return JSON.parse(rawText) as T; } catch {}
      }
      // If adapter already parsed the body into an object
      if (typeof raw.body === 'object') {
        return raw.body as T;
      }
    }
  } catch {}

  // 2) Fallback to c.req.text()
  try {
    const text = await c.req.text();
    if ((globalThis as any).DEBUG_API || process.env.DEBUG_API) {
      try { console.log(`[${rid ?? '-'}] body(text) ct=${ct} len=${text?.length ?? 0}`); } catch {}
    }
    if (!text) return {} as T;
    try { return JSON.parse(text) as T; } catch (e) {
      if ((globalThis as any).DEBUG_API || process.env.DEBUG_API) {
        try { console.log(`[${rid ?? '-'}] body parse error:`, (e as Error)?.message, 'snippet=', text.slice(0,200)); } catch {}
      }
      return {} as T;
    }
  } catch (e) {
    if ((globalThis as any).DEBUG_API || process.env.DEBUG_API) {
      try { console.log(`[${rid ?? '-'}] body read error:`, (e as Error)?.message); } catch {}
    }
    return {} as T;
  }
}
import {
  generateInitialScenario,
  generateActionOptions,
  generateAIPlayerActions,
  generateConsequences,
  generateCounterfactualConsequences,
  generateCustomScenario,
  generateAITurn,
  generateInitialScenarioChat,
  generateConsequencesChat,
} from '../services/llmService.js';
import {
  createGameSession,
  GameChatSession,
  createGameMasterSystemPrompt,
} from '../services/chatSession.js';
import type {
  GenerateActionOptionsRequest,
  GenerateAIPlayerActionsRequest,
  GenerateConsequencesRequest,
  GenerateCounterfactualRequest,
  GenerateCustomScenarioRequest,
  GenerateAITurnRequest,
} from '../types/llm/requests.js';

const llm = new Hono();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.get('/health', (c: any) => c.json({ ok: true }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.on('HEAD', '/health', (c: any) => c.body(null, 200));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.get('/env', (c: any) => {
  const keys = [
    'NODE_ENV',
    'VERCEL',
    'LITELLM_BASE_URL',
    'LITELLM_API_KEY',
    'LLM_MODEL',
    'LLM_TIMEOUT_MS',
    'DATABASE_URL',
  ];
  const env = sanitizeEnv(keys);
  return c.json({ ok: true, env });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.post('/initial-scenario', async (c: any) => {
  try {
    console.log('[API /llm/initial-scenario] ✓ Request received');
    const result = await generateInitialScenario();
    if (!result) return c.json({ success: false, error: 'Failed to generate initial scenario' }, 500);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/initial-scenario] ✗ Exception:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.post('/action-options', async (c: any) => {
  try {
    const started = Date.now();
    const rid = c.get ? c.get('reqId') : undefined;
    console.log(`[${rid ?? '-'}] /action-options: parsing body`);
    const body = await readJsonBody<GenerateActionOptionsRequest>(c);
    console.log(`[${rid ?? '-'}] /action-options: player=${body?.player?.role?.name ?? 'n/a'} round=${body?.gameState?.round ?? 'n/a'}`);
    if (!body.player || !body.gameState) return c.json({ success: false, error: 'Missing: player, gameState' }, 400);
    const result = await generateActionOptions(body.player, body.gameState, body.previousRoundActions ?? null);
    console.log(`[${rid ?? '-'}] /action-options: result=${result ? 'OK' : 'NULL'} in ${Date.now() - started}ms`);
    if (!result) return c.json({ success: false, error: 'Failed to generate action options' }, 500);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/action-options] Error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.post('/ai-player-actions', async (c: any) => {
  try {
    const body = await readJsonBody<GenerateAIPlayerActionsRequest>(c);
    if (!body.player || !body.gameState || !body.options) return c.json({ success: false, error: 'Missing fields' }, 400);
    const result = await generateAIPlayerActions(body.player, body.gameState, body.options);
    if (!result) return c.json({ success: false, error: 'Failed to generate AI player actions' }, 500);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/ai-player-actions] Error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.post('/consequences', async (c: any) => {
  try {
    const body = await readJsonBody<GenerateConsequencesRequest>(c);
    if (!body.gameState || !body.players || body.counterfactualScoreChange === undefined) return c.json({ success: false, error: 'Missing fields' }, 400);
    const result = await generateConsequences(body.gameState, body.players, body.counterfactualScoreChange);
    if (!result) return c.json({ success: false, error: 'Failed to generate consequences' }, 500);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/consequences] Error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.post('/counterfactual', async (c: any) => {
  try {
    const body = await readJsonBody<GenerateCounterfactualRequest>(c);
    if (!body.gameState) return c.json({ success: false, error: 'Missing gameState' }, 400);
    const result = await generateCounterfactualConsequences(body.gameState);
    if (!result) return c.json({ success: false, error: 'Failed to generate counterfactual' }, 500);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/counterfactual] Error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.post('/custom-scenario', async (c: any) => {
  try {
    const body = await readJsonBody<GenerateCustomScenarioRequest>(c);
    if (!body.scenarioDescription) return c.json({ success: false, error: 'Missing scenarioDescription' }, 400);
    const result = await generateCustomScenario(body.scenarioDescription);
    if (!result) return c.json({ success: false, error: 'Failed to generate custom scenario' }, 500);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/custom-scenario] Error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.post('/ai-turn', async (c: any) => {
  try {
    const body = await readJsonBody<GenerateAITurnRequest>(c);
    if (!body.player || !body.gameState) return c.json({ success: false, error: 'Missing fields' }, 400);
    const result = await generateAITurn(body.player, body.gameState, body.previousRoundActions ?? null);
    if (!result) return c.json({ success: false, error: 'Failed to generate AI turn' }, 500);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/ai-turn] Error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.post('/chat/initial-scenario', async (c: any) => {
  try {
    const body = await readJsonBody<{ gameSetup: any; players: any[] }>(c);
    if (!body.gameSetup || !body.players) return c.json({ success: false, error: 'Missing fields' }, 400);
    const session = createGameSession(body.gameSetup, body.players);
    const result = await generateInitialScenarioChat(session);
    if (!result) return c.json({ success: false, error: 'Failed to generate initial scenario' }, 500);
    return c.json({ success: true, data: { scenario: result, chatHistory: session.getHistory() } });
  } catch (error) {
    console.error('[API /llm/chat/initial-scenario] Error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
llm.post('/chat/consequences', async (c: any) => {
  try {
    const body = await readJsonBody<{ gameState: any; players: any[]; counterfactualScoreChange: number; chatHistory: any[]; gameSetup: any }>(c);
    if (!body.gameState || !body.players || body.counterfactualScoreChange === undefined || !body.chatHistory || !body.gameSetup)
      return c.json({ success: false, error: 'Missing fields' }, 400);
    const systemPrompt = createGameMasterSystemPrompt(body.gameSetup, body.players);
    const session = new GameChatSession(systemPrompt, body.gameSetup, body.players);
    for (let i = 1; i < body.chatHistory.length; i++) (session as any).messages.push(body.chatHistory[i]);
    const result = await generateConsequencesChat(session, body.gameState, body.players, body.counterfactualScoreChange);
    if (!result) return c.json({ success: false, error: 'Failed to generate consequences' }, 500);
    return c.json({ success: true, data: { consequences: result, chatHistory: session.getHistory() } });
  } catch (error) {
    console.error('[API /llm/chat/consequences] Error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

export default llm;
