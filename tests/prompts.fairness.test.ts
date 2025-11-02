import { describe, it, expect } from 'vitest';
import { getConsequencesPromptAndSchema, getAIPlayerActionsPromptAndSchema } from '../prompts';
import type { GameState, Player } from '../types';

const mockState = {
  round: 1,
  coreMetric: { name: 'Democratic Legitimacy', description: 'x', value: 80 },
  currentEvent: { headline: 'Test', detail: 'Details' },
  eventLog: [],
} as unknown as GameState;

const role = {
  name: 'Lead AI Alignment Researcher',
  publicObjective: 'Ensure safety',
  hiddenObjective: 'Advance agenda',
  resources: [],
  constraints: [],
  icon: (() => null) as any,
};

const player = {
  id: 'p1',
  role,
  isHuman: false,
  hiddenScore: 0,
  actions: [],
  hasSubmittedActions: false,
} as unknown as Player;

describe('prompt fairness guidance', () => {
  it('consequences prompt includes neutrality rules', () => {
    const { prompt } = getConsequencesPromptAndSchema(mockState, [player], -10);
    expect(prompt.toLowerCase()).toContain('fairness');
    expect(prompt.toLowerCase()).toContain('do not favor or penalize any role');
  });

  it('ai actions prompt warns against identity bias', () => {
    const { prompt } = getAIPlayerActionsPromptAndSchema(player, mockState, []);
    expect(prompt.toLowerCase()).toContain('fairness');
    expect(prompt.toLowerCase()).toContain('identity');
  });
});

