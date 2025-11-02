import type { GameSetup, GameState, Player, RoleData, CoreMetric } from '../types';
import { GAME_CONFIG, ROLES } from '../constants';

export function buildRolesFromSetup(setup: GameSetup): RoleData[] {
  return setup.stakeholders.map((s) => {
    const emoji = s.icon || '❓';
    const EmojiIcon = (props: any) =>
      // avoid importing React in core helpers
      ({ ...props, 'data-emoji': emoji });
    return {
      name: s.name,
      publicObjective: s.publicObjective,
      hiddenObjective: s.hiddenObjective,
      resources: s.resources ?? [],
      constraints: s.constraints ?? [],
      icon: EmojiIcon as any,
    };
  });
}

export function createCanonicalSetup(gameState: GameState, players: Player[], fallbackTitle = 'Election Crisis 2024', fallbackDesc = 'A rapidly escalating crisis threatens democratic legitimacy.'): GameSetup {
  return {
    scenarioTitle: gameState.currentEvent?.headline || fallbackTitle,
    scenarioDescription: gameState.currentEvent?.detail || fallbackDesc,
    coreMetric: gameState.coreMetric,
    stakeholders: players.map((p) => ({
      name: p.role.name,
      icon: '🎭',
      publicObjective: p.role.publicObjective,
      hiddenObjective: p.role.hiddenObjective,
      resources: p.role.resources,
      constraints: p.role.constraints,
    })),
  };
}

export function selectInitialPlayers(selectedRoleName: string, path: 'classic' | 'custom' | 'ai_safety' | null, setup: GameSetup | null, aiSafetyPreset: GameSetup, coreMetricDefault: CoreMetric) {
  let roles: RoleData[] = [];
  let coreMetric: CoreMetric = { ...coreMetricDefault };
  if (path === 'custom' && setup) {
    roles = buildRolesFromSetup(setup);
    const v = Number.isFinite(setup.coreMetric.value) ? Math.max(0, Math.min(100, Math.round(setup.coreMetric.value))) : 75;
    coreMetric = { name: setup.coreMetric.name, description: setup.coreMetric.description, value: v };
  } else if (path === 'ai_safety') {
    roles = buildRolesFromSetup(aiSafetyPreset);
    coreMetric = { name: aiSafetyPreset.coreMetric.name, description: aiSafetyPreset.coreMetric.description, value: Math.max(0, Math.min(100, Math.round(aiSafetyPreset.coreMetric.value))) };
  } else {
    roles = Object.values(ROLES);
  }
  const humanRole = roles.find((r) => r.name === selectedRoleName)!;
  const aiPool = roles.filter((r) => r.name !== selectedRoleName);
  const limitedAI = aiPool.slice(0, Math.max(0, Math.min(GAME_CONFIG.MAX_AI_PLAYERS, aiPool.length)));
  const ordered = [humanRole, ...limitedAI];
  const players = ordered.map((role, idx) => ({
    id: role.name === selectedRoleName ? 'human_player' : `ai_${idx}`,
    role,
    isHuman: role.name === selectedRoleName,
    hiddenScore: 0,
    actionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS,
    actions: [],
    hasSubmittedActions: false,
  }));
  return { players, coreMetric } as const;
}

