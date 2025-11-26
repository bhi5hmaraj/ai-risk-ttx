import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use a simple fetch mock to capture URLs and payloads
const makeJsonResponse = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'x-req-id': 'test' } });

describe('services/llmApiClient route targets', () => {
  let llm: typeof import('../services/llmApiClient');

  beforeEach(async () => {
    // Fresh import each test to avoid state bleed
    vi.resetModules();
    // Default fetch mock returns success envelope
    // We assert URLs in individual tests
    (globalThis as any).fetch = vi.fn(async () => makeJsonResponse({ success: true, data: {} }));
    llm = await import('../services/llmApiClient');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs to /api/llm/generate/scenario for initial scenario (chat)', async () => {
    (fetch as any).mockResolvedValueOnce(
      makeJsonResponse({ success: true, data: { scenario: { roundSummary: '', outcomeTimeline: [], counterfactualNote: '', publicScoreUpdate: 0, hiddenScoreUpdates: [], nextEvent: { headline: 'h', detail: 'd' } }, chatHistory: [] } })
    );
    await llm.generateInitialScenarioChat({ scenarioTitle: 't', scenarioDescription: 'd', coreMetric: { name: 'x', description: 'y', value: 75 }, stakeholders: [] }, [] as any);
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/llm/generate/scenario');
    expect(call[1].method).toBe('POST');
  });

  it('POSTs to /api/llm/generate/action-options', async () => {
    await llm.generateActionOptions({ id: 'p1', role: { name: 'r', publicObjective: '', hiddenObjective: '', resources: [], constraints: [] }, isHuman: true, hiddenScore: 0, actionPoints: 3, actions: [], hasSubmittedActions: false } as any, { phase: 2, round: 1, coreMetric: { name: 'n', description: 'd', value: 50 }, eventLog: [], currentEvent: null } as any, null);
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/llm/generate/action-options');
    expect(call[1].method).toBe('POST');
  });

  it('POSTs to /api/llm/generate/consequences', async () => {
    await llm.generateConsequences({} as any, [] as any, 0);
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/llm/generate/consequences');
  });

  it('POSTs to /api/llm/generate/counterfactual', async () => {
    await llm.generateCounterfactualConsequences({} as any);
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/llm/generate/counterfactual');
  });

  it('POSTs to /api/llm/generate/ai-turn', async () => {
    await llm.generateAITurn({ id: 'p2', role: { name: 'r2', publicObjective: '', hiddenObjective: '', resources: [], constraints: [] }, isHuman: false, hiddenScore: 0, actionPoints: 3, actions: [], hasSubmittedActions: false } as any, { phase: 2, round: 1, coreMetric: { name: 'n', description: 'd', value: 50 }, eventLog: [], currentEvent: null } as any, null);
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/llm/generate/ai-turn');
  });
});

