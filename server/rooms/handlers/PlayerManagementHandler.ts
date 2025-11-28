import { Client } from "colyseus";
import type { GameState } from "../schema/GameState";
import type { StateManager } from "../adapters/stateManager";
import type { createLogger } from "../../lib/logger";

export interface PlayerManagementHandlerDeps {
    state: GameState;
    stateManager: StateManager;
    logger: ReturnType<typeof createLogger>;
    rid: string;
}

/**
 * Handles player lifecycle including:
 * - Player join (Schema + StateManager)
 * - Player leave (cleanup)
 * - Role assignment
 */
export class PlayerManagementHandler {
    constructor(private deps: PlayerManagementHandlerDeps) {}

    handlePlayerJoin(client: Client, options: any): void {
        const { state, stateManager, logger, rid } = this.deps;

        logger.info(rid, "Client joined", {
            sessionId: client.sessionId,
            traceId: options.traceId,
            name: options.name,
            role: options.role,
        });

        const playerName = options.name || `Guest-${client.sessionId.slice(0, 4)}`;
        const roleName = options.role || "";

        // Create player in Schema (for network sync)
        state.createPlayer(client.sessionId, {
            name: playerName,
            role: roleName,
            isHuman: options.isHuman ?? true,
        });

        // If StateManager already seeded a 'human_player', remap it to this session id.
        try {
            const seeded = stateManager.getCorePlayer('human_player');
            if (seeded) {
                (stateManager as any).remapPlayerId?.('human_player', client.sessionId);
            } else {
                // Fallback: add minimal player if not seeded from setup
                stateManager.addPlayer({
                    id: client.sessionId,
                    role: {
                        name: roleName,
                        publicObjective: "",
                        hiddenObjective: "",
                        resources: [],
                        constraints: []
                    },
                    isHuman: options.isHuman ?? true,
                    actionPoints: 3,
                    actions: [],
                    hasSubmittedActions: false,
                    hiddenScore: 0
                });
            }
        } catch {}
    }

    handlePlayerLeave(client: Client, consented: boolean): void {
        const { state, stateManager, logger, rid } = this.deps;

        logger.info(rid, "Client left", {
            sessionId: client.sessionId,
            traceId: (client as any).traceId,
            consented,
        });

        // Remove from Schema (network sync)
        state.removePlayer(client.sessionId);

        // Remove from StateManager (Core state)
        stateManager.removePlayer(client.sessionId);
    }

    handleSetRole(client: Client, role: string, name?: string): void {
        const { state, logger, rid } = this.deps;

        const player = state.players.get(client.sessionId);
        if (player) {
            player.role = role;
            if (name) player.name = name;
            logger.info(rid, "Role set", { playerId: client.sessionId, role });
        }
    }
}
