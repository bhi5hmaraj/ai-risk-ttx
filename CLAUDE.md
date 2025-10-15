# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Crisis Command** is an AI-powered tabletop exercise (TTX) simulation game built with React, TypeScript, and Vite. Players assume strategic roles during an AI-driven global crisis, making decisions that affect public trust and secret objectives. The game is driven by LLM API calls (via LiteLLM proxy) that act as a Game Master, generating dynamic scenarios, consequences, and AI opponent actions.

## Development Commands

### Setup
```bash
npm ci                    # Install dependencies (recommended)
npm install              # Install dependencies

# Database Setup (one-time, local development)
npm run db:setup         # Automated PostgreSQL setup + migrations

# Or manual Prisma setup
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run database migrations (requires DATABASE_URL)
```

### Development
```bash
npm run dev              # Start development server (Vercel CLI - for API routes)
npm run dev:vite         # Start with plain Vite (no API routes)
npm run build            # Production build
npm run preview          # Preview production build locally

# Database management
npm run db:studio        # Open Prisma Studio (database GUI)
npm run db:migrate       # Create new migration
npm run db:reset         # Reset database (⚠️ deletes all data)

# Analytics
npm run analyze          # Analyze feedback data
npm run analyze -- --help # Show all analytics options

# Testing
npm run test:api         # Test feedback API endpoint
```

### Pre-Commit Workflow
**IMPORTANT**: Before committing, use the helper script to ensure clean lockfiles and passing builds:

```bash
chmod +x ./git-push.sh
./git-push.sh                           # Prepare repo (regen lockfile, validate, build)
./git-push.sh -c "Your commit message"  # Auto-commit and push
```

This script:
- Validates Node >= 20
- Regenerates `package-lock.json` deterministically
- Validates install with `npm ci`
- Builds with safe env defaults
- Stages updated lockfile

## Environment Configuration

Required environment variables (set in `.env` or Vercel):

```bash
# LLM Configuration
VITE_LITELLM_API_KEY    # LiteLLM proxy API key (virtual/master key)
VITE_LLM_MODEL          # Model name (e.g., "gemini-2.5-flash", "gpt-4o-mini")

# Database (for feedback and public scenarios)
DATABASE_URL            # PostgreSQL connection string
                        # Local: "postgresql://user:pass@localhost:5432/dbname"
                        # Vercel: Automatically provided by Vercel Postgres
```

The LiteLLM base URL is hardcoded in `services/geminiService.ts:25` as `https://asgard.bhishmaraj.org`.

See `prisma/README.md` for detailed database setup instructions.

## Architecture

### Core Technologies
- **React 19** with hooks-based state management
- **TypeScript** (strict mode via tsconfig.json)
- **Vite** for build tooling
- **OpenAI SDK** for LLM calls (via LiteLLM proxy)
- **Zod** for schema validation and structured outputs
- **React Flow** for action tree visualization
- **Prisma** with PostgreSQL for data persistence (feedback, public scenarios)

### Project Structure

```
/
├── App.tsx                 # Main app component, phase-based routing
├── index.tsx              # React root
├── types.ts               # Core TypeScript types and enums
├── constants.tsx          # Game config and role definitions
├── prompts.ts             # LLM prompt templates and schemas
├── presets.ts             # Pre-built scenarios (e.g., AI_SAFETY_SCENARIO)
├── hooks/
│   └── useGameController.ts  # Central game state management hook
├── services/
│   ├── geminiService.ts      # LLM API calls with Zod validation
│   ├── gameHelpers.ts        # Game utility functions
│   ├── feedbackHelpers.ts    # Feedback system utilities
│   ├── feedbackService.ts    # Client-side feedback API calls
│   └── websocketService.ts   # WebSocket service (multiplayer prep)
├── lib/
│   └── prisma.ts            # Prisma client singleton
├── types/
│   └── feedback.ts          # Feedback type system with Zod schemas
├── prisma/
│   ├── schema.prisma        # Database schema (Feedback, PublicScenario, ScenarioVote)
│   └── README.md           # Database setup instructions
├── api/
│   ├── feedback.ts          # POST /api/feedback endpoint
│   ├── README.md           # API documentation
│   └── test-feedback.json  # Example payload for testing
├── components/
│   ├── Icons.tsx            # Heroicons components
│   └── game/                # Game-specific components
│       ├── ActionSelection.tsx
│       ├── ActionTreeModal.tsx
│       ├── ActionTreePortal.tsx
│       ├── EventLog.tsx
│       ├── GameStatusPanel.tsx
│       ├── RoleCard.tsx
│       └── RoundSnapshotCard.tsx
├── screens/
│   ├── LobbyScreen.tsx      # Role selection and scenario setup
│   ├── GameScreen.tsx       # Main gameplay screen
│   ├── EndScreen.tsx        # Game over screen
│   └── LoadingScreen.tsx    # Loading states
└── git-push.sh             # Pre-commit helper script
```

### State Management

**Current Implementation**: Hook-based with `useGameController.ts`

The game uses a centralized custom hook (`useGameController`) that manages all state via React's `useState` and `useEffect`. This hook returns:
- `state`: All game state (gameState, players, UI flags, etc.)
- `actions`: State setters and action handlers
- `derived`: Computed values (humanPlayer, etc.)

**Game Phase Flow**:
```
LOBBY → STARTING → ACTION → (CONSEQUENCE internal) → ACTION → ... → END
```

1. **LOBBY**: User selects role and scenario type (classic/custom/ai_safety)
2. **STARTING**: `generateInitialScenario` API call creates opening scenario
3. **ACTION**: Player selects actions from generated options, timer counts down
4. **CONSEQUENCE** (internal):
   - Generate AI player options in parallel
   - Generate AI player choices based on options
   - Calculate counterfactual (what happens if no one acts)
   - Call `generateConsequences` with all actions
   - Update scores, logs, advance round
5. **END**: Max rounds reached or public score ≤ 0

**Future Architecture**: The README.md documents a planned migration to Zustand for more predictable state management (see lines 49-103 in README.md).

### LLM Integration

All LLM calls go through `services/geminiService.ts`:

**Key Functions**:
- `generateInitialScenario()` - Creates opening scenario
- `generateActionOptions(player, gameState, previousActions)` - Generates 5 action options
- `generateAIPlayerActions(player, gameState, options)` - AI chooses actions from options
- `generateConsequences(gameState, players, counterfactualScoreChange)` - Resolves round
- `generateCounterfactualConsequences(gameState)` - Calculates inaction baseline
- `generateCustomScenario(description)` - Generates custom scenario setup

**Structured Outputs**:
All LLM responses use Zod schemas for validation via `zodResponseFormat`. If structured output fails, the service falls back to `json_object` mode with manual parsing.

**Parallel API Calls**:
During the consequence phase (`runConsequencePhase` in hooks/useGameController.ts:122), AI player action generation happens in parallel to minimize latency. The counterfactual call also runs in parallel.

### Serverless API

Backend API routes deployed as Vercel serverless functions:

**Endpoints**:
- `POST /api/feedback` - Submit user feedback (in `api/feedback.ts`)

**Architecture**:
- Vercel serverless functions for API routes
- Prisma for database access
- Zod for request validation
- Auto-connects to PostgreSQL via `DATABASE_URL`

**Local Testing**:
```bash
npm run dev  # Uses Vercel CLI to run serverless functions locally
```

**Why Vercel CLI for dev?**
The feedback API requires serverless functions which don't work with Vite's dev server. `npm run dev` now uses `vercel dev` which:
- Serves the Vite frontend
- Runs `/api` serverless functions locally
- Connects to local PostgreSQL via `DATABASE_URL`

If you need plain Vite without API routes, use `npm run dev:vite`.

See `api/README.md` for full API documentation.

### Key Game Mechanics

**Roles & Objectives**:
- 6 pre-defined roles (Election Commissioner, Tech CEO, Journalist, Federal Regulator, Campaign Manager, Cybersecurity Expert)
- Each has public objectives (visible) and hidden objectives (secret win conditions)
- Defined in `constants.tsx`

**Action System**:
- Each round, players have 3 action points (`GAME_CONFIG.ACTION_POINTS_PER_ROUND`)
- Actions have costs (1-3 points)
- Players select from 5 generated options
- AI players use a two-step process: first generate options, then choose based on hidden objective

**Scoring**:
- **Public Score** (Core Metric): Shared score representing "Democratic Legitimacy" (or scenario-specific metric)
- **Hidden Scores**: Personal scores tracking progress toward secret objectives
- Game ends when public score ≤ 0 or after 5 rounds (`GAME_CONFIG.MAX_ROUNDS`)

**Counterfactual Analysis**:
Each round includes "If no one acted..." note showing the baseline outcome for comparison.

**Action Tree Visualization**:
After each round, players can view a React Flow graph showing all players' available options and chosen actions.

## Important Implementation Details

### Type System

Core types in `types.ts`:
- `GamePhase` enum: LOBBY, STARTING, ACTION, CONSEQUENCE, END
- `GameState`: Current game state (phase, round, coreMetric, eventLog, currentEvent)
- `Player`: Player data (id, role, isHuman, hiddenScore, actions, hasSubmittedActions)
- `GameLogEntry`: Round history with full action tree and score changes
- `ActionOption`: Individual action (title, description, cost)

### Prompt Engineering

All prompts are in `prompts.ts` with corresponding schemas. Each prompt:
- Clearly defines the AI's role as "Game Master"
- Provides structured context (round, score, crisis, player actions)
- Specifies exact JSON schema requirements
- Uses timeline-based storytelling (3-5 chronological beats per round)

### Error Handling

- LLM call failures return `null` and set error state
- User sees error message with option to return to lobby
- Console logs detail failure points
- Counterfactual is calculated in parallel; if it fails, simulation cannot continue

### Timer & Pause

- 5-minute timer per ACTION phase (`GAME_CONFIG.ACTION_PHASE_SECONDS`)
- Timer can be paused/resumed
- Auto-submits empty action array when timer expires
- Timer resets after each round

### Scenario Types

1. **Classic**: Default election crisis scenario, AI-generated opening
2. **AI Safety**: Pre-built scenario from `presets.ts` (AI_SAFETY_SCENARIO)
3. **Custom**: User provides description, `generateCustomScenario` creates full setup

## Deployment (Vercel)

Recommended Vercel settings:
- **Install Command**: `npm ci`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: `20.x`

Required environment variables:
- `VITE_LITELLM_API_KEY`
- `VITE_LLM_MODEL`
- `DATABASE_URL` (automatically provided by Vercel Postgres)

**Database Setup on Vercel:**
1. Add Vercel Postgres storage to your project
2. `DATABASE_URL` will be automatically injected
3. Run migrations via Vercel build: Add `"postinstall": "prisma generate"` to package.json

## Code Style & Patterns

- Prefer functional components with hooks
- Use `useCallback` for action handlers to prevent re-renders
- Use `useMemo` for derived state
- State updates are batched where possible
- API calls tracked via `geminiCallsThisRoundRef` for telemetry
- All player actions stored in `GameLogEntry` for full action tree reconstruction
We track work in Beads instead of Markdown. Run `bd quickstart` to see how.
