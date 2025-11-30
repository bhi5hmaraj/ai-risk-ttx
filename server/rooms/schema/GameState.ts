import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("string") sessionId: string;
    @type("boolean") connected: boolean = true;

    // Player identity
    @type("string") name: string = "";
    @type("string") role: string = "";
    @type("boolean") isHuman: boolean = true;

    // Game state
    @type("number") actionPoints: number = 3;
    @type("boolean") hasSubmitted: boolean = false;

    constructor(sessionId: string, options?: {
        name?: string;
        role?: string;
        isHuman?: boolean;
    }) {
        super();
        this.sessionId = sessionId;
        this.name = options?.name || `Player-${sessionId.slice(0, 4)}`;
        this.role = options?.role || "";
        this.isHuman = options?.isHuman ?? true;
    }
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();

    // Game flow
    @type("string") phase: string = "lobby"; // lobby | action | consequence | end
    @type("number") round: number = 0;
    @type("number") maxRounds: number = 5;
    // Host control
    @type("string") hostId: string = ""; // sessionId of host (empty until assigned)

    // Metrics
    @type("number") publicScore: number = 75;
    @type("string") coreMetricName: string = "Democratic Legitimacy";

    // Room info
    @type("string") roomCode: string = "";

    createPlayer(sessionId: string, options?: {
        name?: string;
        role?: string;
        isHuman?: boolean;
    }) {
        const player = new Player(sessionId, options);
        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    // NEW: Reset action submissions for new round
    resetSubmissions() {
        this.players.forEach((player) => {
            player.hasSubmitted = false;
            player.actionPoints = 3;
        });
    }

    // NEW: Check if all connected HUMAN players have submitted
    // AI players are generated server-side and should not block auto-advance.
    allSubmitted(): boolean {
        const activePlayers = Array.from(this.players.values()).filter(p => p.connected && p.isHuman);
        if (activePlayers.length === 0) return false;
        return activePlayers.every(p => p.hasSubmitted);
    }
}
