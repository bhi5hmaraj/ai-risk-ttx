/**
 * State Adapter: Bidirectional conversion between Colyseus Schema and Core GameState
 *
 * This is a Tier 2 solution to the multi-schema synchronization problem.
 * See /eagx/STATE_ARCHITECTURE.md for architectural context.
 *
 * DESIGN PRINCIPLE:
 * - Colyseus Schema = Network sync format (minimal, optimized for bandwidth)
 * - Core GameState = Business logic format (rich, includes history and events)
 * - This adapter bridges the gap with explicit conversions
 *
 * MAINTENANCE:
 * When adding fields:
 * 1. Update the source schema (Colyseus or Core, depending on direction)
 * 2. Update both toCore() and toSchema() functions
 * 3. Run tests to verify round-trip conversion
 */

import { GameState as ColyseusGameState, Player as ColyseusPlayer } from "../schema/GameState";
import { GameState as CoreGameState, Player as CorePlayer, GamePhase, type StakeholderData } from "../../types/core";
import { MapSchema } from "@colyseus/schema";
import { GAME_CONFIG } from "@/gameConfig";

/**
 * Convert Colyseus Schema → Core GameState
 *
 * Enriches minimal network state with business logic structures.
 */
export function schemaToCore(
    schema: ColyseusGameState,
    options: {
        eventLog?: CoreGameState['eventLog'];
        currentEvent?: CoreGameState['currentEvent'];
    } = {}
): CoreGameState {
    // Direct string-to-string mapping - both server and client now use string enums
    return {
        phase: schema.phase as GamePhase,
        round: schema.round,
        coreMetric: {
            name: schema.coreMetricName,
            value: schema.publicScore,
            description: `The ${schema.coreMetricName} score`,
        },
        eventLog: options.eventLog ?? [],
        currentEvent: options.currentEvent ?? null,
        hostId: (schema as any).hostId || undefined,
    };
}

/**
 * Convert Colyseus Player → Core Player
 *
 * Enriches minimal network player with full role objects.
 */
export function schemaPlayerToCore(
    player: ColyseusPlayer,
    options: {
        fullRole?: CorePlayer['role'];
        actions?: CorePlayer['actions'];
        hiddenScore?: number;
    } = {}
): CorePlayer {
    const roleName = player.role || '';
    // Always trust schema for the role name; only merge details when names match
    const roleFromEnrichment = (options.fullRole && options.fullRole.name === roleName) ? options.fullRole : undefined;
    return {
        id: player.sessionId,
        role: {
            name: roleName,
            publicObjective: roleFromEnrichment?.publicObjective ?? '',
            hiddenObjective: roleFromEnrichment?.hiddenObjective ?? '',
            resources: roleFromEnrichment?.resources ?? [],
            constraints: roleFromEnrichment?.constraints ?? [],
        },
        isHuman: player.isHuman,
        resources: {
            material: player.material ?? 0,
            institutional: player.institutional ?? 0,
            narrative: player.narrative ?? 0,
        },
        actionPoints: player.actionPoints,
        actions: options.actions ?? [],
        hasSubmittedActions: player.hasSubmitted,
        hiddenScore: options.hiddenScore ?? 0,
    };
}

/**
 * Convert Core GameState → Colyseus Schema (partial update)
 *
 * Extracts only synchronizable fields from rich business state.
 */
export function coreToSchema(
    core: CoreGameState,
    schema: ColyseusGameState
): void {
    schema.phase = core.phase ?? 'lobby';
    schema.round = core.round;
    schema.publicScore = core.coreMetric.value;
    schema.coreMetricName = core.coreMetric.name;
    if ((core as any).hostId) (schema as any).hostId = (core as any).hostId as any;

    // Sync maxRounds if present in core state
    if ('maxRounds' in core && typeof (core as any).maxRounds === 'number') {
        schema.maxRounds = (core as any).maxRounds;
    }
}

/**
 * Convert Core Player → Colyseus Player (partial update)
 */
export function corePlayerToSchema(
    core: CorePlayer,
    schema: ColyseusPlayer
): void {
    schema.role = core.role.name;
    schema.isHuman = core.isHuman;
    schema.actionPoints = core.actionPoints;
    schema.hasSubmitted = core.hasSubmittedActions;
    schema.material = core.resources.material;
    schema.institutional = core.resources.institutional;
    schema.narrative = core.resources.narrative;
}

/**
 * Type guard: Verify Core GameState has all required fields
 */
export function isCoreGameStateComplete(state: Partial<CoreGameState>): state is CoreGameState {
    return (
        state.phase !== undefined &&
        state.round !== undefined &&
        state.coreMetric !== undefined &&
        state.eventLog !== undefined &&
        state.currentEvent !== undefined
    );
}

/**
 * Helper: Convert all Colyseus players to Core players
 */
export function schemaPlayersToCore(
    schemaPlayers: MapSchema<ColyseusPlayer>,
    enrichment: Map<string, {
        fullRole?: CorePlayer['role'];
        actions?: CorePlayer['actions'];
        hiddenScore?: number;
    }> = new Map()
): CorePlayer[] {
    return Array.from(schemaPlayers.values()).map(player =>
        schemaPlayerToCore(player, enrichment.get(player.sessionId) ?? {})
    );
}

/**
 * Build full roster at game start from stakeholders + current Schema players.
 * - Human seats: any Schema player with a non-empty role becomes a human seat (id=sessionId).
 * - AI seats: all remaining roles become AI players (ai_0..N).
 */
export function buildRosterFromStakeholders(
  stakeholders: StakeholderData[],
  schemaPlayers: MapSchema<ColyseusPlayer>
): CorePlayer[] {
  const stakeholderByName = new Map(stakeholders.map((s) => [s.name, s]));

  // Enrich Schema players with full role info from stakeholders
  const enrichment = new Map<string, { fullRole?: CorePlayer['role']; initialResources?: any }>();
  schemaPlayers.forEach((sp) => {
    if (sp?.role && sp.role.trim()) {
      const s = stakeholderByName.get(sp.role);
      if (s) {
        enrichment.set(sp.sessionId, {
          fullRole: {
            name: s.name,
            publicObjective: s.publicObjective,
            hiddenObjective: s.hiddenObjective,
            resources: s.resources ?? [],
            constraints: s.constraints ?? [],
          },
          initialResources: s.initialResources,
        });
      }
    }
  });

  const coreFromSchema = schemaPlayersToCore(schemaPlayers, enrichment as any);
  const humanTaken = new Set(
    coreFromSchema
      .filter((p) => p.isHuman && p.role?.name)
      .map((p) => p.role.name)
  );

  // Normalize human players (initial AP, clear actions/flags)
  const humans: CorePlayer[] = coreFromSchema
    .filter((p) => p.isHuman && p.role?.name)
    .map((p) => {
      // Get initialResources from stakeholder data if available
      const enrichData = enrichment.get(p.id);
      const defaultResources = { material: 50, institutional: 50, narrative: 50 };
      return {
        ...p,
        actionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS,
        resources: (enrichData?.initialResources as any) ?? defaultResources,
        actions: [],
        hasSubmittedActions: false,
        hiddenScore: p.hiddenScore ?? 0,
      };
    });

  // Fill remaining roles with AI players
  let aiIndex = 0;
  const defaultResources = { material: 50, institutional: 50, narrative: 50 };
  const aiSeats: CorePlayer[] = stakeholders
    .filter((s) => !humanTaken.has(s.name))
    .map((s) => ({
      id: `ai_${aiIndex++}`,
      role: {
        name: s.name,
        publicObjective: s.publicObjective,
        hiddenObjective: s.hiddenObjective,
        resources: s.resources ?? [],
        constraints: s.constraints ?? [],
      },
      isHuman: false,
      resources: s.initialResources ?? defaultResources,
      hiddenScore: 0,
      actionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS,
      actions: [],
      hasSubmittedActions: false,
    } as CorePlayer));

  return [...humans, ...aiSeats];
}

/**
 * Round-trip verification (for testing)
 */
export function verifyRoundTrip(
    original: CoreGameState,
    schema: ColyseusGameState,
    reconstructed: CoreGameState
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (original.phase !== reconstructed.phase) {
        errors.push(`Phase mismatch: ${original.phase} → ${reconstructed.phase}`);
    }
    if (original.round !== reconstructed.round) {
        errors.push(`Round mismatch: ${original.round} → ${reconstructed.round}`);
    }
    if (original.coreMetric.value !== reconstructed.coreMetric.value) {
        errors.push(`Score mismatch: ${original.coreMetric.value} → ${reconstructed.coreMetric.value}`);
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Build players_init payload from Core players + Schema connections.
 * Marks `isTaken` for roles that are already assigned in the Schema player map.
 */
export function buildPlayersInitPayload(
  schema: ColyseusGameState,
  corePlayers: CorePlayer[]
): { players: { id: string; role: { name: string; publicObjective: string; hiddenObjective: string; resources: string[]; constraints: string[] }; isTaken: boolean }[] } {
  const taken = new Set<string>();
  schema.players.forEach((sp) => {
    if (sp.role && sp.role.trim()) taken.add(sp.role);
  });
  return {
    players: corePlayers.map((p) => ({
      id: p.id,
      role: {
        name: p.role.name,
        publicObjective: p.role.publicObjective,
        hiddenObjective: p.role.hiddenObjective,
        resources: p.role.resources,
        constraints: p.role.constraints,
      },
      isTaken: taken.has(p.role.name),
    })),
  };
}

/**
 * Build players_init payload from a stakeholders list (roles catalog) without creating Core players.
 * Used during lobby before AI/human roster is materialized.
 */

export function buildRolesInitPayloadFromStakeholders(
  schema: ColyseusGameState,
  stakeholders: StakeholderData[]
): { players: { id: string; role: { name: string; publicObjective: string; hiddenObjective: string; resources: string[]; constraints: string[] }; isTaken: boolean }[] } {
  const taken = new Set<string>();
  schema.players.forEach((sp) => {
    if (sp.role && sp.role.trim()) taken.add(sp.role);
  });
  return {
    players: stakeholders
      .filter((s) => s?.name && s.name.trim())
      .map((s, idx) => ({
        id: `role_${idx}`,
        role: {
          name: s.name,
          publicObjective: s.publicObjective || '',
          hiddenObjective: s.hiddenObjective || '',
          resources: s.resources || [],
          constraints: s.constraints || [],
        },
        isTaken: taken.has(s.name),
      })),
  };
}
