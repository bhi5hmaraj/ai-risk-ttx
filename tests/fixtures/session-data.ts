import type { ActionOption, GameState, GameSetup, Player } from '../../types/core';

export function createActionOption(overrides: Partial<ActionOption> = {}): ActionOption {
  return {
    title: 'Issue Public Statement',
    description: 'Reassure the public and outline mitigation steps.',
    cost: 1,
    ...overrides,
  };
}

export function createValidPlayers(): Player[] {
  return [
    {
      id: 'human',
      role: {
        name: 'Tech CEO',
        publicObjective: 'Support democratic processes',
        hiddenObjective: 'Avoid regulatory backlash',
        resources: ['Infra', 'Comms'],
        constraints: ['Regulatory scrutiny'],
      },
      isHuman: true,
      hiddenScore: 0,
      actionPoints: 3,
      actions: [],
      hasSubmittedActions: false,
    },
  ];
}

export function createValidGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 2, // ACTION
    round: 1,
    coreMetric: { name: 'Trust', description: 'Public trust', value: 75 },
    eventLog: [
      {
        round: 0,
        roundSummary: 'Initial scenario established',
        outcomeTimeline: [],
        counterfactualNote: 'If no one acted, trust would fall.',
        event: null,
        playerActions: [],
        publicScoreChange: 0,
        publicScoreAfter: 75,
        hiddenScoreChanges: {},
        geminiCalls: 0,
      },
    ],
    currentEvent: { headline: 'Deepfake Circulates', detail: 'A viral deepfake spreads.' },
    ...overrides,
  };
}

export function createValidGameSetup(overrides: Partial<GameSetup> = {}): GameSetup {
  return {
    scenarioTitle: 'Election Security Crisis',
    scenarioDescription: 'A crisis threatens democratic legitimacy.',
    coreMetric: { name: 'Trust', description: 'Public trust', value: 75 },
    stakeholders: [
      {
        name: 'Tech CEO',
        icon: '💻',
        publicObjective: 'Maintain platform integrity',
        hiddenObjective: 'Protect valuation',
        resources: ['Infra'],
        constraints: ['PR risk'],
      },
    ],
    ...overrides,
  };
}

