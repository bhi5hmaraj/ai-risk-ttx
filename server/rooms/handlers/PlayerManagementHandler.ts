import { Client } from "colyseus";
import type { GameState } from "../schema/GameState";
import type { StateManager } from "../adapters/stateManager";
import type { createLogger } from "../../lib/logger";
import { buildPlayersInitPayload } from "../adapters/stateAdapter";
import type { SeatRegistry } from "../../rooms/services/SeatRegistry";

export interface PlayerManagementHandlerDeps {
    state: GameState;
    stateManager: StateManager;
    logger: ReturnType<typeof createLogger>;
    rid: string;
    broadcast: (type: string, message?: any) => void;
    emitPlayersInit: () => void; // delegate to GameRoom to broadcast roster
    seats: SeatRegistry;
    emitWaitingStatus?: () => void;
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
        const { state, stateManager, logger, rid, seats } = this.deps;

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

        // Reserve seat if role provided; if seat is taken by another, clear role in Schema.
        if (roleName && roleName.trim()) {
            const res = seats.reserve(roleName, client.sessionId);
            if (!res.ok) {
                const schemaPlayer = state.players.get(client.sessionId);
                if (schemaPlayer) schemaPlayer.role = '';
                this.deps.broadcast('error', { message: 'role_taken', role: roleName });
            }
        }

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
                    resources: { material: 50, institutional: 50, narrative: 50 },
                    actionPoints: 3,
                    actions: [],
                    hasSubmittedActions: false,
                    hiddenScore: 0
                });
            }
        } catch {}

        try { this.deps.emitWaitingStatus?.(); } catch (e) {
            this.deps.logger.warn(this.deps.rid, 'emitWaitingStatus failed on join', { error: e });
        }
    }

    handlePlayerLeave(client: Client, consented: boolean): void {
        const { state, stateManager, logger, rid, seats } = this.deps;

        logger.info(rid, "Client left", {
            sessionId: client.sessionId,
            traceId: (client as any).traceId,
            consented,
        });

        // Release seat and remove from Schema (network sync)
        try { seats.releaseBySession(client.sessionId); } catch {}
        state.removePlayer(client.sessionId);

        // Remove from StateManager (Core state)
        stateManager.removePlayer(client.sessionId);
        try { this.deps.emitWaitingStatus?.(); } catch (e) {
            this.deps.logger.warn(this.deps.rid, 'emitWaitingStatus failed on leave', { error: e });
        }
    }

    handleSetRole(client: Client, role: string, name?: string): void {
        const { state, stateManager, logger, rid, broadcast, seats } = this.deps;

        const player = state.players.get(client.sessionId);
        if (player) {
            // Release previous seat if any (for this session)
            const prev = seats.getRoleBySession(client.sessionId);
            if (prev && prev !== role) {
                seats.releaseBySession(client.sessionId);
            }
            // Try reserve new seat
            const res = seats.reserve(role, client.sessionId);
            if (!res.ok) {
                logger.warn(rid, 'Role claim denied (taken)', { playerId: client.sessionId, role });
                client.send('error', { message: 'role_taken', role });
                return;
            }

            player.role = role;
            if (name) player.name = name;
            logger.info(rid, "Role set", { playerId: client.sessionId, role });
            try {
                const snapshot = seats.snapshot();
                logger.info(rid, 'Seats snapshot', snapshot as any);
            } catch {}

            // After setting role, rebroadcast available roles via GameRoom helper (single source of truth)
            try {
                this.deps.emitPlayersInit();
                logger.info(rid, "Rebroadcasted players_init after role set");
            } catch (e) {
                logger.warn(rid, "Failed to rebroadcast players_init after role set", { error: e });
            }

            try { this.deps.emitWaitingStatus?.(); } catch (e) {
                this.deps.logger.warn(this.deps.rid, 'emitWaitingStatus failed on set_role', { error: e });
            }
        }
    }
}
