import { describe, it, expect } from 'vitest';
import { clampScore, convertAiUpdatesToRecord, createInitialGameStateFromScenario, applyConsequences } from '../../lib/gameLogic';
import type { GameState, Player, AIConsequenceResponse, ActionOption } from '../../types';
import { GAME_CONFIG } from '../../gameConfig';

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

describe('Action Points (AP) Logic', () => {
  it('players start with INITIAL_ACTION_POINTS', () => {
    const player: Player = {
      id: 'test',
      isHuman: true,
      hiddenScore: 0,
      actionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS,
      actions: [],
      hasSubmittedActions: false,
      role: { name: 'Tester', publicObjective: 'Test', hiddenObjective: 'Test secretly', resources: [], constraints: [] },
    };
    expect(player.actionPoints).toBe(3);
    expect(player.actionPoints).toBe(GAME_CONFIG.INITIAL_ACTION_POINTS);
  });

  it('AP regenerates correctly after spending all points', () => {
    const withActions: Player[] = [
      {
        ...players[0],
        actionPoints: 3,
        actions: [
          { title: 'Action 1', description: '...', cost: 2 },
          { title: 'Action 2', description: '...', cost: 1 }
        ]
      },
    ];
    const consequence: AIConsequenceResponse = {
      roundSummary: 'Round resolved',
      outcomeTimeline: [],
      counterfactualNote: '',
      publicScoreUpdate: 0,
      hiddenScoreUpdates: [],
      nextEvent: { headline: 'Next', detail: '...' },
    };
    const { players: newPlayers } = applyConsequences(
      { ...baseState, phase: 2 as any, round: 1, currentEvent: { headline: 'R1', detail: '...' }, eventLog: [] },
      consequence,
      withActions,
      [],
      [],
      [],
      1,
    );
    const player = newPlayers[0];
    // Started with 3, spent 3 (2+1), should get +3 for next round = 3
    expect(player.actionPoints).toBe(3);
  });

  it('AP is capped at MAX_ACTION_POINTS', () => {
    const withActions: Player[] = [
      {
        ...players[0],
        actionPoints: 9, // Near max
        actions: [] // Spend nothing
      },
    ];
    const consequence: AIConsequenceResponse = {
      roundSummary: 'Round resolved',
      outcomeTimeline: [],
      counterfactualNote: '',
      publicScoreUpdate: 0,
      hiddenScoreUpdates: [],
      nextEvent: { headline: 'Next', detail: '...' },
    };
    const { players: newPlayers } = applyConsequences(
      { ...baseState, phase: 2 as any, round: 1, currentEvent: { headline: 'R1', detail: '...' }, eventLog: [] },
      consequence,
      withActions,
      [],
      [],
      [],
      1,
    );
    const player = newPlayers[0];
    // Started with 9, spent 0, would get +3 = 12, but capped at MAX_ACTION_POINTS (10)
    expect(player.actionPoints).toBe(GAME_CONFIG.MAX_ACTION_POINTS);
    expect(player.actionPoints).toBe(10);
  });

  it('AP cannot go negative', () => {
    const withActions: Player[] = [
      {
        ...players[0],
        actionPoints: 3,
        actions: [
          { title: 'Expensive Action', description: '...', cost: 5 } // More than available!
        ]
      },
    ];
    const consequence: AIConsequenceResponse = {
      roundSummary: 'Round resolved',
      outcomeTimeline: [],
      counterfactualNote: '',
      publicScoreUpdate: 0,
      hiddenScoreUpdates: [],
      nextEvent: { headline: 'Next', detail: '...' },
    };
    const { players: newPlayers } = applyConsequences(
      { ...baseState, phase: 2 as any, round: 1, currentEvent: { headline: 'R1', detail: '...' }, eventLog: [] },
      consequence,
      withActions,
      [],
      [],
      [],
      1,
    );
    const player = newPlayers[0];
    // Started with 3, spent 5, would be -2, then +3 = 1
    // This test ensures the bug doesn't happen - AP should never go negative
    expect(player.actionPoints).toBeGreaterThanOrEqual(0);
    expect(player.actionPoints).toBe(1); // 3 - 5 + 3 = 1
  });

  it('AP accumulates correctly over multiple rounds', () => {
    let currentPlayers: Player[] = [
      { ...players[0], actionPoints: 3, actions: [] },
    ];

    // Round 1: Spend 1 AP
    currentPlayers[0].actions = [{ title: 'Light action', description: '...', cost: 1 }];
    let result = applyConsequences(
      { ...baseState, phase: 2 as any, round: 1, currentEvent: { headline: 'R1', detail: '...' }, eventLog: [] },
      scenario,
      currentPlayers,
      [],
      [],
      [],
      1,
    );
    expect(result.players[0].actionPoints).toBe(5); // 3 - 1 + 3 = 5

    // Round 2: Spend 0 AP
    currentPlayers = result.players;
    currentPlayers[0].actions = [];
    result = applyConsequences(
      { ...result.gameState, round: 2 },
      scenario,
      currentPlayers,
      [],
      [],
      [],
      1,
    );
    expect(result.players[0].actionPoints).toBe(8); // 5 - 0 + 3 = 8

    // Round 3: Spend 0 AP, should cap at 10
    currentPlayers = result.players;
    currentPlayers[0].actions = [];
    result = applyConsequences(
      { ...result.gameState, round: 3 },
      scenario,
      currentPlayers,
      [],
      [],
      [],
      1,
    );
    expect(result.players[0].actionPoints).toBe(10); // 8 - 0 + 3 = 11, capped at 10
  });

  it('each player manages AP independently', () => {
    const withActions: Player[] = [
      { ...players[0], actionPoints: 5, actions: [{ title: 'A1', description: '...', cost: 2 }] },
      { ...players[1], actionPoints: 3, actions: [{ title: 'A2', description: '...', cost: 1 }] },
    ];
    const consequence: AIConsequenceResponse = {
      roundSummary: 'Round resolved',
      outcomeTimeline: [],
      counterfactualNote: '',
      publicScoreUpdate: 0,
      hiddenScoreUpdates: [],
      nextEvent: { headline: 'Next', detail: '...' },
    };
    const { players: newPlayers } = applyConsequences(
      { ...baseState, phase: 2 as any, round: 1, currentEvent: { headline: 'R1', detail: '...' }, eventLog: [] },
      consequence,
      withActions,
      [],
      [],
      [],
      1,
    );
    expect(newPlayers[0].actionPoints).toBe(6); // 5 - 2 + 3 = 6
    expect(newPlayers[1].actionPoints).toBe(5); // 3 - 1 + 3 = 5
  });
});

