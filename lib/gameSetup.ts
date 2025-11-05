import React from 'react';
import type { GameSetup, GameState, Player, RoleData, CoreMetric } from '../types';
import { GAME_CONFIG, ROLES } from '../constants';

export function buildRolesFromSetup(setup: GameSetup): RoleData[] {
  return setup.stakeholders.map((s) => {
    const emoji = s.icon || '❓';
    const EmojiIcon = (props: any) =>
      React.createElement(
        'span',
        { className: 'text-2xl', role: 'img', 'aria-label': 'role icon', ...props },
        emoji,
      );
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

export function createCanonicalSetup(
  gameState: GameState,
  players: Player[],
  fallbackTitle = 'Election Crisis 2024',
  fallbackDesc = 'A rapidly escalating crisis threatens democratic legitimacy.',
  overrides?: { maxRounds?: number | null; maxAIPlayers?: number | null }
): GameSetup {
  const setup: any = {
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
  // Canonical schema requires these fields to exist (nullable allowed)
  setup.maxRounds = overrides?.maxRounds ?? setup.maxRounds ?? null;
  setup.maxAIPlayers = overrides?.maxAIPlayers ?? setup.maxAIPlayers ?? null;
  return setup as GameSetup;
}

export function selectInitialPlayers(
  selectedRoleName: string,
  path: 'classic' | 'custom' | 'ai_safety' | null,
  setup: GameSetup | null,
  aiSafetyPreset: GameSetup,
  coreMetricDefault: CoreMetric,
  opts?: { aiCount?: number }
) {
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
  const requested = opts?.aiCount != null ? opts.aiCount : GAME_CONFIG.MAX_AI_PLAYERS;
  const minForMode = (path === 'classic' || path === 'ai_safety') ? 3 : 0;
  const limit = Math.max(minForMode, Math.min(requested, 5, aiPool.length));
  const limitedAI = aiPool.slice(0, limit);
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
