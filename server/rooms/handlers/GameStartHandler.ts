import { Client } from "colyseus";
import type { GameState } from "../schema/GameState";
import type { StateManager } from "../adapters/stateManager";
import type { createLogger } from "../../lib/logger";
import { GamePhase } from "../../types/core";
import * as llmService from "../../services/llmService";
import { createGameSession } from "../../services/chatSession";
import type { GameChatSession } from "../../services/chatSession";
import { applyConsequences } from "../../services/sessionEngine";
import { coreToSchema, corePlayerToSchema } from "../adapters/stateAdapter";
import { announceRoundTransition } from "./RoundAnnouncer";

export interface GameStartHandlerDeps {
    state: GameState;
    stateManager: StateManager;
    logger: ReturnType<typeof createLogger>;
    rid: string;
    broadcast: (type: string, message?: any) => void;
}

/**
 * Handles game start logic including:
 * - Initial scenario generation via LLM
 * - GameSetup creation
 * - Chat session initialization
 * - State synchronization
 */
export class GameStartHandler {
    private chatSession?: GameChatSession;

    constructor(private deps: GameStartHandlerDeps) {}

    getChatSession(): GameChatSession | undefined {
        return this.chatSession;
    }

    async handleStartGame(client: Client): Promise<void> {
        const { state, stateManager, logger, rid, broadcast } = this.deps;

        if (state.phase !== "lobby") {
            logger.warn(rid, "Cannot start game from non-lobby phase", { phase: state.phase });
            return;
        }

        logger.info(rid, "Starting game - generating initial scenario...", { initiatedBy: client.sessionId });

        try {
            // 1. Get current Core state and players from StateManager
            const coreState = stateManager.getCoreState();
            const corePlayers = stateManager.getCorePlayers();

            // 2. Create GameSetup for chat session initialization
            const gameSetup = this.createGameSetup(coreState, corePlayers);

            // 3. Initialize chat session for maintaining context across rounds
            this.chatSession = createGameSession(gameSetup, corePlayers);

            // 4. Generate initial scenario using chat session
            const initialScenario = await llmService.generateInitialScenarioChat(this.chatSession);

            if (!initialScenario) {
                logger.error(rid, "Failed to generate initial scenario");
                client.send("error", { message: "Failed to generate initial scenario" });
                return;
            }

            // 5. Apply initial scenario to Core state
            const { gameState: newState, players: newPlayers } = applyConsequences(
                coreState,
                initialScenario,
                corePlayers,
                [], // No AI players in initial scenario
                null, // No AI turn results
                [], // No human action options yet
                1 // One LLM call for initial scenario
            );

            // Set phase to ACTION and round to 1 for first actual round
            newState.phase = GamePhase.ACTION;
            newState.round = 1;

            // 6. Persist updated Core state in StateManager
            stateManager.setCoreState(newState);
            stateManager.setCorePlayers(newPlayers);

            // 7. Project Core → Schema (broadcast to clients)
            coreToSchema(newState, state);

            // Update players in Schema
            for (const corePlayer of newPlayers) {
                const schemaPlayer = state.players.get(corePlayer.id);
                if (schemaPlayer) {
                    corePlayerToSchema(corePlayer, schemaPlayer);
                }
            }

            // Reset submissions for first round
            state.resetSubmissions();

            // Unified round announcement for initial round
            await announceRoundTransition({
                schemaState: state,
                coreState: newState,
                players: newPlayers,
                broadcast,
                logger,
                initial: true,
            });

            // Final log confirmation
            logger.info(rid, "Game started successfully", {
                initiatedBy: client.sessionId,
                round: state.round,
                phase: state.phase
            });

        } catch (error) {
            logger.error(rid, "Failed to start game", {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                errorType: error?.constructor?.name
            });
            const errorMessage = error instanceof Error ? error.message : "Failed to start game";
            client.send("error", { message: errorMessage });
        }
    }

    private createGameSetup(coreState: any, corePlayers: any[]) {
        return {
            scenarioTitle: "AI Election Crisis",
            scenarioDescription: "A deepfake video threatens democratic legitimacy days before a major election.",
            coreMetric: coreState.coreMetric,
            stakeholders: corePlayers.map(p => ({
                name: p.role.name,
                icon: "👤", // Default icon
                publicObjective: p.role.publicObjective,
                hiddenObjective: p.role.hiddenObjective,
                resources: p.role.resources,
                constraints: p.role.constraints
            }))
        };
    }
}
