## AI Agents Architecture (OpenAI Agents SDK)

### Overview

**MVP Decision:** All AI agents run **in-process with Colyseus** using OpenAI Agents SDK (TypeScript).

**Key Design Decision:** TypeScript-only for MVP
- ✅ Fast to ship (4-week deadline)
- ✅ No language bridges needed
- ✅ Direct function calls (no HTTP/WebSocket translation)
- ✅ Official OpenAI SDK (well-maintained, production-ready)
- ✅ Can migrate to Python Matrix post-event if needed

**Post-MVP Option:** Add Python Matrix server for heavy simulations (NetLogo, Mesa) via MCP protocol.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Next.js Custom Server (TypeScript/Node.js)              │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ HTTP Handler (Next.js)                              │ │
│ │  - Serves frontend pages (/lobby, /game/[code])    │ │
│ │  - API routes (/api/feedback, /api/scenarios)      │ │
│ │  - Static assets                                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ WebSocket Handler (Colyseus)                        │ │
│ │                                                     │ │
│ │  ┌──────────────────────────────────────────────┐  │ │
│ │  │ GameRoom (State Management)                  │  │ │
│ │  │  - Human players (WebSocket connections)     │  │ │
│ │  │  - AI players (visible in state)             │  │ │
│ │  │  - Game state synchronization                │  │ │
│ │  └────────────┬─────────────────────────────────┘  │ │
│ │               │                                     │ │
│ │               │ Direct function calls               │ │
│ │               ▼                                     │ │
│ │  ┌──────────────────────────────────────────────┐  │ │
│ │  │ OpenAI Agents SDK                            │  │ │
│ │  │                                              │  │ │
│ │  │  Agent Bob = new Agent({                    │  │ │
│ │  │    name: "Regulator",                       │  │ │
│ │  │    model: "gemini/gemini-2.0-flash-exp",   │  │ │
│ │  │    client: litellmProxy,                    │  │ │
│ │  │    tools: [send_message, submit_action]     │  │ │
│ │  │  })                                         │  │ │
│ │  │                                              │  │ │
│ │  │  Agent Eve = new Agent({ ... })             │  │ │
│ │  │                                              │  │ │
│ │  │  Conversation history in memory             │  │ │
│ │  └──────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Firebase Admin SDK                                  │ │
│ │  - Remote Config (prompts, game params, AI config) │ │
│ └─────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ LiteLLM Proxy
                     ▼
          ┌──────────────────────┐
          │ asgard.bhishmaraj.org│
          │ (LiteLLM Proxy)      │
          │  → Gemini 2.0 Flash  │
          └──────────────────────┘
```

**Everything in ONE TypeScript process**

### Agent Lifecycle

**Agent instances persist for entire game duration:**

1. **Created in `GameRoom.onCreate()`** - One agent per AI player
2. **Conversation history maintained in memory** - Agent SDK handles this automatically
3. **Remembers all past rounds** - Actions, messages, outcomes
4. **Destroyed in `GameRoom.onDispose()`** - Memory freed when game ends

**Key principle:** Each game gets fresh agent instances with clean history.

### LiteLLM Integration

**Gemini via LiteLLM Proxy:**

```typescript
import OpenAI from 'openai';

const litellm = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY,
  baseURL: 'https://asgard.bhishmaraj.org',
});

const agent = new Agent({
  model: 'gemini/gemini-2.0-flash-exp',  // LiteLLM model format
  client: litellm,                        // Point to proxy
  // Agent SDK sends chat completions to LiteLLM
  // LiteLLM routes to Gemini
  // Cost-effective + works with existing infrastructure
});
```

**Local Conversation State:**
- Agent SDK maintains messages array internally
- Full history sent to LiteLLM on each turn
- Gemini sees: system prompt → user messages → assistant responses → tool calls
- No server-side state needed (conversations are short ~30 mins)

### Database Schema

```prisma
// prisma/schema.prisma

model GameSnapshot {
  id            String   @id @default(cuid())
  gameId        String
  round         Int
  timestamp     DateTime @default(now())

  // Full state at this moment
  gameState     Json
  events        Json

  // Config snapshot from Firebase
  configSnapshot Json  // Which Firebase config was active

  // Performance metrics
  aiLatency     Int?
  errorCount    Int      @default(0)

  game          Game     @relation(fields: [gameId], references: [id])

  @@index([gameId, round])
  @@index([timestamp])
}
```

### Implementation

**File: `server/index.ts` (Express‑first: Colyseus + Next handler)**

```typescript
import { createServer } from 'http';
import express from 'express';
import next from 'next';
import cors from 'cors';
import { Server as ColyseusServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import adminRoutes from './routes/admin';
import { GameRoom } from './game-server/rooms/GameRoom';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);

async function main() {
  const nextApp = next({ dev });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const app = express();
  app.set('trust proxy', true);
  app.use(cors({ origin: [/\.vercel\.app$/, 'https://simulacra.cc'], credentials: true }));
  app.use(express.json());

  app.get('/healthz', (_req, res) => res.send('ok'));
  app.use('/colyseus-admin', adminRoutes); // avoid clash with Next Admin UI at /admin

  const httpServer = createServer(app);

  const gameServer = new ColyseusServer({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  gameServer.define('game', GameRoom);

  app.all('*', (req, res) => handle(req, res));
  httpServer.listen(port, () => {
    console.log(`> Express + Colyseus + Next ready on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**File: `game-server/agents/AgentManager.ts`**

```typescript
import { Agent } from '@openai/agents';
import OpenAI from 'openai';
import admin from 'firebase-admin';

export class AgentManager {
  private openai: OpenAI;
  private agents: Map<string, Agent> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.LITELLM_API_KEY!,
      baseURL: 'https://asgard.bhishmaraj.org',
    });
  }

  async initializeAgent(
    agentId: string,
    role: string,
    config: Record<string, any>
  ): Promise<Agent> {
    const agent = new Agent({
      name: `${agentId} (${role})`,
      instructions: config[`prompt_agent_${role}`] || 'You are an AI agent...',
      model: config.ai_model || 'gemini/gemini-2.0-flash-exp',
      client: this.openai,
      temperature: config.ai_temperature || 0.7,
      tools: [
        {
          type: 'function',
          function: {
            name: 'send_message',
            description: 'Send a message to another player',
            parameters: {
              type: 'object',
              properties: {
                targetPlayerId: { type: 'string' },
                content: { type: 'string' },
                intent: {
                  type: 'string',
                  enum: ['inform', 'request', 'negotiate', 'threaten']
                },
              },
              required: ['targetPlayerId', 'content'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'submit_action',
            description: 'Submit your chosen action for this round',
            parameters: {
              type: 'object',
              properties: {
                actionId: { type: 'string' },
                reasoning: { type: 'string' },
              },
              required: ['actionId'],
            },
          },
        },
      ],
    });

    this.agents.set(agentId, agent);
    return agent;
  }

  async runAgent(agentId: string, context: any): Promise<any> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    return await agent.run({
      messages: [{
        role: 'user',
        content: this.buildContextMessage(context),
      }],
    });
  }

  private buildContextMessage(context: any): string {
    return `
Round ${context.round} Update:
Crisis: ${context.currentCrisis}
Public Score: ${context.publicScore}

Available Actions:
${context.availableActions.map((a: any, i: number) =>
  `${i + 1}. ${a.title} (${a.cost} points)`
).join('\n')}

What action do you want to take?
    `.trim();
  }
}
```

**File: `game-server/rooms/GameRoom.ts`**

```typescript
import { Room, Client } from '@colyseus/core';
import { GameState, Player } from './schema/GameState';
import { AgentManager } from '../agents/AgentManager';
import admin from 'firebase-admin';

export class GameRoom extends Room<GameState> {
  private agentManager: AgentManager;
  private config: Record<string, any> = {};

  async onCreate(options: { scenario: string }) {
    this.setState(new GameState());

    // Fetch Firebase Remote Config
    const template = await admin.remoteConfig().getServerTemplate();
    this.config = this.extractConfig(template);

    // Initialize AI agent manager
    this.agentManager = new AgentManager();

    // Add AI agent players (visible in state)
    this.state.players.push(new Player('agent_bob', 'Bob', 'ai_agent', 'regulator'));
    this.state.players.push(new Player('agent_eve', 'Eve', 'ai_agent', 'tech_ceo'));

    // Initialize agents
    await this.agentManager.initializeAgent('agent_bob', 'regulator', this.config);
    await this.agentManager.initializeAgent('agent_eve', 'tech_ceo', this.config);
  }

  async advanceRound() {
    this.state.round++;
    this.state.phase = 'ACTION';

    // Trigger AI agent deliberation (runs in parallel)
    await this.triggerAgentDeliberation();
  }

  private async triggerAgentDeliberation() {
    const context = {
      round: this.state.round,
      publicScore: this.state.publicScore,
      currentCrisis: this.state.currentEvent.description,
      availableActions: this.state.currentActionOptions,
    };

    // Run all agents in parallel
    const agentIds = ['agent_bob', 'agent_eve'];
    await Promise.all(
      agentIds.map(id => this.agentManager.runAgent(id, context))
    );
  }

  // Agent tool calls handled here
  async handleAgentToolCall(agentId: string, toolName: string, args: any) {
    if (toolName === 'send_message') {
      await this.handleAgentMessage(agentId, args);
    } else if (toolName === 'submit_action') {
      await this.handleAgentActionSubmit(agentId, args);
    }
  }

  private async handleAgentMessage(agentId: string, args: any) {
    const { targetPlayerId, content } = args;

    // Find target player's WebSocket connection
    const targetClient = this.clients.find(c => {
      const player = this.state.players.find(p => p.sessionId === c.sessionId);
      return player?.id === targetPlayerId;
    });

    // Send message via WebSocket
    targetClient?.send('agent_message', {
      from: agentId,
      content,
    });
  }

  private async handleAgentActionSubmit(agentId: string, args: any) {
    const { actionId } = args;
    const agent = this.state.players.find(p => p.id === agentId);

    agent.selectedActionId = actionId;
    agent.hasSubmittedAction = true;

    // Check if all players submitted
    if (this.allPlayersSubmitted()) {
      await this.processRound();
    }
  }

  private extractConfig(template: any): Record<string, any> {
    const config: Record<string, any> = {};
    for (const [key, param] of Object.entries(template.parameters)) {
      config[key] = (param as any).defaultValue?.value || '';
    }
    return config;
  }
}
```

**File: `package.json`**

```json
{
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "next build",
    "start": "NODE_ENV=production tsx server/index.ts"
  },
  "dependencies": {
    "next": "^14.0.0",
    "@colyseus/core": "^0.15.0",
    "@colyseus/ws-transport": "^0.15.0",
    "@openai/agents": "^0.1.0",
    "openai": "^4.0.0",
    "firebase-admin": "^12.0.0"
  }
}
```

### Event Day Workflow (Firebase)

**Scenario: AI is too pessimistic in Round 3**

1. **Open** Firebase Console (`console.firebase.google.com`)
2. **Navigate** to Remote Config → Server template
3. **Edit** `prompt_consequence` parameter
4. **Change value:**
   ```
   Old: "Describe realistic consequences..."
   New: "Describe consequences with cautious optimism..."
   ```
5. **Publish changes** (creates new version)
6. **New games** pick up change immediately
7. **Active games** continue with their snapshot

**Benefits:**
- ✅ Takes 30 seconds
- ✅ No code deploy
- ✅ 300 version history
- ✅ One-click rollback
- ✅ Completely free

---

## MCP Protocol Integration (Future Extensibility)

### Overview

**MCP (Model Context Protocol)** is a standard protocol for connecting AI agents to external tools and services. This enables future migration to Python-based simulations without rewriting the entire agent system.

**Current State (MVP):** TypeScript-only agents with direct function calls

**Post-Event Option:** Add Python tools via MCP for advanced simulations (NetLogo, Mesa, ABM frameworks)

### Why MCP?

**Problem:** Want to use Python simulation libraries (NetLogo via pyNetLogo, Mesa ABM, etc.) but agents are in TypeScript

**Traditional Solution:** Build HTTP API bridge, maintain OpenAPI contracts, handle serialization

**MCP Solution:** Standard protocol for tool calling across languages

**Benefits:**
- ✅ **No HTTP bridge needed** - MCP handles communication
- ✅ **Standard protocol** - Works with any MCP-compatible tool
- ✅ **Type safety** - JSON Schema for all tool inputs/outputs
- ✅ **Minimal agent code changes** - Just add MCP client, same Agent SDK API
- ✅ **Future-proof** - Can add more tools (databases, APIs, etc.) later

### Architecture with MCP

```
┌─────────────────────────────────────────────────────────────┐
│ Next.js Custom Server (TypeScript)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ GameRoom + OpenAI Agents SDK                           │ │
│  │                                                        │ │
│  │  Agent Bob = new Agent({                              │ │
│  │    tools: [                                           │ │
│  │      { type: 'function', function: send_message },    │ │
│  │      { type: 'function', function: submit_action },   │ │
│  │      { type: 'mcp', server: 'simulation' }  ← NEW!    │ │
│  │    ]                                                  │ │
│  │  })                                                   │ │
│  └───────────────────────┬────────────────────────────────┘ │
│                          │                                   │
│                          │ MCP Protocol (stdio/HTTP)         │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ MCP Client (TypeScript)                                │ │
│  │  - Connects to MCP servers                             │ │
│  │  - Translates tool calls to MCP requests               │ │
│  │  - Handles results back to agent                       │ │
│  └───────────────────────┬────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ MCP Protocol
                           ▼
        ┌──────────────────────────────────────┐
        │ MCP Server (Python subprocess)       │
        │                                      │
        │  @mcp.tool()                         │
        │  def run_netlogo_simulation(params): │
        │    nl = pyNetLogo.NetLogoLink()     │
        │    nl.load_model('ai-spread.nlogo') │
        │    results = nl.run(params)         │
        │    return results                   │
        │                                      │
        │  @mcp.tool()                         │
        │  def run_mesa_model(scenario):       │
        │    model = SocialMediaModel()       │
        │    model.run(scenario)              │
        │    return model.datacollector.get()  │
        └──────────────────────────────────────┘
```

### Implementation Example

**Step 1: Create Python MCP Server**

```python
# tools/mcp_simulation_server.py
import mcp
from pynetlogo import NetLogoLink
from mesa import Model, Agent

server = mcp.Server("simulation-tools")

@server.tool(
    name="simulate_ai_spread",
    description="Run NetLogo simulation of AI misinformation spread",
    input_schema={
        "type": "object",
        "properties": {
            "initial_infected": {"type": "number"},
            "network_density": {"type": "number"},
            "intervention": {"type": "string"}
        },
        "required": ["initial_infected", "network_density"]
    }
)
def simulate_ai_spread(initial_infected: int, network_density: float, intervention: str = None):
    """Run NetLogo ABM simulation"""
    nl = NetLogoLink(gui=False)
    nl.load_model('models/ai-misinformation.nlogo')

    nl.command(f'set initial-infected {initial_infected}')
    nl.command(f'set network-density {network_density}')
    if intervention:
        nl.command(f'set intervention "{intervention}"')

    nl.command('setup')
    nl.command('repeat 100 [ go ]')

    results = {
        'infected_count': nl.report('count turtles with [infected?]'),
        'average_belief': nl.report('mean [belief-level] of turtles'),
        'intervention_effectiveness': nl.report('intervention-effectiveness')
    }

    nl.kill_workspace()
    return results

if __name__ == '__main__':
    server.run()
```

**Step 2: Add MCP Client to Agent**

```typescript
// game-server/agents/AgentManager.ts
import { MCPClient } from '@openai/agents/mcp';

export class AgentManager {
  private mcpClient: MCPClient;

  async initialize() {
    // Start Python MCP server as subprocess
    this.mcpClient = new MCPClient({
      command: 'python',
      args: ['tools/mcp_simulation_server.py'],
      transport: 'stdio', // Communicate via stdin/stdout
    });

    await this.mcpClient.connect();
  }

  async initializeAgent(agentId: string, role: string) {
    const agent = new Agent({
      name: `${agentId} (${role})`,
      model: 'gemini/gemini-2.0-flash-exp',
      client: this.openai,
      tools: [
        // Standard TypeScript tools
        { type: 'function', function: { name: 'send_message', ... } },
        { type: 'function', function: { name: 'submit_action', ... } },

        // MCP tools (auto-discovered from server)
        ...(await this.mcpClient.listTools()).map(tool => ({
          type: 'mcp',
          server: 'simulation',
          tool: tool.name,
        })),
      ],
    });

    return agent;
  }
}
```

**Step 3: Agent Can Now Call Python Tools**

```typescript
// Agent's reasoning during game:
// "I need to estimate the impact of deepfake regulation..."

const result = await agent.run({
  messages: [
    {
      role: 'user',
      content: 'Estimate the impact of mandatory watermarking on AI-generated content spread'
    }
  ]
});

// Agent internally decides to call simulate_ai_spread tool:
// {
//   tool_call: {
//     name: 'simulate_ai_spread',
//     arguments: {
//       initial_infected: 100,
//       network_density: 0.3,
//       intervention: 'mandatory-watermarking'
//     }
//   }
// }

// MCP client routes to Python server, returns:
// {
//   infected_count: 234,
//   average_belief: 0.45,
//   intervention_effectiveness: 0.67
// }

// Agent incorporates result into decision:
// "Based on simulation, mandatory watermarking reduces spread by 33%..."
```

### When to Add MCP

**NOT for MVP (Weeks 1-4):**
- Adds complexity
- Need to test Python tooling integration
- Event can succeed with TypeScript-only agents

**Post-Event (Week 5+) if:**
- ✅ Want more sophisticated simulation models
- ✅ Need to leverage existing Python ABM frameworks
- ✅ Want to add tools like database queries, external APIs
- ✅ Planning multi-agent research experiments

### Migration Path

**Current (MVP):**
```typescript
// All logic in TypeScript
const consequences = await calculateConsequences(action, gameState);
```

**With MCP (Post-Event):**
```typescript
// Delegate to Python simulation when needed
const agent = new Agent({
  tools: [
    { type: 'function', function: 'submit_action' },
    { type: 'mcp', server: 'simulation', tool: 'run_abm_model' },
  ]
});

// Agent decides which tool to use based on context
const result = await agent.run({
  messages: [{
    role: 'user',
    content: 'Analyze the systemic risk of this regulatory action...'
  }]
});
// Agent might call TypeScript tool OR Python simulation
```

**Key Insight:** MCP allows incremental migration - add Python tools one at a time, agents automatically learn to use them.

### Cost-Benefit Analysis

**Costs:**
- 2-3 days engineering work (MCP setup + Python server)
- Subprocess management (start/stop Python server)
- Additional debugging complexity (two languages)

**Benefits:**
- Access to entire Python ecosystem (NetLogo, Mesa, NetworkX, SciPy)
- Can reuse existing research code
- Agents can call sophisticated simulations on-demand
- Future-proof architecture for advanced features

**Decision:** Skip for MVP, revisit post-event if simulation quality becomes priority.

---

