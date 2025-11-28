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
import { GameState as CoreGameState, Player as CorePlayer, GamePhase } from "../../types/core";
import { MapSchema } from "@colyseus/schema";

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
    return {
        id: player.sessionId,
        role: options.fullRole ?? {
            name: player.role,
            publicObjective: '',
            hiddenObjective: '',
            resources: [],
            constraints: [],
        },
        isHuman: player.isHuman,
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
