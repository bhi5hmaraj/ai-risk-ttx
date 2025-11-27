import { Client } from "colyseus";
import type { GameState } from "../schema/GameState";
import type { StateManager } from "../adapters/stateManager";
import type { GameController } from "../../services/GameController";
import type { createLogger } from "../../lib/logger";
import { coreToSchema, corePlayerToSchema } from "../adapters/stateAdapter";

export interface RoundAdvanceHandlerDeps {
    state: GameState;
    stateManager: StateManager;
    gameController: GameController;
    logger: ReturnType<typeof createLogger>;
    rid: string;
    roomId: string;
    broadcast: (type: string, message?: any) => void;
}

/**
 * Handles round advancement logic including:
 * - AI turn generation
 * - Consequence calculation
 * - State updates
 */
export class RoundAdvanceHandler {
    constructor(private deps: RoundAdvanceHandlerDeps) {}

    async handleAdvanceRound(client: Client): Promise<void> {
        const { state, stateManager, gameController, logger, rid, roomId, broadcast } = this.deps;

        if (state.phase !== "action" && state.phase !== "consequence") {
            logger.warn(rid, "Cannot advance round from current phase", { phase: state.phase });
            return;
        }

        logger.info(rid, "Advancing round via GameController + StateManager...");

        try {
            // 1. Enrich: Get full Core state from StateManager
            const coreState = stateManager.getCoreState();
            const corePlayers = stateManager.getCorePlayers();

            logger.info(rid, "Core state retrieved", {
                phase: coreState.phase,
                round: coreState.round,
                playerCount: corePlayers.length
            });

            // 2. Call GameController with full Core state
            const { newState, newPlayers } = await gameController.advanceRound(
                roomId,
                coreState,
                corePlayers,
                [] // humanAvailableOptions - empty for now
            );

            // 3. Persist updated Core state in StateManager
            stateManager.setCoreState(newState);
            stateManager.setCorePlayers(newPlayers);

            // 4. Project: Core → Schema (broadcast to clients)
            coreToSchema(newState, state);

            // Also update players
            for (const corePlayer of newPlayers) {
                const schemaPlayer = state.players.get(corePlayer.id);
                if (schemaPlayer) {
                    corePlayerToSchema(corePlayer, schemaPlayer);
                }
            }

            broadcast("new_round", { round: state.round });
            logger.info(rid, "Round advanced successfully", { round: newState.round });

        } catch (error) {
            logger.error(rid, "Failed to advance round", { error });
            client.send("error", { message: "Failed to advance round" });
        }
    }
}
