import { Client } from "colyseus";
import type { GameState } from "../schema/GameState";
import type { StateManager } from "../adapters/stateManager";
import type { createLogger } from "../../lib/logger";
import type { UpdatePolicyMessage } from "../../../shared/messages";
import { createDefaultPolicy, updatePolicyStance } from "../../types/core";

export interface PolicyHandlerDeps {
    state: GameState;
    stateManager: StateManager;
    logger: ReturnType<typeof createLogger>;
    rid: string;
    broadcast: (type: string, message?: any) => void;
}

/**
 * PolicyHandler - Handles policy updates (CP4)
 *
 * Responsibilities:
 * - Validate policy update requests
 * - Update Core state with policy
 * - Broadcast policy changes to all clients
 */
export class PolicyHandler {
    constructor(private deps: PolicyHandlerDeps) {}

    /**
     * Handle update_policy message from client
     */
    handleUpdatePolicy(client: Client, data: UpdatePolicyMessage): void {
        const { state, stateManager, logger, rid, broadcast } = this.deps;

        logger.info(rid, "Policy update request", {
            clientId: client.sessionId,
            stancesCount: Object.keys(data.stances).length,
            stances: data.stances
        });

        // Find the player in Core state
        const corePlayers = stateManager.getCorePlayers();
        const corePlayer = corePlayers.find(p => p.id === client.sessionId);

        if (!corePlayer) {
            logger.warn(rid, "Policy update failed: player not found", {
                clientId: client.sessionId
            });
            client.send("error", { message: "Player not found" });
            return;
        }

        // Initialize policy from template if player doesn't have one
        if (!corePlayer.policy) {
            corePlayer.policy = createDefaultPolicy();
            logger.info(rid, "Created default policy for player", {
                clientId: client.sessionId,
                role: corePlayer.role.name
            });
        }

        // Update each stance using centralized PolicyManager
        // Client sends partial updates (only dimensions they want to change)
        let updateFailed = false;
        for (const [dimensionKey, stanceUpdate] of Object.entries(data.stances)) {
            const success = updatePolicyStance(
                corePlayer.policy,
                dimensionKey,
                stanceUpdate.value,
                stanceUpdate.description
            );

            if (!success) {
                logger.warn(rid, "Policy stance update failed", {
                    clientId: client.sessionId,
                    dimension: dimensionKey,
                    value: stanceUpdate.value
                });
                updateFailed = true;
            }
        }

        if (updateFailed) {
            client.send("error", { message: "Some policy updates failed validation" });
            return;
        }

        // Persist updated players to StateManager
        stateManager.setCorePlayers(corePlayers);

        // Broadcast policy_updated to all clients (public visibility)
        broadcast("policy_updated", {
            playerId: client.sessionId,
            playerRole: corePlayer.role.name,
            policy: corePlayer.policy
        });

        // Send confirmation to the client who updated
        client.send("policy_update_success", {
            policy: corePlayer.policy
        });

        logger.info(rid, "Policy updated successfully", {
            clientId: client.sessionId,
            role: corePlayer.role.name,
            updatedDimensions: Object.keys(data.stances)
        });
    }
}
