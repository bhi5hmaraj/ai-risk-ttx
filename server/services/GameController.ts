import { GameState, Player, ActionOption, PlayerRoundActions, GamePhase } from "../types/core";
import { LLMFacade } from "./llmService"; // Assuming LLMFacade is exported or we define a similar interface
import * as llmService from "./llmService";
import { applyConsequences } from "./sessionEngine";
import { createLogger, createReqId } from "../lib/logger";

// Define the interface locally if not exported, or import it
// For now, mirroring the structure used in route.ts but cleaner
export interface GameControllerDeps {
    llm?: typeof llmService;
    getMaxRounds?: () => number;
}

export class GameController {
    private logger = createLogger({ service: "GameController" });

    constructor(private deps: GameControllerDeps = { llm: llmService, getMaxRounds: () => 8 }) {
        if (!this.deps.llm) this.deps.llm = llmService;
        if (!this.deps.getMaxRounds) this.deps.getMaxRounds = () => 8;
    }

    /**
     * Advances the game round, handling AI turns and consequence generation.
     */
    async advanceRound(
        roomId: string,
        gameState: GameState,
        players: Player[],
        humanAvailableOptions: ActionOption[] = []
    ): Promise<{ newState: GameState; newPlayers: Player[] }> {
        const rid = createReqId(`adv-${roomId}-${gameState.round}`);
        this.logger.info(rid, "advanceRound:start", { round: gameState.round });

        // 1. Identify Players
        const aiPlayers = players.filter(p => !p.isHuman);
        const humanPlayers = players.filter(p => p.isHuman);
        this.logger.info(rid, "roster", { total: players.length, ai: aiPlayers.length, human: humanPlayers.length });

        // Prepare previous actions for context
        const prevActions = this.getPreviousRoundActions(gameState);

        // 2. Start Counterfactual & AI Turns (Parallel)
        this.logger.info(rid, "Starting AI turns and counterfactual generation");

        const counterfactualPromise = this.deps.llm.generateCounterfactualConsequences(gameState);

        const aiTurnPromises = aiPlayers.map(async (aiPlayer) => {
            this.logger.info(rid, "ai-turn:start", { role: aiPlayer.role.name });
            try {
                const result = await this.deps.llm.generateAITurn(aiPlayer, gameState, prevActions);
                if (!result) throw new Error("AI turn generation failed");

                this.logger.info(rid, "ai-turn:done", {
                    role: aiPlayer.role.name,
                    chosenCount: result.chosenActions?.length || 0,
                    chosenTitles: (result.chosenActions || []).map(a => a.title),
                });
                return { playerId: aiPlayer.id, result };
            } catch (error) {
                this.logger.error(rid, "ai-turn:failed", { role: aiPlayer.role.name, error });
                return { playerId: aiPlayer.id, result: { options: [], chosenActions: [] } }; // Fallback
            }
        });

        const [counterfactual, ...aiResults] = await Promise.all([
            counterfactualPromise,
            ...aiTurnPromises
        ]);

        // 3. Process AI Results
        const aiTurnResultsMap = new Map(aiResults.map(r => [r.playerId, r.result]));

        // Update players with their chosen actions (for consequence generation context)
        const playersWithActions = players.map(p => {
            if (p.isHuman) return p; // Human actions already submitted
            const result = aiTurnResultsMap.get(p.id);
            return {
                ...p,
                actions: result?.chosenActions || [],
                hasSubmittedActions: true
            };
        });
        this.logger.info(rid, "roster:withActions", {
            players: playersWithActions.map(p => ({ role: p.role.name, isHuman: p.isHuman, actionCount: p.actions.length, actions: p.actions.map(a => a.title) }))
        });

        // Prepare AI results array for applyConsequences (legacy format expectation)
        // applyConsequences expects an array aligned with aiPlayers
        const aiTurnResultsArray = aiPlayers.map(p => {
            const res = aiTurnResultsMap.get(p.id);
            return res || { options: [], chosenActions: [] };
        });

        // 4. Generate Consequences
        if (!counterfactual) {
            this.logger.error(rid, "Counterfactual generation failed");
            throw new Error("Failed to generate counterfactual");
        }

        this.logger.info(rid, "Generating consequences");
        const consequence = await this.deps.llm.generateConsequences(
            gameState,
            playersWithActions,
            counterfactual.publicScoreUpdate
        );

        if (!consequence) {
            this.logger.error(rid, "Consequence generation failed");
            throw new Error("Failed to generate consequences");
        }

        // 5. Apply State Updates
        // Note: llmCallsThisRound is an estimate/metric we can track if needed
        const llmCalls = 1 + aiPlayers.length + 1;

        const { gameState: nextState, players: nextPlayers } = applyConsequences(
            gameState,
            consequence,
            playersWithActions,
            aiPlayers,
            aiTurnResultsArray,
            humanAvailableOptions,
            llmCalls
        );

        // 6. Check End Conditions
        const maxRounds = this.deps.getMaxRounds!();
        const shouldEnd = nextState.round > maxRounds || nextState.coreMetric.value <= 0;

        // Update phase based on end condition
        nextState.phase = shouldEnd ? GamePhase.END : GamePhase.ACTION;

        this.logger.info(rid, "advanceRound:done", {
            round: nextState.round,
            phase: nextState.phase,
            shouldEnd
        });

        return { newState: nextState, newPlayers: nextPlayers };
    }

    private getPreviousRoundActions(state: GameState): PlayerRoundActions[] | null {
        const prev = state.eventLog.find((entry) => entry.round === state.round - 1);
        return prev ? prev.playerActions : null;
    }
}
