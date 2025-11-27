/**
 * StateManager: In-memory keeper of full Core state
 *
 * The Colyseus Schema is a minimal network representation.
 * This manager maintains the full Core GameState with event history,
 * allowing GameController to work with rich business objects.
 *
 * INVARIANT: This is the source of truth for eventLog, currentEvent, and full role objects.
 */

import { GameState as CoreGameState, Player as CorePlayer, GamePhase } from "../../types/core";
import { GAME_CONFIG } from "../../../gameConfig";

export interface StateManagerOptions {
    initialCoreMetricName?: string;
    initialCoreMetricValue?: number;
    maxRounds?: number;
}

export class StateManager {
    private coreState: CoreGameState;
    private corePlayers: Map<string, CorePlayer> = new Map();
    private readonly maxRounds: number;

    constructor(options: StateManagerOptions = {}) {
        this.maxRounds = options.maxRounds ?? 8;

        // Initialize with minimal Core state
        this.coreState = {
            phase: GamePhase.LOBBY,
            round: 0,
            coreMetric: {
                name: options.initialCoreMetricName ?? "Democratic Legitimacy",
                value: options.initialCoreMetricValue ?? 75,
                description: `The ${options.initialCoreMetricName ?? "Democratic Legitimacy"} score`,
            },
            eventLog: [],
            currentEvent: null,
        };
    }

    // --- Getters ---

    getCoreState(): CoreGameState {
        return this.coreState;
    }

    getCorePlayers(): CorePlayer[] {
        return Array.from(this.corePlayers.values());
    }

    getCorePlayer(id: string): CorePlayer | undefined {
        return this.corePlayers.get(id);
    }

    getMaxRounds(): number {
        return this.maxRounds;
    }

    // --- Setters ---

    setCoreState(state: CoreGameState): void {
        this.coreState = state;
    }

    setCorePlayers(players: CorePlayer[]): void {
        this.corePlayers.clear();
        players.forEach(p => this.corePlayers.set(p.id, p));
    }

    updateCorePlayer(id: string, updates: Partial<CorePlayer>): void {
        const player = this.corePlayers.get(id);
        if (player) {
            this.corePlayers.set(id, { ...player, ...updates });
        }
    }

    // --- Player Management ---

    addPlayer(player: CorePlayer): void {
        this.corePlayers.set(player.id, player);
    }

    removePlayer(id: string): void {
        this.corePlayers.delete(id);
    }

    // --- Phase Management ---

    setPhase(phase: GamePhase): void {
        this.coreState.phase = phase;
    }

    advanceToNextRound(): void {
        this.coreState.round += 1;
    }

    // --- Metrics ---

    updatePublicScore(value: number): void {
        this.coreState.coreMetric.value = Math.max(0, Math.min(100, value));
    }

    // --- Event Log ---

    appendToEventLog(entry: CoreGameState['eventLog'][number]): void {
        this.coreState.eventLog.push(entry);
    }

    setCurrentEvent(event: CoreGameState['currentEvent']): void {
        this.coreState.currentEvent = event;
    }

    // --- Game Flow Helpers ---

    shouldEndGame(): boolean {
        return (
            this.coreState.round >= this.maxRounds ||
            this.coreState.coreMetric.value <= 0
        );
    }

    resetForNewRound(): void {
        // Reset player-specific round state
        this.corePlayers.forEach(player => {
            player.hasSubmittedActions = false;
            player.actionPoints = GAME_CONFIG.ACTION_POINTS_PER_ROUND;
            player.actions = [];
        });
    }

    // --- Serialization (for debugging/persistence) ---

    toJSON() {
        return {
            coreState: this.coreState,
            corePlayers: Array.from(this.corePlayers.entries()),
        };
    }

    static fromJSON(data: ReturnType<StateManager['toJSON']>): StateManager {
        const manager = new StateManager();
        manager.coreState = data.coreState;
        manager.corePlayers = new Map(data.corePlayers);
        return manager;
    }
}
