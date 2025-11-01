import { describe, it, expect } from 'vitest';
import { clampScore, convertAiUpdatesToRecord, createInitialGameStateFromScenario, applyConsequences } from '../../lib/gameLogic';
import type { GameState, Player, AIConsequenceResponse, ActionOption } from '../../types';

const baseState: GameState = {
  phase: 1 as any, // STARTING
  round: 0,
  coreMetric: { name: 'Trust', description: 'Public trust', value: 50 },
  eventLog: [],
  currentEvent: null,
};

const players: Player[] = [
  { id: 'human', isHuman: true, hiddenScore: 0, actionPoints: 3, actions: [], hasSubmittedActions: false, role: { name: 'Election Commissioner', publicObjective: 'Fair election', hiddenObjective: 'Avoid scandal', resources: [], constraints: [] } },
  { id: 'ai_1', isHuman: false, hiddenScore: 0, actionPoints: 3, actions: [], hasSubmittedActions: false, role: { name: 'Tech CEO', publicObjective: 'Stability', hiddenObjective: 'Protect brand', resources: [], constraints: [] } },
];

const scenario: AIConsequenceResponse = {
  roundSummary: 'Opening crisis unfolds',
  outcomeTimeline: [{ title: 'Event', description: 'Desc', impact: 'neutral' }],
  counterfactualNote: 'If no one acted...',
  publicScoreUpdate: +5,
  hiddenScoreUpdates: [ { roleName: 'Election Commissioner', update: 1, justification: 'Good decision' } ],
  nextEvent: { headline: 'Next', detail: 'Next details' },
};

describe('gameLogic helpers', () => {
  it('clampScore clamps to [0,100] and rounds', () => {
    expect(clampScore(101.2)).toBe(100);
    expect(clampScore(-3.8)).toBe(0);
    expect(clampScore(42.4)).toBe(42);
    expect(clampScore(42.5)).toBe(43);
  });

  it('convertAiUpdatesToRecord maps updates by role name', () => {
    const rec = convertAiUpdatesToRecord([
      { roleName: 'A', update: 2, justification: 'ok' },
      { roleName: 'B', update: -1, justification: 'bad' },
    ]);
    expect(rec['A']).toEqual({ update: 2, justification: 'ok' });
    expect(rec['B']).toEqual({ update: -1, justification: 'bad' });
  });

  it('createInitialGameStateFromScenario builds round 0 log and advances to ACTION', () => {
    const next = createInitialGameStateFromScenario(baseState, scenario, 3);
    expect(next.phase).toBe(2); // ACTION
    expect(next.round).toBe(1);
    expect(next.coreMetric.value).toBe(55);
    expect(next.eventLog).toHaveLength(1);
    expect(next.eventLog[0].publicScoreAfter).toBe(55);
    expect(next.eventLog[0].geminiCalls).toBe(3);
  });

  it('applyConsequences appends event log and updates players with AP carryover', () => {
    const withActions: Player[] = [
      { ...players[0], actions: [ { title: 'Do A', description: '...', cost: 2 } ] },
      { ...players[1], actions: [ { title: 'Do B', description: '...', cost: 1 } ] },
    ];
    const consequence: AIConsequenceResponse = {
      roundSummary: 'Round resolved',
      outcomeTimeline: [],
      counterfactualNote: '',
      publicScoreUpdate: -10,
      hiddenScoreUpdates: [ { roleName: players[0].role.name, update: 2, justification: 'helpful' } ],
      nextEvent: { headline: 'Another', detail: '...' },
    };
    const aiPlayers = withActions.filter(p => !p.isHuman);
    const aiTurnResults = [ { options: [ { title: 'Opt', description: 'x', cost: 1 } as ActionOption ] } ];
    const { gameState, players: newPlayers } = applyConsequences(
      { ...baseState, phase: 2 as any, round: 1, currentEvent: { headline: 'R1', detail: '...' }, eventLog: [] },
      consequence,
      withActions,
      aiPlayers,
      aiTurnResults,
      [ { title: 'HumanOpt', description: 'y', cost: 1 } ],
      4,
    );
    expect(gameState.round).toBe(2);
    expect(gameState.coreMetric.value).toBe(40);
    expect(gameState.eventLog).toHaveLength(1);
    expect(gameState.eventLog[0].playerActions[0].availableOptions[0].title).toBe('HumanOpt');
    expect(gameState.eventLog[0].geminiCalls).toBe(4);
    // AP carryover and hidden score update applied
    const human = newPlayers.find(p => p.isHuman)!;
    expect(human.hiddenScore).toBe(2);
    expect(human.actions.length).toBe(0);
  });
});

