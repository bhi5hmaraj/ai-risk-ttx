import type {
  GameState,
  Player,
  AIConsequenceResponse,
  ActionOption,
  AIActionOptionsResponse,
  AICounterfactualResponse,
  AITurnResponse,
  PlayerRoundActions,
  GameSetup,
} from "../../types/core";
import type { AIDebriefResponse } from "../../types/core";
import type { LLMService } from './types';
import type { GameChatSession } from '../chatSession';

function rng(seed: number) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function pick<T>(arr: T[], r: () => number) { return arr[Math.floor(r() * arr.length) % arr.length]; }

function mockAction(titleSeed: string, r: () => number): ActionOption {
  const verbs = ['Coordinate', 'Audit', 'Deploy', 'Brief', 'Mitigate', 'Investigate'];
  const objs = ['AI system', 'misinfo', 'election infra', 'stakeholders', 'task force', 'data leak'];
  return {
    title: `${pick(verbs, r)} ${pick(objs, r)} (${titleSeed})`,
    description: 'Mock action generated locally for testing.',
    cost: 1 + Math.floor(r() * 3),
  };
}

function mockOutcomeTimeline(r: () => number) {
  const items = [] as { title: string; description: string; impact: string }[];
  const impacts = ['public anxiety', 'platform stability', 'turnout', 'trust'];
  for (let i = 0; i < 3; i++) {
    items.push({
      title: `Event ${i + 1}`,
      description: 'Mock outcome detail for testing UI.',
      impact: pick(impacts, r),
    });
  }
  return items;
}

function buildHiddenUpdates(players: Player[]) {
  return players.map(p => ({ roleName: p.role.name, update: 0, justification: 'Mock start' }));
}

export const LLM_MOCK: LLMService = {
  async generateInitialScenario(): Promise<AIConsequenceResponse | null> {
    const r = rng(42);
    return {
      roundSummary: 'Mock: A coordinated misinformation surge is detected.',
      outcomeTimeline: mockOutcomeTimeline(r),
      counterfactualNote: 'If no one acts, sentiment declines steadily.',
      publicScoreUpdate: -10,
      hiddenScoreUpdates: [
        { roleName: 'Election Commissioner', update: 0, justification: 'Mock start' },
        { roleName: 'Tech CEO', update: 0, justification: 'Mock start' },
        { roleName: 'Journalist', update: 0, justification: 'Mock start' },
        { roleName: 'Federal Regulator', update: 0, justification: 'Mock start' },
        { roleName: 'Campaign Manager', update: 0, justification: 'Mock start' },
        { roleName: 'Cybersecurity Expert', update: 0, justification: 'Mock start' },
      ],
      nextEvent: { headline: 'Mock: Deepfake spread accelerates', detail: 'A viral video impacts trust.' },
    };
  },
  async generateConsequences(gameState: GameState, players: Player[], counterfactualScoreChange: number): Promise<AIConsequenceResponse | null> {
    const r = rng(gameState.round || 1);
    const delta = -5 + Math.floor(r() * 11); // -5..+5
    return {
      roundSummary: `Mock: Outcome for round ${gameState.round}.`,
      outcomeTimeline: mockOutcomeTimeline(r),
      counterfactualNote: `If no one acted, change would be ${counterfactualScoreChange}.`,
      publicScoreUpdate: delta,
      hiddenScoreUpdates: buildHiddenUpdates(players),
      nextEvent: { headline: 'Mock: Platform outage', detail: 'Service degradation observed.' },
    };
  },
  async generateAIPlayerActions(player: Player, _gameState: GameState, options: ActionOption[]): Promise<ActionOption[] | null> {
    // Pick up to 2 actions from available options
    const r = rng(player.id.length);
    if (!options?.length) return [mockAction(player.role.name, r), mockAction(player.role.name + ' 2', r)];
    const choiceCount = Math.min(2, options.length);
    return options.slice(0, choiceCount);
  },
  async generateActionOptions(player: Player, gameState: GameState, _prev: PlayerRoundActions[] | null): Promise<AIActionOptionsResponse | null> {
    const r = rng(player.role.name.length + gameState.round);
    const options = Array.from({ length: 5 }, (_, i) => mockAction(`${player.role.name}#${i + 1}`, r));
    return { options };
  },
  async generateCounterfactualConsequences(gameState: GameState): Promise<AICounterfactualResponse | null> {
    const r = rng(gameState.round || 1);
    return { publicScoreUpdate: -3 - Math.floor(r() * 3) };
  },
  async generateCustomScenario(scenarioDescription: string): Promise<GameSetup | null> {
    return {
      scenarioTitle: 'Mock Scenario',
      scenarioDescription: scenarioDescription || 'A mock scenario for local testing.',
      coreMetric: { name: 'Public Trust', description: 'Trust in institutions', value: 50 },
      stakeholders: [
        { name: 'Election Commissioner', icon: '🗳️', publicObjective: 'Ensure fair election', hiddenObjective: 'Avoid scandal' },
        { name: 'Tech CEO', icon: '💻', publicObjective: 'Maintain platform stability', hiddenObjective: 'Protect brand' },
        { name: 'Journalist', icon: '📰', publicObjective: 'Inform public', hiddenObjective: 'Break exclusive story' },
        { name: 'Federal Regulator', icon: '🏛️', publicObjective: 'Uphold law', hiddenObjective: 'Avoid political backlash' },
      ],
    };
  },
  async generateInitialScenarioChat(_session: GameChatSession): Promise<AIConsequenceResponse | null> {
    return this.generateInitialScenario();
  },
  async generateConsequencesChat(_session: GameChatSession, gameState: GameState, players: Player[], counterfactualScoreChange: number): Promise<AIConsequenceResponse | null> {
    return this.generateConsequences(gameState, players, counterfactualScoreChange);
  },
  async generateAITurn(player: Player, gameState: GameState, previousRoundActions: PlayerRoundActions[] | null): Promise<AITurnResponse | null> {
    const resp = await this.generateActionOptions(player, gameState, previousRoundActions);
    const options = resp?.options ?? [];
    return {
      options,
      chosenActions: options.slice(0, 1),
      reasoning: 'Mock: selected first option for speed.',
    };
  },
  async generateDebriefChat(_session, gameState, players, humanRoleName, gameSetup): Promise<AIDebriefResponse | null> {
    const human = humanRoleName || players.find(p => p.isHuman)?.role.name || 'Human Player';
    const events = gameState.eventLog.slice(-3).map(e => {
      // Pick actor as the role with the most actions this round; fallback to 'System'
      let actor: string | undefined;
      const pra = e.playerActions || [];
      if (pra.length) {
        const sorted = [...pra].sort((a, b) => (b.actions?.length || 0) - (a.actions?.length || 0));
        actor = sorted[0]?.roleName;
      }
      return {
        round: e.round,
        title: e.event?.headline || `Round ${e.round}`,
        description: e.roundSummary || 'Mock round summary.',
        impact: e.publicScoreChange >= 0 ? 'positive' : 'negative',
        actor: actor || 'System',
      };
    });
    const humanPlayer = players.find(p => p.role.name === human) || players.find(p => p.isHuman);
    const lastEntry = gameState.eventLog.filter(e => (e.round ?? 0) > 0).at(-1);
    const pra = lastEntry?.playerActions?.find(pa => pa.roleName === humanPlayer?.role.name);
    const actions = (pra?.actions || []).map((a) => ({ round: lastEntry?.round || gameState.round, title: a.title, impact: 'mixed', rationale: null }));
    const setupLine = gameSetup ? ` Setup: ${gameSetup.scenarioTitle}.` : '';
    return {
      summary: `Mock debrief:${setupLine} ${human} steered the simulation to ${gameState.coreMetric.value}% ${gameState.coreMetric.name}.`,
      keyEvents: events.length ? events : [{ round: gameState.round, title: 'Simulation End', description: 'Mock debrief event.', impact: 'neutral', actor: 'System' }],
      userActions: actions,
    };
  },
};
