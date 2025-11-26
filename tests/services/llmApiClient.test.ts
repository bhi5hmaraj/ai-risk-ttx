import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from '../../services/llmApiClient';

// Helper to create a real Response so client parsing paths (clone/json/text) work
const makeResp = (data: any) => new Response(
  JSON.stringify({ success: true, data }),
  { headers: { 'Content-Type': 'application/json' } }
);

describe('services/llmApiClient (behavioral)', () => {
  let lastUrl: string | URL | undefined;
  beforeEach(() => {
    lastUrl = undefined;
    globalThis.fetch = vi.fn(async (input: any) => {
      lastUrl = input;
      const url = new URL(String(input), 'http://localhost');
      // Return minimally valid shapes per endpoint to avoid runtime errors
      if (url.pathname.endsWith('/generate/ai-turn')) {
        return makeResp({ options: [], chosenActions: [], reasoning: 'ok' });
      }
      if (url.pathname.endsWith('/generate/action-options')) {
        return makeResp({ options: [] });
      }
      return makeResp({});
    }) as any;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns scenario payload and calls consolidated route (scenario)', async () => {
    const res = await api.generateInitialScenarioChat({} as any, []);
    expect(res).toBeTruthy();
    const url = new URL(String(lastUrl), 'http://localhost');
    expect(url.pathname.endsWith('/api/llm/generate/scenario')).toBe(true);
  });

  it('returns consequences payload and calls consolidated route (consequences)', async () => {
    const res = await api.generateConsequencesChat({} as any, [], 0, [], {} as any);
    expect(res).toBeTruthy();
    const url = new URL(String(lastUrl), 'http://localhost');
    expect(url.pathname.endsWith('/api/llm/generate/consequences')).toBe(true);
  });

  it('returns action options and calls consolidated route', async () => {
    const res = await api.generateActionOptions({ role: { name: 'x' } } as any, { round: 1 } as any, null);
    expect(res).toBeTruthy();
    const url = new URL(String(lastUrl), 'http://localhost');
    expect(url.pathname.endsWith('/api/llm/generate/action-options')).toBe(true);
  });

  it('returns ai turn and calls consolidated route', async () => {
    const res = await api.generateAITurn({ role: { name: 'x' } } as any, { round: 1 } as any, null);
    expect(res).toBeTruthy();
    const url = new URL(String(lastUrl), 'http://localhost');
    expect(url.pathname.endsWith('/api/llm/generate/ai-turn')).toBe(true);
  });

  it('returns custom setup and calls consolidated route', async () => {
    const res = await api.generateCustomScenario('test');
    expect(res).toBeTruthy();
    const url = new URL(String(lastUrl), 'http://localhost');
    expect(url.pathname.endsWith('/api/llm/generate/custom-scenario')).toBe(true);
  });

  it('returns counterfactual and calls consolidated route', async () => {
    const res = await api.generateCounterfactualConsequences({ round: 1 } as any);
    expect(res).toBeTruthy();
    const url = new URL(String(lastUrl), 'http://localhost');
    expect(url.pathname.endsWith('/api/llm/generate/counterfactual')).toBe(true);
  });
});
