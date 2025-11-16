#!/bin/bash

# Colyseus Migration - Complete Task Breakdown Script
# Focus: Contract-first approach for safe migration
#
# Usage: ./scripts/setup-colyseus-migration-tasks.sh
#
# This script creates a comprehensive task breakdown for migrating from SSE to Colyseus
# with a strong emphasis on getting contracts (types, schemas, APIs) right before implementation.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure bd is in PATH
export PATH="$PATH:/root/go/bin:$HOME/go/bin"

# Check if bd is available
if ! command -v bd &> /dev/null; then
    echo -e "${RED}Error: bd (beads) is not installed or not in PATH${NC}"
    echo "Install from: https://github.com/steveyegge/beads"
    exit 1
fi

echo -e "${GREEN}🔗 Setting up Colyseus Migration task breakdown...${NC}\n"

# ============================================================================
# PHASE 0: CONTRACTS & INFRASTRUCTURE SETUP
# ============================================================================

echo -e "${YELLOW}Creating Phase 0: Contracts & Infrastructure Setup${NC}"

# 0.1 Define Colyseus State Schema Contract
ISSUE_0_1=$(bd create "Define Colyseus State Schema contract" \
  --type task \
  --priority 0 \
  --description "Define TypeScript Schema classes for game state synchronization.

**Contract Requirements:**
- GameState schema (phase, round, publicScore, coreMetricName, currentEvent)
- Player schema (id, name, role, isHuman, hiddenScore, actionPoints, hasSubmitted)
- ActionOption schema (id, title, description, cost, category)
- EventLogEntry schema (round, event, timestamp)

**Files to Create:**
- \`game-server/schemas/GameState.ts\`
- \`game-server/schemas/Player.ts\`
- \`game-server/schemas/ActionOption.ts\`

**Validation:**
- All schemas use @type decorators from @colyseus/schema
- State sync tested with 2 clients
- Schema changes automatically propagate to clients

**Definition of Done:**
- [ ] Schema classes defined with proper types
- [ ] Schema documentation with examples
- [ ] Unit tests for schema serialization
- [ ] Client can subscribe to state changes" --json | jq -r '.id')

# 0.2 Define Message Handler Contracts
ISSUE_0_2=$(bd create "Define Message Handler contracts (client ↔ server)" \
  --type task \
  --priority 0 \
  --description "Define TypeScript interfaces for all client-server messages.

**Message Types:**

**Client → Server:**
\`\`\`typescript
interface JoinRoomMessage {
  playerName: string;
  roleId: string;
}

interface SubmitActionMessage {
  actionId: string;
  actionPointsSpent: number;
}

interface ChatMessage {
  message: string;
  timestamp: number;
}

interface ReadyForNextRoundMessage {
  ready: boolean;
}
\`\`\`

**Server → Client:**
\`\`\`typescript
interface RoundAdvancedEvent {
  round: number;
  phase: GamePhase;
}

interface ConsequencesGeneratedEvent {
  consequences: string;
  scoreChanges: Record<string, number>;
}

interface PlayerDisconnectedEvent {
  playerId: string;
  canReconnect: boolean;
}
\`\`\`

**Files to Create:**
- \`shared/messages.ts\` (used by both client and server)

**Definition of Done:**
- [ ] All message types defined with Zod schemas
- [ ] Type-safe message handlers in GameRoom
- [ ] Client-side message sender functions typed
- [ ] Message validation tests" --json | jq -r '.id')

# 0.3 Define Agent Tool Contracts
ISSUE_0_3=$(bd create "Define OpenAI Agents SDK tool contracts" \
  --type task \
  --priority 0 \
  --description "Define function schemas for AI agent tools.

**Tool Contracts:**

\`\`\`typescript
// Tool: send_message
interface SendMessageTool {
  name: 'send_message';
  description: 'Send a message to other players in the game';
  parameters: {
    type: 'object';
    properties: {
      message: { type: 'string'; description: 'Message content' };
      recipients: { type: 'array'; items: { type: 'string' }; description: 'Player IDs' };
    };
    required: ['message'];
  };
}

// Tool: submit_action
interface SubmitActionTool {
  name: 'submit_action';
  description: 'Submit selected action for current round';
  parameters: {
    type: 'object';
    properties: {
      actionId: { type: 'string'; description: 'Selected action ID' };
      reasoning: { type: 'string'; description: 'Reasoning for choice' };
    };
    required: ['actionId'];
  };
}

// Tool: request_information
interface RequestInformationTool {
  name: 'request_information';
  description: 'Request additional context about game state';
  parameters: {
    type: 'object';
    properties: {
      query: { type: 'string'; description: 'Information needed' };
    };
    required: ['query'];
  };
}
\`\`\`

**Files to Create:**
- \`game-server/agents/tools.ts\`
- \`game-server/agents/AgentManager.ts\`

**Definition of Done:**
- [ ] Tool schemas defined with JSON Schema
- [ ] Tool handler implementations
- [ ] AgentManager initializes agents with tools
- [ ] Tool execution traced in logs" --json | jq -r '.id')

# 0.4 Define Firebase Remote Config Contract
ISSUE_0_4=$(bd create "Define Firebase Remote Config schema contract" \
  --type task \
  --priority 0 \
  --description "Define TypeScript interface for Firebase Remote Config shape.

**Config Schema:**

\`\`\`typescript
interface GameConfig {
  // AI Configuration
  ai_temperature: number; // 0.0-1.0
  ai_model: string; // e.g., 'gemini/gemini-2.0-flash-exp'
  ai_timeout_ms: number;

  // Game Mechanics
  max_rounds: number;
  action_points_per_round: number;
  action_phase_seconds: number;

  // Prompts (versioned)
  prompt_system_regulator: string;
  prompt_system_tech_ceo: string;
  prompt_system_journalist: string;
  prompt_generate_actions: string;
  prompt_generate_consequences: string;
  prompt_generate_counterfactual: string;

  // Feature Flags
  feature_multiplayer_enabled: boolean;
  feature_debug_mode: boolean;
  feature_admin_dashboard: boolean;

  // Observability
  sentry_sample_rate: number;
  log_level: 'debug' | 'info' | 'warn' | 'error';
}
\`\`\`

**Files to Create:**
- \`lib/firebase-config.ts\` (config fetcher with type safety)
- \`game-server/config/RemoteConfigService.ts\`

**Validation:**
- Config snapshot saved per game (for reproducibility)
- Hot reload tested (new games pick up changes)
- Default values for local development

**Definition of Done:**
- [ ] TypeScript interface matches Firebase schema
- [ ] Config fetcher with fallback to defaults
- [ ] Config snapshot saved in GameSnapshot model
- [ ] Documentation of all config parameters" --json | jq -r '.id')

# 0.5 Define Room Code & Authentication Contract
ISSUE_0_5=$(bd create "Define Room Code generation & join contract" \
  --type task \
  --priority 0 \
  --description "Define contracts for room creation and joining.

**Room Creation Contract:**

\`\`\`typescript
interface CreateRoomOptions {
  scenarioId: string; // 'classic' | 'ai_safety' | custom ID
  maxPlayers: number;
  createdBy: string; // Player name
}

interface CreateRoomResponse {
  roomId: string;
  roomCode: string; // 6-character code
  joinUrl: string; // /game/[code]
}
\`\`\`

**Join Room Contract:**

\`\`\`typescript
interface JoinRoomRequest {
  roomCode: string;
  playerName: string;
  roleId?: string; // Optional if joining as spectator
}

interface JoinRoomResponse {
  success: boolean;
  sessionId: string;
  roomId: string;
  error?: string;
}
\`\`\`

**Room Code Requirements:**
- 6 characters, base32 alphabet (exclude ambiguous chars: 0, O, I, 1)
- Case-insensitive
- Collision probability < 0.00001% with 100 active rooms

**Files to Create:**
- \`lib/room-codes.ts\` (generator + validator)
- \`game-server/rooms/GameRoom.ts\` (onCreate with code)

**Definition of Done:**
- [ ] Room code generator implemented
- [ ] Collision detection tested (10,000 codes)
- [ ] Join by code tested from different browsers
- [ ] Invalid code handling tested" --json | jq -r '.id')

# 0.6 Feature Flag Infrastructure
ISSUE_0_6=$(bd create "Set up Feature Flag infrastructure" \
  --type task \
  --priority 0 \
  --description "Implement feature flag system for gradual Colyseus rollout.

**Feature Flags:**

\`\`\`typescript
interface FeatureFlags {
  COLYSEUS_ENABLED: {
    rolloutPercent: number; // 0-100
    isEnabledForUser(userId: string): boolean;
  };
}
\`\`\`

**Implementation:**
- Environment variable: \`COLYSEUS_ROLLOUT_PERCENT\`
- Consistent hashing (same user always sees same variant)
- Can toggle SSE ↔ Colyseus with env var change

**Files to Create:**
- \`lib/featureFlags.ts\`
- Update \`app/game/page.tsx\` to branch on flag

**Definition of Done:**
- [ ] Feature flag implemented with consistent hashing
- [ ] Tested: 0% = SSE, 100% = Colyseus
- [ ] Rollout procedure documented
- [ ] Emergency rollback tested (< 5 minutes)" --json | jq -r '.id')

# 0.7 Set up structured logging
ISSUE_0_7=$(bd create "Set up structured logging with room/agent context" \
  --type task \
  --priority 0 \
  --description "Implement structured JSON logging for debugging.

**Log Format:**

\`\`\`typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: {
    roomId?: string;
    roomCode?: string;
    agentId?: string;
    playerId?: string;
    round?: number;
    phase?: string;
  };
  metadata?: Record<string, any>;
}
\`\`\`

**Files to Create:**
- \`lib/logger.ts\`
- Update \`GameRoom.ts\` to use structured logger

**Definition of Done:**
- [ ] Logger integrated into GameRoom lifecycle
- [ ] All AI calls logged with latency
- [ ] Errors include full context
- [ ] Logs viewable in admin dashboard" --json | jq -r '.id')

echo -e "${GREEN}✅ Phase 0 tasks created${NC}\n"

# ============================================================================
# PHASE 1: PROOF OF CONCEPT
# ============================================================================

echo -e "${YELLOW}Creating Phase 1: Proof of Concept tasks${NC}"

# 1.1 Next.js Custom Server Setup
ISSUE_1_1=$(bd create "Set up Next.js custom server with Colyseus" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_0_1" \
  --description "Create custom server.ts that runs both Next.js and Colyseus.

**Implementation:**

\`\`\`typescript
// server.ts
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true);
    await handle(req, res, parsedUrl);
  });

  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });

  gameServer.define('game', GameRoom);

  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => {
    console.log(\`> Ready on http://localhost:\${port}\`);
  });
});
\`\`\`

**Files to Create:**
- \`server.ts\`
- Update \`package.json\` scripts

**Definition of Done:**
- [ ] npm run dev starts both Next.js + Colyseus
- [ ] Hot reload still works
- [ ] Can access Next.js pages
- [ ] WebSocket endpoint available" --json | jq -r '.id')

# 1.2 Basic GameRoom Implementation
ISSUE_1_2=$(bd create "Implement basic GameRoom with state sync" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_1_1,$ISSUE_0_2" \
  --description "Create minimal GameRoom that syncs state to clients.

**GameRoom Lifecycle:**

\`\`\`typescript
export class GameRoom extends Room<GameState> {
  onCreate(options: any) {
    this.setState(new GameState());
    this.state.phase = 'lobby';
    this.metadata = { code: generateRoomCode() };
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    player.id = client.sessionId;
    player.name = options.playerName;
    this.state.players.set(client.sessionId, player);
  }

  onMessage(client: Client, type: any, message: any) {
    // Message handlers
  }

  onLeave(client: Client, consented: boolean) {
    // Handle disconnection
  }

  onDispose() {
    // Cleanup
  }
}
\`\`\`

**Definition of Done:**
- [ ] GameRoom registered with Colyseus
- [ ] State schema working
- [ ] 2 clients can join and see each other
- [ ] State changes propagate in real-time" --json | jq -r '.id')

# 1.3 React Client Integration
ISSUE_1_3=$(bd create "Create React hook for Colyseus client" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_1_2" \
  --description "Create useGameRoom hook for React integration.

**Hook Interface:**

\`\`\`typescript
interface UseGameRoomReturn {
  room: Room<GameState> | null;
  state: GameState | null;
  connected: boolean;
  error: string | null;

  // Actions
  joinRoom: (code: string, playerName: string) => Promise<void>;
  sendMessage: (type: string, data: any) => void;
  leaveRoom: () => void;
}

function useGameRoom(): UseGameRoomReturn;
\`\`\`

**Files to Create:**
- \`hooks/useGameRoom.ts\`

**Definition of Done:**
- [ ] Hook handles connection lifecycle
- [ ] State automatically synced to React state
- [ ] Reconnection on connection loss
- [ ] Cleanup on unmount" --json | jq -r '.id')

# 1.4 Connection Testing
ISSUE_1_4=$(bd create "Test connection reliability (reconnection, multi-tab)" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_1_3" \
  --description "Validate Colyseus solves SSE connection issues.

**Test Scenarios:**

1. **Multi-tab test:**
   - Open 2 browser tabs
   - Join same room from both
   - Verify state syncs between tabs

2. **Disconnect/Reconnect:**
   - Join room
   - Disable network
   - Re-enable network
   - Verify automatic reconnection

3. **Close/Rejoin:**
   - Join room
   - Close browser tab
   - Reopen and rejoin
   - Verify session recovery

4. **Network latency simulation:**
   - Simulate 200ms latency
   - Verify state updates still work
   - Measure latency impact

**Definition of Done:**
- [ ] All 4 test scenarios pass
- [ ] Reconnection < 2 seconds
- [ ] Connection feels better than SSE
- [ ] No state desync issues" --json | jq -r '.id')

echo -e "${GREEN}✅ Phase 1 tasks created${NC}\n"

# ============================================================================
# PHASE 2: CORE GAME LOOP
# ============================================================================

echo -e "${YELLOW}Creating Phase 2: Core Game Loop tasks${NC}"

# 2.1 Room Code System
ISSUE_2_1=$(bd create "Implement room creation with 6-char codes" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_1_4,$ISSUE_0_5" \
  --description "Implement room code generation and lobby page.

**Lobby Flow:**
1. User clicks 'Create Game'
2. Server generates 6-char code
3. Room URL: /game/[code]
4. User shares URL with others
5. Others join via code

**Files to Update:**
- \`app/lobby/page.tsx\` - Create game button
- \`app/game/[code]/page.tsx\` - Join by code
- \`lib/room-codes.ts\` - Generator

**Definition of Done:**
- [ ] Create game generates code
- [ ] Join by code works
- [ ] Invalid code shows error
- [ ] Room codes are memorable (tested with 5 users)" --json | jq -r '.id')

# 2.2 Action Submission Flow
ISSUE_2_2=$(bd create "Implement action selection and submission via Colyseus" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_2_1,$ISSUE_0_2" \
  --description "Migrate action submission from SSE to Colyseus messages.

**Message Flow:**

1. **Server sends action options:**
   \`room.broadcast('action_options', { options: [...] })\`

2. **Client submits action:**
   \`room.send('submit_action', { actionId, reasoning })\`

3. **Server processes:**
   - Mark player.hasSubmitted = true
   - Check if all submitted
   - Advance to consequence phase

**Files to Update:**
- \`components/game/ActionSelection.tsx\` - Use room.send()
- \`game-server/rooms/GameRoom.ts\` - Add submit_action handler

**Definition of Done:**
- [ ] Action selection UI connected to Colyseus
- [ ] Multi-player submission tested
- [ ] Race condition tested (simultaneous submit)
- [ ] State updates for all players" --json | jq -r '.id')

# 2.3 AI Agent Integration
ISSUE_2_3=$(bd create "Integrate OpenAI Agents SDK with LiteLLM" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_2_2,$ISSUE_0_3,$ISSUE_0_4" \
  --description "Set up AgentManager and initialize AI agents in GameRoom.

**AgentManager Implementation:**

\`\`\`typescript
export class AgentManager {
  private openai: OpenAI;
  private agents: Map<string, Agent> = new Map();
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: process.env.LITELLM_API_KEY!,
      baseURL: 'https://asgard.bhishmaraj.org',
    });
  }

  async initializeAgent(agentId: string, role: string): Promise<Agent> {
    const agent = new Agent({
      name: \`\${agentId} (\${role})\`,
      model: this.config.ai_model,
      client: this.openai,
      temperature: this.config.ai_temperature,
      tools: [
        { type: 'function', function: sendMessageTool },
        { type: 'function', function: submitActionTool },
      ],
    });

    this.agents.set(agentId, agent);
    return agent;
  }

  async generateAction(agentId: string, context: string): Promise<string> {
    const agent = this.agents.get(agentId);
    const result = await agent.run({ messages: [{ role: 'user', content: context }] });
    return result;
  }
}
\`\`\`

**Files to Create:**
- \`game-server/agents/AgentManager.ts\`
- Update \`GameRoom.onCreate()\` to initialize agents

**Definition of Done:**
- [ ] AgentManager creates 5 AI agents per game
- [ ] Agents use LiteLLM → Gemini
- [ ] Agent conversation history persists across rounds
- [ ] Tool calls (submit_action) work correctly" --json | jq -r '.id')

# 2.4 Full Round Testing
ISSUE_2_4=$(bd create "Test full game round (human + AI → consequences)" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_2_3" \
  --description "End-to-end test of one complete round.

**Round Flow:**
1. Round starts → ACTION phase
2. Human player sees 5 action options
3. Human submits action
4. AI agents generate actions (parallel)
5. Server generates consequences
6. Scores updated
7. Event log updated
8. Round advances

**Test Cases:**

- [ ] Round completes with 1 human + 5 AI players
- [ ] AI agents remember previous rounds
- [ ] Consequences reflect all actions
- [ ] Scores update correctly
- [ ] Can play 3 consecutive rounds

**Performance Requirements:**
- AI action generation: < 10 seconds (parallel)
- Consequence generation: < 15 seconds
- Total round time: < 30 seconds

**Definition of Done:**
- [ ] Full round tested end-to-end
- [ ] Timing meets requirements
- [ ] No race conditions
- [ ] State stays consistent" --json | jq -r '.id')

# 2.5 Human-to-Human Chat
ISSUE_2_5=$(bd create "Implement real-time chat between players" \
  --type task \
  --priority 1 \
  --deps "$ISSUE_2_4" \
  --description "Add chat feature for multiplayer games.

**Chat Message Contract:**

\`\`\`typescript
interface ChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}
\`\`\`

**Implementation:**
- Client: \`room.send('chat', { message })\`
- Server: \`room.broadcast('chat', chatMessage)\`

**Files to Create:**
- \`components/game/ChatPanel.tsx\`
- Add chat handler to GameRoom

**Definition of Done:**
- [ ] Chat messages sent in real-time
- [ ] Message history shown (last 50 messages)
- [ ] Sender names displayed
- [ ] Works with multiple players" --json | jq -r '.id')

echo -e "${GREEN}✅ Phase 2 tasks created${NC}\n"

# ============================================================================
# PHASE 3: MULTIPLAYER EDGE CASES
# ============================================================================

echo -e "${YELLOW}Creating Phase 3: Multiplayer Edge Cases tasks${NC}"

# 3.1 Disconnection Handling
ISSUE_3_1=$(bd create "Implement 60s reconnection window for disconnected players" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_2_5" \
  --description "Handle player disconnections gracefully.

**Reconnection Logic:**

\`\`\`typescript
onLeave(client: Client, consented: boolean) {
  if (consented) {
    // Player left intentionally - remove immediately
    this.state.players.delete(client.sessionId);
  } else {
    // Connection lost - allow 60s reconnection
    this.allowReconnection(client, 60).then(() => {
      // Reconnected successfully
      this.broadcast('player_reconnected', { playerId: client.sessionId });
    }).catch(() => {
      // Timeout - remove player
      this.state.players.delete(client.sessionId);
      this.broadcast('player_removed', { playerId: client.sessionId });
    });
  }
}
\`\`\`

**Test Scenarios:**

- [ ] Player disconnects mid-round → 60s countdown starts
- [ ] Player reconnects within 60s → seamlessly resume
- [ ] Player doesn't reconnect → removed after 60s
- [ ] Game pauses if disconnected player hasn't submitted action

**Definition of Done:**
- [ ] 60s reconnection window implemented
- [ ] All test scenarios pass
- [ ] UI shows 'Player disconnected' status
- [ ] Game resumes after reconnection" --json | jq -r '.id')

# 3.2 Concurrent Action Handling
ISSUE_3_2=$(bd create "Prevent race conditions in concurrent action submission" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_3_1" \
  --description "Handle multiple players submitting actions simultaneously.

**Race Condition Prevention:**

\`\`\`typescript
onMessage('submit_action', (client, message) => {
  const player = this.state.players.get(client.sessionId);

  // Prevent duplicate submissions
  if (player.hasSubmitted) {
    client.send('error', { message: 'Already submitted' });
    return;
  }

  // Atomic update
  player.hasSubmitted = true;
  player.selectedAction = message.action;

  // Check if round complete
  const allSubmitted = Array.from(this.state.players.values())
    .every(p => p.hasSubmitted);

  if (allSubmitted) {
    this.processRound();
  }
});
\`\`\`

**Test Cases:**

- [ ] 6 players submit simultaneously → no duplicates
- [ ] Player tries to submit twice → error shown
- [ ] Round only processes once all submitted
- [ ] No race condition with AI submissions

**Definition of Done:**
- [ ] Race condition tests pass (100 iterations)
- [ ] Duplicate submission prevented
- [ ] Round processes exactly once
- [ ] No state corruption" --json | jq -r '.id')

# 3.3 Game Lifecycle Management
ISSUE_3_3=$(bd create "Implement game disposal, idle timeout, max duration" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_3_2" \
  --description "Manage room lifecycle and cleanup.

**Lifecycle Rules:**

1. **Idle Timeout:** 30 minutes of inactivity → room closes
2. **Max Duration:** 3 hours max → force end
3. **Game End:** Final state saved to Postgres

**Implementation:**

\`\`\`typescript
async onCreate(options: any) {
  // Set idle timeout
  this.setIdleTimeout(30 * 60); // 30 minutes

  // Set max duration
  setTimeout(() => {
    if (this.state.phase !== 'end') {
      this.forceEndGame('Max duration reached');
    }
  }, 3 * 60 * 60 * 1000); // 3 hours
}

async onDispose() {
  // Save final state to database
  await prisma.gameSnapshot.create({
    data: {
      gameId: this.roomId,
      round: this.state.round,
      gameState: this.state.toJSON(),
      configSnapshot: this.config,
      completedAt: new Date(),
    },
  });

  // Cleanup AI agents
  this.agentManager.dispose();
}
\`\`\`

**Definition of Done:**
- [ ] Idle timeout tested (30 min)
- [ ] Max duration tested (3 hours)
- [ ] Final state saved to Postgres
- [ ] Room cleanup verified (no memory leaks)" --json | jq -r '.id')

echo -e "${GREEN}✅ Phase 3 tasks created${NC}\n"

# ============================================================================
# PHASE 4: ADMIN DASHBOARD
# ============================================================================

echo -e "${YELLOW}Creating Phase 4: Admin Dashboard tasks${NC}"

# 4.1 Admin API Routes
ISSUE_4_1=$(bd create "Create admin API routes for room monitoring" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_3_3" \
  --description "Build API endpoints for admin dashboard.

**API Routes:**

\`\`\`typescript
// GET /api/admin/rooms
export async function GET(req: Request) {
  // Verify admin password
  if (req.headers.authorization !== \`Bearer \${process.env.ADMIN_SECRET}\`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rooms = await matchMaker.query({});
  const roomData = rooms.map(room => ({
    roomId: room.roomId,
    code: room.metadata?.code,
    clients: room.clients,
    phase: room.state?.phase,
    round: room.state?.round,
  }));

  return Response.json({ rooms: roomData });
}

// POST /api/admin/rooms/[id]/force-advance
export async function POST(req: Request) {
  // Force advance to next round
}

// POST /api/admin/rooms/[id]/end
export async function POST(req: Request) {
  // Force end game
}
\`\`\`

**Files to Create:**
- \`app/api/admin/rooms/route.ts\`
- \`app/api/admin/rooms/[id]/force-advance/route.ts\`
- \`app/api/admin/rooms/[id]/end/route.ts\`

**Definition of Done:**
- [ ] All API routes implemented
- [ ] Password authentication working
- [ ] Can list all active rooms
- [ ] Can force actions on rooms" --json | jq -r '.id')

# 4.2 Admin Dashboard UI
ISSUE_4_2=$(bd create "Build admin dashboard UI for live game monitoring" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_4_1" \
  --description "Create admin page for IRL event monitoring.

**Features:**

- List all active games (room code, players, round, phase)
- Click room → detailed view
- Player connection status (connected/away/disconnected)
- Last 50 events per room
- Manual actions: Force advance, end game, kick player
- Export game state as JSON

**Files to Create:**
- \`app/admin/page.tsx\` - Login + room list
- \`app/admin/rooms/[id]/page.tsx\` - Detailed room view

**UI Requirements:**
- Password-protected (env var ADMIN_SECRET)
- Mobile-friendly (for on-site troubleshooting)
- Real-time updates (poll every 5 seconds)
- Export button for each game

**Definition of Done:**
- [ ] Can view all active games
- [ ] Detailed room view shows all state
- [ ] Manual actions work (tested)
- [ ] Works on mobile" --json | jq -r '.id')

echo -e "${GREEN}✅ Phase 4 tasks created${NC}\n"

# ============================================================================
# PHASE 5: PRODUCTION DEPLOYMENT
# ============================================================================

echo -e "${YELLOW}Creating Phase 5: Production Deployment tasks${NC}"

# 5.1 Dockerfile for Custom Server
ISSUE_5_1=$(bd create "Create Dockerfile for Next.js + Colyseus custom server" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_4_2" \
  --description "Build production Docker image.

**Dockerfile:**

\`\`\`dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/game-server ./game-server

EXPOSE 3000
CMD [\"node\", \"server.ts\"]
\`\`\`

**Definition of Done:**
- [ ] Dockerfile builds successfully
- [ ] Production build works locally
- [ ] WebSocket connections work in container
- [ ] Image size optimized (< 500MB)" --json | jq -r '.id')

# 5.2 Cloud Run Deployment
ISSUE_5_2=$(bd create "Deploy to Cloud Run staging environment" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_5_1" \
  --description "Deploy to Cloud Run and test from external network.

**Cloud Run Configuration:**

\`\`\`bash
gcloud run deploy simulacra-staging \\
  --source . \\
  --region us-central1 \\
  --allow-unauthenticated \\
  --set-env-vars LITELLM_API_KEY=\${LITELLM_API_KEY} \\
  --set-env-vars DATABASE_URL=\${DATABASE_URL} \\
  --set-env-vars COLYSEUS_ROLLOUT_PERCENT=0 \\
  --min-instances 1 \\
  --timeout 3600 \\
  --memory 2Gi
\`\`\`

**Test Checklist:**

- [ ] Deploy succeeds
- [ ] Can access from external network
- [ ] WebSocket upgrade works
- [ ] Game playable from mobile
- [ ] Database connection works
- [ ] AI agents work (LiteLLM reachable)

**Definition of Done:**
- [ ] Staging environment live
- [ ] External tests pass
- [ ] Cold start < 10 seconds
- [ ] No production issues detected" --json | jq -r '.id')

# 5.3 Gradual Rollout
ISSUE_5_3=$(bd create "Production rollout: 10% → 50% → monitoring" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_5_2,$ISSUE_0_6" \
  --description "Gradual rollout to production users.

**Rollout Plan:**

**Day 12 (Staging):**
- Deploy to staging
- Test with 3-5 beta testers
- Monitor for 4 hours

**Day 13 (10%):**
\`\`\`bash
gcloud run services update simulacra \\
  --update-env-vars COLYSEUS_ROLLOUT_PERCENT=10
\`\`\`
- Monitor Sentry for 4 hours
- Check error rate < 1%
- Validate performance (latency < 200ms)

**Day 14 (50%):**
\`\`\`bash
gcloud run services update simulacra \\
  --update-env-vars COLYSEUS_ROLLOUT_PERCENT=50
\`\`\`
- Monitor for 24 hours
- User feedback collected

**Day 18 (GO/NO-GO):**
- If confident → 100%
- If issues → 0% (SSE backup)

**Definition of Done:**
- [ ] 10% rollout successful
- [ ] 50% rollout successful
- [ ] Error rate < 1%
- [ ] User feedback positive" --json | jq -r '.id')

echo -e "${GREEN}✅ Phase 5 tasks created${NC}\n"

# ============================================================================
# PHASE 6: STRESS TESTING
# ============================================================================

echo -e "${YELLOW}Creating Phase 6: Stress Testing tasks${NC}"

# 6.1 Load Testing
ISSUE_6_1=$(bd create "Load test: 20 concurrent games with AI agents" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_5_3" \
  --description "Validate production readiness under load.

**Load Test Scenarios:**

1. **20 Concurrent Games:**
   - Script creates 20 rooms
   - Each with 1 human + 5 AI agents
   - All games run simultaneously
   - Duration: 30 minutes

2. **Metrics to Monitor:**
   - CPU usage
   - Memory usage
   - WebSocket connection count
   - AI call latency
   - Database query time
   - Error rate

3. **Performance Targets:**
   - AI action generation: < 10 seconds
   - Consequence generation: < 15 seconds
   - WebSocket latency: < 200ms
   - Memory per game: < 100MB
   - Error rate: < 0.1%

**Test Script:**

\`\`\`typescript
// scripts/load-test.ts
async function loadTest() {
  const games = [];
  for (let i = 0; i < 20; i++) {
    games.push(createGame());
  }
  await Promise.all(games.map(g => g.playFullGame()));
}
\`\`\`

**Definition of Done:**
- [ ] 20 concurrent games complete successfully
- [ ] All performance targets met
- [ ] No memory leaks detected
- [ ] Cloud Run doesn't throttle" --json | jq -r '.id')

# 6.2 Long-Duration Test
ISSUE_6_2=$(bd create "Long-duration test: 4-hour game session" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_6_1" \
  --description "Test game stability over extended period.

**Test Setup:**
- Single game running for 4 hours
- 6 players (1 human, 5 AI)
- Human player simulated (bot)
- Monitor for memory leaks, connection drops

**Test Cases:**

- [ ] Game runs for 4 hours without crash
- [ ] WebSocket stays connected
- [ ] Memory usage stable (no growth)
- [ ] AI agents maintain conversation history
- [ ] No state corruption
- [ ] Database snapshots saved correctly

**Definition of Done:**
- [ ] 4-hour test completes
- [ ] No issues detected
- [ ] Memory profile clean
- [ ] Final state valid" --json | jq -r '.id')

# 6.3 Network Resilience Test
ISSUE_6_3=$(bd create "Network resilience: simulate disconnections and reconnections" \
  --type task \
  --priority 0 \
  --deps "$ISSUE_6_2" \
  --description "Test reconnection under adverse network conditions.

**Test Scenarios:**

1. **Random disconnections:**
   - Randomly disconnect 1 player every 2 minutes
   - Verify automatic reconnection
   - Game continues without issues

2. **Network latency:**
   - Simulate 500ms latency
   - Verify game still playable
   - Measure user experience impact

3. **Total network loss:**
   - Disconnect all players for 10 seconds
   - Verify all reconnect successfully
   - No data loss

**Tools:**
- Chrome DevTools (Network throttling)
- Proxy with artificial delays

**Definition of Done:**
- [ ] All reconnection scenarios tested
- [ ] Success rate > 95%
- [ ] No data corruption
- [ ] User experience acceptable (< 5s reconnect)" --json | jq -r '.id')

echo -e "${GREEN}✅ Phase 6 tasks created${NC}\n"

# ============================================================================
# ADDITIONAL CONTRACT VALIDATION TASKS
# ============================================================================

echo -e "${YELLOW}Creating Contract Validation tasks${NC}"

# CV.1 Contract Testing Suite
ISSUE_CV_1=$(bd create "Create contract testing suite for all interfaces" \
  --type task \
  --priority 1 \
  --deps "$ISSUE_0_1,$ISSUE_0_2,$ISSUE_0_3,$ISSUE_0_4" \
  --description "Build automated tests for all contract validation.

**Test Coverage:**

1. **Schema Contracts:**
   \`\`\`typescript
   describe('GameState Schema', () => {
     test('serializes correctly', () => {
       const state = new GameState();
       const json = state.toJSON();
       expect(json).toHaveProperty('phase');
       expect(json).toHaveProperty('round');
     });
   });
   \`\`\`

2. **Message Contracts:**
   \`\`\`typescript
   describe('Message Validation', () => {
     test('SubmitActionMessage validates correctly', () => {
       const valid = { actionId: 'act-1', actionPointsSpent: 2 };
       expect(SubmitActionMessageSchema.parse(valid)).toBeDefined();

       const invalid = { actionId: 123 };
       expect(() => SubmitActionMessageSchema.parse(invalid)).toThrow();
     });
   });
   \`\`\`

3. **Agent Tool Contracts:**
   \`\`\`typescript
   describe('Agent Tools', () => {
     test('submit_action tool schema validates', () => {
       const validCall = { actionId: 'act-1', reasoning: 'Test' };
       expect(submitActionTool.validate(validCall)).toBe(true);
     });
   });
   \`\`\`

4. **Config Contracts:**
   \`\`\`typescript
   describe('Firebase Config', () => {
     test('config matches TypeScript interface', () => {
       const config = fetchConfig();
       expect(config).toMatchSchema(GameConfigSchema);
     });
   });
   \`\`\`

**Files to Create:**
- \`__tests__/contracts/schemas.test.ts\`
- \`__tests__/contracts/messages.test.ts\`
- \`__tests__/contracts/agents.test.ts\`
- \`__tests__/contracts/config.test.ts\`

**Definition of Done:**
- [ ] All contract tests pass
- [ ] 100% coverage of interface definitions
- [ ] Tests run in CI/CD pipeline
- [ ] Breaking changes caught automatically" --json | jq -r '.id')

# CV.2 API Documentation Generation
ISSUE_CV_2=$(bd create "Generate API documentation from TypeScript types" \
  --type task \
  --priority 2 \
  --deps "$ISSUE_CV_1" \
  --description "Auto-generate documentation from contract definitions.

**Tools:**
- TypeDoc for TypeScript documentation
- JSON Schema docs for message contracts

**Generated Docs:**

1. **State Schema Reference:**
   - All @colyseus/schema classes
   - Field types and descriptions
   - Example JSON output

2. **Message Reference:**
   - All client ↔ server messages
   - Zod schemas rendered
   - Example payloads

3. **Agent Tools Reference:**
   - All agent tool definitions
   - Parameter schemas
   - Usage examples

4. **Config Reference:**
   - All Firebase Remote Config keys
   - Default values
   - When to change them

**Files to Create:**
- \`docs/api/schemas.md\`
- \`docs/api/messages.md\`
- \`docs/api/agents.md\`
- \`docs/api/config.md\`

**Definition of Done:**
- [ ] Documentation auto-generated from code
- [ ] All contracts documented
- [ ] Examples included
- [ ] Deployed to /docs route" --json | jq -r '.id')

echo -e "${GREEN}✅ Contract Validation tasks created${NC}\n"

# ============================================================================
# Create dependencies between phases
# ============================================================================

echo -e "${YELLOW}Setting up phase dependencies...${NC}"

# Phase 0 tasks are independent and can start immediately

# Phase 1 depends on Phase 0 contracts being defined
bd dep add "$ISSUE_1_1" "$ISSUE_0_1" --type blocks
bd dep add "$ISSUE_1_2" "$ISSUE_0_2" --type blocks
bd dep add "$ISSUE_1_3" "$ISSUE_1_2" --type blocks
bd dep add "$ISSUE_1_4" "$ISSUE_1_3" --type blocks

# Phase 2 depends on Phase 1 PoC working
bd dep add "$ISSUE_2_1" "$ISSUE_1_4" --type blocks
bd dep add "$ISSUE_2_1" "$ISSUE_0_5" --type blocks
bd dep add "$ISSUE_2_2" "$ISSUE_2_1" --type blocks
bd dep add "$ISSUE_2_3" "$ISSUE_2_2" --type blocks
bd dep add "$ISSUE_2_3" "$ISSUE_0_3" --type blocks
bd dep add "$ISSUE_2_3" "$ISSUE_0_4" --type blocks
bd dep add "$ISSUE_2_4" "$ISSUE_2_3" --type blocks
bd dep add "$ISSUE_2_5" "$ISSUE_2_4" --type blocks

# Phase 3 depends on Phase 2 core game working
bd dep add "$ISSUE_3_1" "$ISSUE_2_5" --type blocks
bd dep add "$ISSUE_3_2" "$ISSUE_3_1" --type blocks
bd dep add "$ISSUE_3_3" "$ISSUE_3_2" --type blocks

# Phase 4 depends on Phase 3 edge cases handled
bd dep add "$ISSUE_4_1" "$ISSUE_3_3" --type blocks
bd dep add "$ISSUE_4_2" "$ISSUE_4_1" --type blocks

# Phase 5 depends on Phase 4 admin tools ready
bd dep add "$ISSUE_5_1" "$ISSUE_4_2" --type blocks
bd dep add "$ISSUE_5_2" "$ISSUE_5_1" --type blocks
bd dep add "$ISSUE_5_3" "$ISSUE_5_2" --type blocks
bd dep add "$ISSUE_5_3" "$ISSUE_0_6" --type blocks

# Phase 6 depends on Phase 5 production deployment
bd dep add "$ISSUE_6_1" "$ISSUE_5_3" --type blocks
bd dep add "$ISSUE_6_2" "$ISSUE_6_1" --type blocks
bd dep add "$ISSUE_6_3" "$ISSUE_6_2" --type blocks

# Contract validation depends on contracts being defined
bd dep add "$ISSUE_CV_1" "$ISSUE_0_1" --type blocks
bd dep add "$ISSUE_CV_1" "$ISSUE_0_2" --type blocks
bd dep add "$ISSUE_CV_1" "$ISSUE_0_3" --type blocks
bd dep add "$ISSUE_CV_1" "$ISSUE_0_4" --type blocks
bd dep add "$ISSUE_CV_2" "$ISSUE_CV_1" --type blocks

echo -e "${GREEN}✅ Dependencies configured${NC}\n"

# ============================================================================
# Summary
# ============================================================================

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Colyseus Migration task breakdown complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}\n"

echo -e "📊 Created tasks:\n"
echo -e "  ${YELLOW}Phase 0: Contracts & Infrastructure (7 tasks)${NC}"
echo -e "  ${YELLOW}Phase 1: Proof of Concept (4 tasks)${NC}"
echo -e "  ${YELLOW}Phase 2: Core Game Loop (5 tasks)${NC}"
echo -e "  ${YELLOW}Phase 3: Multiplayer Edge Cases (3 tasks)${NC}"
echo -e "  ${YELLOW}Phase 4: Admin Dashboard (2 tasks)${NC}"
echo -e "  ${YELLOW}Phase 5: Production Deployment (3 tasks)${NC}"
echo -e "  ${YELLOW}Phase 6: Stress Testing (3 tasks)${NC}"
echo -e "  ${YELLOW}Contract Validation (2 tasks)${NC}\n"

echo -e "📋 Next steps:\n"
echo -e "  1. View ready work: ${GREEN}bd ready${NC}"
echo -e "  2. Show dependency tree: ${GREEN}bd dep tree $ISSUE_0_1${NC}"
echo -e "  3. Start with Phase 0 contracts: ${GREEN}bd show $ISSUE_0_1${NC}\n"

echo -e "${YELLOW}🎯 Contract-First Approach:${NC}"
echo -e "  All implementation tasks are blocked on contract definitions"
echo -e "  Start with Phase 0 to define all interfaces before coding\n"

echo -e "${GREEN}Happy building! 🚀${NC}\n"
