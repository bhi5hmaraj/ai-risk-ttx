import { describe, it, expect, vi } from 'vitest';
import { handleGenerateDebrief } from '../../lib/api/llm-handlers';

vi.mock('../../server/services/llmService', () => {
  return {
    generateDebriefChat: vi.fn(async () => ({ summary: 'ok', keyEvents: [], userActions: [] })),
  };
});

const mockPlayers = [
  { id: 'human', isHuman: true, hiddenScore: 0, actionPoints: 3, actions: [], hasSubmittedActions: true, role: { name: 'Tech CEO', publicObjective: '', hiddenObjective: '', resources: [], constraints: [] } },
];

const mockState = {
  phase: 2 as any,
  round: 2,
  coreMetric: { name: 'Trust', description: 'desc', value: 50 },
  currentEvent: { headline: 'h', detail: 'd' },
  eventLog: [
    { round: 1, roundSummary: 'r1', outcomeTimeline: [], counterfactualNote: '', event: { headline: 'h', detail: 'd' }, playerActions: [], publicScoreChange: -1, publicScoreAfter: 49, hiddenScoreChanges: {}, geminiCalls: 1 },
  ],
};

describe('handleGenerateDebrief', () => {
  it('returns 400 on missing fields', async () => {
    const res = await handleGenerateDebrief({} as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('returns 200 on success', async () => {
    const res = await handleGenerateDebrief({ gameState: mockState as any, players: mockPlayers as any, humanRoleName: 'Tech CEO', gameSetup: { scenarioTitle: 't', scenarioDescription: 'd', coreMetric: mockState.coreMetric, stakeholders: [] } as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.summary).toBe('ok');
  });
});

