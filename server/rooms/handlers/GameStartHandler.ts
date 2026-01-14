import { Client } from "colyseus";
import type { GameState } from "../schema/GameState";
import type { StateManager } from "../adapters/stateManager";
import type { createLogger } from "../../lib/logger";
import { GamePhase, type StakeholderData } from "../../types/core";
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
    getInitialStakeholders?: () => StakeholderData[] | null;
    lockRoom?: () => void;
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

        // Enforce host-only start
        const hostId = (state as any).hostId || '';
        if (!hostId || client.sessionId !== hostId) {
            logger.warn(rid, "start_game denied: not host", { clientId: client.sessionId, hostId });
            client.send("error", { message: "Only the host can start the game" });
            return;
        }

        // Preflight: ensure ALL connected human players have selected a role
        const players = Array.from(state.players.values());
        const connectedHumans = players.filter(p => p.connected && p.isHuman);
        const readyHumans = connectedHumans.filter(p => p.role && p.role.trim());
        logger.info(rid, "start_preflight", {
            connectedHumans: connectedHumans.length,
            readyHumans: readyHumans.length,
            awaiting: connectedHumans.filter(p => !p.role || !p.role.trim()).map(p => ({ id: p.sessionId, name: p.name }))
        });
        if (connectedHumans.length > 0 && readyHumans.length !== connectedHumans.length) {
            client.send("error", { message: "All connected players must choose a role before starting" });
            return;
        }

        logger.info(rid, "Starting game - generating initial scenario...", { initiatedBy: client.sessionId });

        try {
            // 1. Get current Core state and players from StateManager
            const coreState = stateManager.getCoreState();

            // Seed roster from initial stakeholders now (AI created on start only)
            const stakeholders = this.deps.getInitialStakeholders?.() || [];
            if (stakeholders && stakeholders.length > 0) {
                const { buildRosterFromStakeholders, corePlayerToSchema } = await import('../adapters/stateAdapter');
                const roster = buildRosterFromStakeholders(stakeholders, this.deps.state.players as any);
                stateManager.setCorePlayers(roster);

                // Sync resources back to Schema
                for (const corePlayer of roster) {
                    const schemaPlayer = this.deps.state.players.get(corePlayer.id);
                    if (schemaPlayer) {
                        corePlayerToSchema(corePlayer, schemaPlayer);
                    }
                }
            }
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

            // Roster summary for quick diagnostics
            try {
                const humanCount = newPlayers.filter(p => p.isHuman).length;
                const aiCount = newPlayers.length - humanCount;
                const roles = newPlayers.map(p => `${p.role.name}${p.isHuman ? ' (H)' : ' (AI)'}`);
                logger.info(rid, 'Roster summary after start', {
                    total: newPlayers.length,
                    humans: humanCount,
                    ai: aiCount,
                    roles,
                });
            } catch {}

            // 7. Project Core → Schema (broadcast to clients)
            coreToSchema(newState, state);

            // Add all players to Schema (AI players + human)
            // Human players are already in Schema from lobby, AI players need to be created
            for (const corePlayer of newPlayers) {
                const schemaPlayer = state.players.get(corePlayer.id);
                if (schemaPlayer) {
                    // Update existing player (human player from lobby)
                    corePlayerToSchema(corePlayer, schemaPlayer);
                } else {
                    // Create new player (AI players that weren't in Schema during lobby)
                    state.createPlayer(corePlayer.id, {
                        name: corePlayer.role.name,
                        role: corePlayer.role.name,
                        isHuman: corePlayer.isHuman,
                    });
                    logger.info(rid, "Added AI player to Schema", { playerId: corePlayer.id, role: corePlayer.role.name });
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

            // Lock room to prevent late joins (Warden-style)
            try { this.deps.lockRoom?.(); } catch (e) {
                this.deps.logger.warn(this.deps.rid, 'lockRoom failed', { error: e });
            }

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
