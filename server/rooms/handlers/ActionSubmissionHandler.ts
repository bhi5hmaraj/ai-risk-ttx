import { Client } from "colyseus";
import type { GameState } from "../schema/GameState";
import type { createLogger } from "../../lib/logger";
import type { StateManager } from "../adapters/stateManager";
import type { SubmitActionMessage } from "../../../shared/messages";

export interface ActionSubmissionHandlerDeps {
    state: GameState;
    stateManager: StateManager;
    logger: ReturnType<typeof createLogger>;
    rid: string;
    broadcast: (type: string, message?: any) => void;
    onAllSubmitted: (client: Client) => Promise<void> | void;
}

/**
 * Handles action submission logic including:
 * - Action point validation
 * - Submission tracking
 * - All-submitted detection
 */
export class ActionSubmissionHandler {
    constructor(private deps: ActionSubmissionHandlerDeps) {}

    async handleSubmitAction(client: Client, data: SubmitActionMessage): Promise<void> {
        const { state, stateManager, logger, rid, broadcast } = this.deps;

        const player = state.players.get(client.sessionId);
        if (!player) {
            logger.warn(rid, "Player not found for action submission", { clientId: client.sessionId });
            return;
        }

        if (player.hasSubmitted) {
            logger.warn(rid, "Player already submitted action", { playerId: client.sessionId });
            return;
        }

        // Check action points (simple check for now)
        if (player.actionPoints >= data.cost) {
            player.actionPoints -= data.cost;
            player.hasSubmitted = true;
            logger.info(rid, "Action submitted", {
                playerId: client.sessionId,
                action: data.actionId,
                cost: data.cost
            });

            // Also persist in Core players so GameController can include human actions in logs
            try {
                const existing = stateManager.getCorePlayer(client.sessionId) as any;
                const prevActions = Array.isArray(existing?.actions) ? existing.actions : [];
                const nextActions = [...prevActions];
                if (!nextActions.some((a: any) => a?.title === data.actionId)) {
                    nextActions.push({ title: data.actionId, description: '', cost: data.cost } as any);
                }
                stateManager.updateCorePlayer(client.sessionId, {
                    hasSubmittedActions: true,
                    actions: nextActions,
                } as any);
            } catch {}

            // Server-authoritative advance: if all submitted, immediately advance the round on server
            if (state.allSubmitted()) {
                logger.info(rid, "All players submitted actions - advancing round on server");
                try {
                    await this.deps.onAllSubmitted(client);
                } catch (e) {
                    logger.error(rid, "onAllSubmitted failed", { error: e });
                }
            }
        } else {
            client.send("error", { message: "Not enough action points" });
            logger.warn(rid, "Insufficient action points", {
                playerId: client.sessionId,
                available: player.actionPoints,
                required: data.cost
            });
        }
    }
}
