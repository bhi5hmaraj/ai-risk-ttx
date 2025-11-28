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
import { coreToSchema } from "./adapters/stateAdapter";
import { buildPlayersFromSetup } from "../services/sessionEngine";
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from "../lib/roomCodeGenerator";

// Import handlers
import { GameStartHandler } from "./handlers/GameStartHandler";
import { RoundAdvanceHandler } from "./handlers/RoundAdvanceHandler";
import { ActionSubmissionHandler } from "./handlers/ActionSubmissionHandler";
import { PlayerManagementHandler } from "./handlers/PlayerManagementHandler";

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

    // Services
    private gameController: GameController;
    private stateManager!: StateManager;

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

        // Initialize StateManager with defaults and optional maxRounds from options
        this.stateManager = new StateManager({
            initialCoreMetricName: "Democratic Legitimacy",
            initialCoreMetricValue: 75,
            maxRounds: typeof options?.maxRounds === 'number' ? options.maxRounds : undefined,
        });

        // If a GameSetup was provided (from lobby), seed full roster from scenario
        try {
            if (options?.gameSetup) {
                const humanRoleName = options?.role || options?.humanRoleName;
                const players = buildPlayersFromSetup(options.gameSetup, humanRoleName);
                this.stateManager.setCorePlayers(players);
                // Seed AI players into Schema with stable ids (keep human for onJoin)
                players.filter(p => !p.isHuman).forEach((p) => {
                    this.state.createPlayer(p.id, { name: p.role.name, role: p.role.name, isHuman: false });
                });
                this.logger.info(this.rid, "Seeded players from setup", { aiCount: players.filter(p => !p.isHuman).length, human: players.find(p => p.isHuman)?.role.name });
                // Update core metric name/value from setup
                const core = this.stateManager.getCoreState();
                core.coreMetric = options.gameSetup.coreMetric || core.coreMetric;
                // Initial projection to Schema
                coreToSchema(core, this.state);
            } else {
                const coreState = this.stateManager.getCoreState();
                coreToSchema(coreState, this.state);
            }
        } catch (e) {
            this.logger?.warn?.(this.rid, 'Failed to seed players from setup', { error: e });
            const coreState = this.stateManager.getCoreState();
            coreToSchema(coreState, this.state);
        }

        // Set maxRounds in schema from StateManager
        this.state.maxRounds = this.stateManager.getMaxRounds();

        // Create logger with roomId and gameId context
        this.logger = createLogger({ roomId: this.roomId, gameId: this.state.roomCode });

        // Extract traceId from options if provided by client
        const traceId = options.traceId || 'no-trace';
        this.logger.info(this.rid, "Room created", { traceId, hasSetup: !!options?.gameSetup, stakeholders: options?.gameSetup?.stakeholders?.length || 0, role: options?.role, options: { name: options?.name, isHuman: options?.isHuman, traceId: options?.traceId } });

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

        this.gameStartHandler = new GameStartHandler(baseDeps);

        this.roundAdvanceHandler = new RoundAdvanceHandler({
            ...baseDeps,
            gameController: this.gameController,
            roomId: this.roomId
        });

        this.actionSubmissionHandler = new ActionSubmissionHandler(baseDeps as any);

        this.playerManagementHandler = new PlayerManagementHandler(baseDeps as any);
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

        // After first player joins, send players_init with role objectives to all clients
        try {
            const corePlayers = this.stateManager.getCorePlayers();
            const payload = {
                players: corePlayers.map(p => ({
                    id: p.id,
                    role: {
                        name: p.role.name,
                        publicObjective: p.role.publicObjective,
                        hiddenObjective: p.role.hiddenObjective,
                        resources: p.role.resources,
                        constraints: p.role.constraints,
                    }
                }))
            };
            this.broadcast('players_init', payload);
        } catch {}
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
}
