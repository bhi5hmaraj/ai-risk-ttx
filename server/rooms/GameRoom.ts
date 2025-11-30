import { Room, Client } from "colyseus";
import { GameState } from "./schema/GameState";
import { createLogger, createReqId } from "../lib/logger";
import {
    SetRoleSchema, SetRoleMessage,
    SubmitActionSchema, SubmitActionMessage,
    StartGameSchema, StartGameMessage,
    AdvanceRoundSchema, AdvanceRoundMessage
} from "../../shared/messages";

import { GameController } from "../services/GameController";
import { StateManager } from "./adapters/stateManager";
import { coreToSchema, buildPlayersInitPayload, buildRolesInitPayloadFromStakeholders } from "./adapters/stateAdapter";
import { RoleName, type StakeholderData } from "../types/core";
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from "../lib/roomCodeGenerator";

// Import handlers
import { GameStartHandler } from "./handlers/GameStartHandler";
import { RoundAdvanceHandler } from "./handlers/RoundAdvanceHandler";
import { ActionSubmissionHandler } from "./handlers/ActionSubmissionHandler";
import { PlayerManagementHandler } from "./handlers/PlayerManagementHandler";
import { SeatRegistry } from "./services/SeatRegistry";

/**
 * GameRoom - Colyseus multiplayer room for Simulacra game
 *
 * Architecture:
 * - Uses handler pattern for separation of concerns
 * - StateManager holds authoritative Core state
 * - Handlers orchestrate business logic
 * - Schema provides network synchronization
 *
 * Responsibilities:
 * - Message routing (delegates to handlers)
 * - Lifecycle management (onCreate, onJoin, onLeave)
 * - Dependency injection (handlers, services)
 */
export class GameRoom extends Room<GameState> {
    maxClients = 6;
    private logger!: ReturnType<typeof createLogger>;
    private rid!: string;
    private initialStakeholders: StakeholderData[] | null = null;

    // Services
    private gameController: GameController;
    private stateManager!: StateManager;
    private seats = new SeatRegistry();

    // Handlers
    private gameStartHandler!: GameStartHandler;
    private roundAdvanceHandler!: RoundAdvanceHandler;
    private actionSubmissionHandler!: ActionSubmissionHandler;
    private playerManagementHandler!: PlayerManagementHandler;

    constructor() {
        super();
        this.gameController = new GameController({ getMaxRounds: () => this.stateManager?.getMaxRounds?.() ?? 8 });
    }

    onCreate(options: any) {
        this.rid = createReqId('room');
        this.setState(new GameState());

        // Generate or use provided gameId (room code)
        // Clients will use this gameId to join/create the same room instance
        const providedGameId = options?.gameId;
        let gameId: string;

        if (providedGameId) {
            // Normalize and validate provided gameId
            gameId = normalizeRoomCode(providedGameId);
            if (!isValidRoomCode(gameId)) {
                // Generate a new one if invalid (defensive)
                gameId = generateRoomCode();
                this.logger?.warn?.(this.rid, 'Invalid gameId provided, generated new one', {
                    provided: providedGameId,
                    generated: gameId
                });
            }
        } else {
            // No gameId provided - generate new room code
            gameId = generateRoomCode();
        }

        // Store gameId in schema for client synchronization
        this.state.roomCode = gameId;

        // Set room metadata for Colyseus matchmaker filtering
        // This allows filterBy(['gameId']) to work correctly
        this.setMetadata({ gameId });

        // Initialize StateManager with defaults and optional maxRounds from options
        this.stateManager = new StateManager({
            initialCoreMetricName: "Democratic Legitimacy",
            initialCoreMetricValue: 75,
            maxRounds: typeof options?.maxRounds === 'number' ? options.maxRounds : undefined,
        });

        // Create logger with roomId and gameId context, including service/env labels for unified logging
        const envLabel = process.env.DEPLOY_ENV || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');
        this.logger = createLogger({ service: 'game-server', env: envLabel, roomId: this.roomId, gameId: this.state.roomCode });

        // Extract traceId from options if provided by client
        const traceId = options.traceId || 'no-trace';
        this.logger.info(this.rid, "Room created", { traceId, hasSetup: !!options?.gameSetup, stakeholders: options?.gameSetup?.stakeholders?.length || 0, role: options?.role, options: { name: options?.name, isHuman: options?.isHuman, traceId: options?.traceId } });

        // If a GameSetup was provided, seed roster; otherwise fall back to a default roster
        try {
            const humanRoleName = options?.role || options?.humanRoleName;
            let setup = options?.gameSetup;
            if (!setup) {
                const fallbackRoleNames = Object.values(RoleName) as string[];
                setup = {
                    scenarioTitle: "AI Election Crisis",
                    scenarioDescription: "A fast-moving election scenario requiring coordination across stakeholders.",
                    coreMetric: this.stateManager.getCoreState().coreMetric,
                    stakeholders: fallbackRoleNames.map((name) => ({
                        name,
                        icon: "👤",
                        publicObjective: "",
                        hiddenObjective: "",
                        resources: [],
                        constraints: [],
                    })),
                    maxRounds: this.stateManager.getMaxRounds(),
                } as any;
                this.logger.info(this.rid, "Using fallback setup for roles (no gameSetup provided)", { count: fallbackRoleNames.length });
            }

            // Store initial stakeholders for lobby projections; do NOT create AI players yet.
            this.initialStakeholders = (setup?.stakeholders || []) as StakeholderData[];

            // Sync initial projection to Schema (phase/round/metric/maxRounds)
            const core = this.stateManager.getCoreState();
            if (setup?.coreMetric) core.coreMetric = setup.coreMetric;
            if (typeof setup?.maxRounds === 'number') (core as any).maxRounds = setup.maxRounds;
            coreToSchema(core, this.state);
        } catch (e) {
            this.logger?.warn?.(this.rid, 'Failed to init from setup', { error: e });
            const coreState = this.stateManager.getCoreState();
            coreToSchema(coreState, this.state);
        }

        // Set maxRounds in schema from StateManager
        this.state.maxRounds = this.stateManager.getMaxRounds();

        // (logger was created earlier)

        // Configure seat reservation timeout
        // Default is 3 seconds which is too short for Next.js dev mode + HMR
        // Increase to 30 seconds to allow time for client to establish connection
        this.seatReservationTime = 30;

        // Initialize handlers with dependencies
        this.initializeHandlers();

        // Register message handlers
        this.registerMessageHandlers();
    }

    /**
     * Initialize all handler instances with their dependencies
     * Follows Dependency Injection pattern for testability
     */
    private initializeHandlers() {
        const baseDeps = {
            state: this.state,
            stateManager: this.stateManager,
            logger: this.logger,
            rid: this.rid,
            broadcast: this.broadcast.bind(this)
        };

        this.gameStartHandler = new GameStartHandler({
            ...baseDeps,
            getInitialStakeholders: () => this.initialStakeholders,
            lockRoom: () => {
                try { this.lock(); } catch {}
            }
        });

        this.roundAdvanceHandler = new RoundAdvanceHandler({
            ...baseDeps,
            gameController: this.gameController,
            roomId: this.roomId
        });

        this.actionSubmissionHandler = new ActionSubmissionHandler({
            ...(baseDeps as any),
            onAllSubmitted: async (client: Client) => {
                try {
                    await this.roundAdvanceHandler.handleAdvanceRound(client);
                } catch (e) {
                    this.logger.error(this.rid, 'Auto-advance on all-submitted failed', { error: e });
                }
            },
        });

        this.playerManagementHandler = new PlayerManagementHandler({
            ...(baseDeps as any),
            emitPlayersInit: () => this.broadcastAvailableRoles(),
            seats: this.seats,
        } as any);
    }

    /**
     * Register all message handlers
     * Each handler delegates to appropriate handler class
     */
    private registerMessageHandlers() {
        // Ping handler (for connection testing)
        this.onMessage("ping", (client, message) => {
            this.logger.info(this.rid, "Ping received", { clientId: client.sessionId, message });
            client.send("pong", { message: "pong" });
        });

        // Set Role Handler
        this.onMessageZod("set_role", SetRoleSchema, (client, data: SetRoleMessage) => {
            this.playerManagementHandler.handleSetRole(client, data.role, data.name);
        });

        // Submit Action Handler
        this.onMessageZod("submit_action", SubmitActionSchema, (client, data: SubmitActionMessage) => {
            this.actionSubmissionHandler.handleSubmitAction(client, data);
        });

        // Start Game Handler
        this.onMessageZod("start_game", StartGameSchema, async (client, data: StartGameMessage) => {
            await this.gameStartHandler.handleStartGame(client);
        });

        // Advance Round Handler
        this.onMessageZod("advance_round", AdvanceRoundSchema, async (client, data: AdvanceRoundMessage) => {
            await this.roundAdvanceHandler.handleAdvanceRound(client);
        });

        // Request re-broadcast of available roles
        this.onMessage("request_roles", (client) => {
            this.logger.info(this.rid, "request_roles received", { clientId: client.sessionId });
            try {
                this.broadcastAvailableRoles(client);
            } catch (e) {
                this.logger.warn(this.rid, "request_roles failed", { error: e });
            }
        });
    }

    /**
     * Helper for Zod-validated messages
     * Validates message schema before passing to handler
     */
    private onMessageZod<T>(type: string, schema: any, callback: (client: Client, data: T) => void) {
        this.onMessage(type, (client, message) => {
            const result = schema.safeParse(message);
            if (!result.success) {
                this.logger.warn(this.rid, `Invalid message ${type}`, { error: result.error, clientId: client.sessionId });
                client.send("error", { message: "Invalid message format" });
                return;
            }
            callback(client, result.data);
        });
    }

    onJoin(client: Client, options: any) {
        // Store traceId in client for logging correlation
        (client as any).traceId = options.traceId || createReqId('trace');

        this.playerManagementHandler.handlePlayerJoin(client, options);

        // Host assignment logic:
        // - Prefer explicit host intent (SPA Create Game flow)
        // - Fallback: if join carried a GameSetup (old lobby flow)
        if (!this.state.hostId && (options?.isHost === true || options?.gameSetup)) {
            this.state.hostId = client.sessionId;
            this.logger.info(this.rid, "Assigned hostId", { clientId: client.sessionId, reason: options?.isHost ? 'host_intent' : 'game_setup' });
        }

        // After join, send available roles to all clients
        this.broadcastAvailableRoles(client);
    }

    async onLeave(client: Client, consented: boolean) {
        this.logger.info(this.rid, "Player leaving", {
            clientId: client.sessionId,
            consented,
            gamePhase: this.state.phase
        });

        // Allow reconnection if game is still in progress and not consented (e.g., browser closed)
        // Give 60 seconds to reconnect
        if (!consented && this.state.phase !== 'end') {
            try {
                this.logger.info(this.rid, "Allowing reconnection", {
                    clientId: client.sessionId,
                    timeout: 60
                });
                await this.allowReconnection(client, 60);
                this.logger.info(this.rid, "Player reconnected successfully", {
                    clientId: client.sessionId
                });
                return; // Player reconnected, don't remove them
            } catch (e) {
                this.logger.warn(this.rid, "Reconnection timeout or failed", {
                    clientId: client.sessionId,
                    error: e
                });
                // Fall through to handlePlayerLeave
            }
        }

        // Player left permanently or game ended
        this.playerManagementHandler.handlePlayerLeave(client, consented);
    }

    onDispose() {
        this.logger.info(this.rid, "Room disposing", {
            roomId: this.roomId,
        });
    }

    // Read-only snapshot for SSR/admin. Do not mutate state here.
    // Returns a sanitized view of the current game state.
    getSnapshot() {
        try {
            const core = this.stateManager.getCoreState();
            const corePlayers = this.stateManager.getCorePlayers();
            const players = corePlayers.map(p => ({
                id: p.id,
                role: p.role?.name || '',
                isHuman: !!p.isHuman,
            }));
            return {
                gameId: this.state.roomCode || this.roomId,
                stateVersion: core.eventLog?.length ?? 0,
                phase: core.phase,
                round: core.round,
                coreMetric: core.coreMetric,
                players,
                deadlineAt: undefined,
            };
        } catch (e) {
            this.logger?.error?.(this.rid, 'getSnapshot failed', { error: e });
            return { gameId: this.state.roomCode || this.roomId, phase: this.state.phase, round: this.state.round };
        }
    }

    // Helper: compute and broadcast available roles (players_init payload)
    private broadcastAvailableRoles(client?: Client) {
        try {
            const isLobby = this.state.phase === 'lobby';
            let payload: any;
            if (isLobby && this.initialStakeholders && this.initialStakeholders.length > 0) {
                payload = buildRolesInitPayloadFromStakeholders(this.state, this.initialStakeholders);
            } else {
                const corePlayers = this.stateManager.getCorePlayers();
                payload = buildPlayersInitPayload(this.state, corePlayers);
            }
            this.logger.info(this.rid, "Broadcasting players_init", {
                clientId: client?.sessionId,
                playerCount: payload.players.length,
                roles: payload.players.map((p: any) => `${p.role.name}${p.isTaken ? ' (taken)' : ''}`)
            });
            this.broadcast('players_init', payload);
        } catch (e) {
            this.logger.warn(this.rid, "Failed to broadcast players_init", { error: e });
        }
    }
}
