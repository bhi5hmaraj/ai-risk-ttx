# Simulacra - AI Tabletop Exercise

A web-based crisis simulation game where you role-play as a key decision-maker during an AI-driven global emergency. Make strategic choices that affect public trust and your secret objectives while an AI Game Master generates dynamic scenarios and consequences.

Named after Jean Baudrillard's concept of *simulacra*—simulations that become more "real" than reality itself—this game explores hyperreality through AI-generated crises where synthetic and human decision-makers interact in emergent narratives.

## What is a Tabletop Exercise (TTX)?

A **Tabletop Exercise (TTX)** is a simulated crisis where participants role-play decision-makers to test strategic thinking and understand how systems respond under pressure. This AI-powered version generates unique scenarios each playthrough, with AI-controlled opponents making their own strategic choices.

## Features

**Core Gameplay:**
- **Multiple Scenario Types** - Choose from Classic (election crisis), AI Safety, community-submitted scenarios, or create your own custom crisis
- **Role-Playing** - Each scenario defines 6 unique roles with public and hidden objectives (e.g., Election Commissioner, Tech CEO, Journalist for election crisis)
- **Dynamic AI Generation** - LLM generates unique opening crisis and evolving events based on your chosen scenario
- **Strategic Action System** - Limited action points per round force tough prioritization decisions
- **AI Opponents** - Five AI players using a two-step decision process (generate options, then choose based on secret goals)
- **Action Tree Visualization** - React Flow graphs showing all players' available options and final choices
- **Counterfactual Analysis** - Compare actual outcomes against "if no one acted" baseline

**Community & Feedback:**
- **Scenario Library** - Browse and play community-submitted custom scenarios
- **Scenario Submission** - Share your custom scenarios with the community (with "Make Public" button in-game)
- **Upvoting System** - Vote for your favorite scenarios (uses anonymous fingerprinting to prevent duplicate votes)
- **Feedback Collection** - Submit feedback after playing to help improve the game

**Tech Stack:**
- React 19 + TypeScript + Vite
- OpenAI SDK for LLM calls (via LiteLLM proxy)
- Zod for schema validation and structured outputs
- React Flow for action tree visualization
- Prisma + PostgreSQL for data persistence
- Vercel serverless functions for API routes

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (for local development)
- LiteLLM API key (or compatible LLM provider)

### Setup

1. **Install dependencies:**
   ```bash
   npm ci
   ```

2. **Set up database:**
   ```bash
   npm run db:setup
   ```

3. **Configure environment** (`.env`):
   ```bash
   DATABASE_URL="postgresql://yourusername@localhost:5432/ttx-prisma-postgres-local?schema=public"
   VITE_LITELLM_API_KEY="your-api-key"
   VITE_LLM_MODEL="gpt-4o-mini"
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

### Available Commands

```bash
npm run dev              # Start Vercel dev server
npm run build            # Production build
npm run db:studio        # Open Prisma Studio
npm run test:api         # Test feedback API
```

---

## Admin Tools

### Environment Setup

Admin scripts support multiple environments via environment-specific `.env` files:

```bash
.env                          # Local development database
.env.development.preview      # Preview/staging database
.env.production               # Production database
```

**Required environment variables for remote databases:**
- `PRISMA_DATABASE_URL` - Prisma Accelerate connection URL (for preview/production)
- `DATABASE_URL` - Direct PostgreSQL connection (for local)

### Scenario Moderation

Manage community-submitted scenarios:

```bash
# List scenarios (defaults to pending)
npm run scenarios

# Query different environments
npm run scenarios -- --env preview
npm run scenarios -- --env production

# Filter by status
npm run scenarios -- --status pending
npm run scenarios -- --status approved
npm run scenarios -- --status rejected

# View detailed scenario info
npm run scenarios -- --view <scenario-id>

# Approve a scenario
npm run scenarios -- --approve <scenario-id>

# Reject with reason
npm run scenarios -- --reject <scenario-id> "reason text"

# Show help
npm run scenarios -- --help
```

### Feedback Analysis

Analyze user feedback with powerful filtering:

```bash
# View all feedback (local database)
npm run analyze

# Query remote environments
npm run analyze -- --env preview
npm run analyze -- --env production

# Filter options
npm run analyze -- --model gpt-4o-mini           # Filter by LLM model
npm run analyze -- --scenario classic            # Filter by scenario type
npm run analyze -- --completed true              # Only completed games
npm run analyze -- --from 2025-01-01            # Date range
npm run analyze -- --to 2025-12-31
npm run analyze -- --limit 50                    # Limit results

# Statistics only (no individual entries)
npm run analyze -- --stats

# Export data
npm run analyze -- --export feedback.csv         # Export to CSV
npm run analyze -- --export feedback.json        # Export to JSON

# Combine filters (preview environment example)
npm run analyze -- --env preview --model gpt-4o-mini --scenario ai_safety --stats

# Show help
npm run analyze -- --help
```

---

## Deployment

### Live Deployments

- **Production:** [https://ai-risk-ttx.vercel.app](https://ai-risk-ttx.vercel.app)
- **Preview Branch:** [https://ai-risk-ttx-git-preview-bhi5hmarajs-projects.vercel.app](https://ai-risk-ttx-git-preview-bhi5hmarajs-projects.vercel.app)
- **Vercel Dashboard:** [View all deployments](https://vercel.com/bhi5hmarajs-projects/ai-risk-ttx/deployments)

### Vercel Configuration

**Build Settings:**
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js Version: `20.x`

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `VITE_LITELLM_API_KEY` - LiteLLM proxy API key
- `VITE_LLM_MODEL` - Model name (e.g., `gemini-2.5-flash`, `gpt-4o-mini`)

---

## Project Status & Issue Tracking

We use [Beads](https://github.com/steveyegge/beads) for dependency-aware issue tracking.

<!-- BEADS_STATS_START -->

## Beads Issue Statistics

**Total Issues:** 61


### By Status
- closed: 38
- in_progress: 1
- open: 22

### By Priority
- P0: 10
- P1: 26
- P2: 25

### By Type
- unknown: 61

<!-- BEADS_STATS_END -->

<!-- BEADS_READY_START -->

## Ready to Work

Issues with no blocking dependencies:

- 📋 **ai-risk-ttx-15** (P1): Migrate from SPA to proper routing/pages (React Router)
- 📋 **ai-risk-ttx-32** (P1): Update useGameController to call API routes
- 📋 **ai-risk-ttx-57** (P1): Add backend analytics tracking for LLM usage and game metrics
- 📋 **ai-risk-ttx-58** (P1): Improve action tree visualization and design
- 📋 **ai-risk-ttx-61** (P1): Add game save/load and role switching feature
- 📋 **ai-risk-ttx-44** (P2): Add React Router and convert to page-based architecture
- 📋 **ai-risk-ttx-55** (P2): Design unified scenario/prompt tracking database schema
- 📋 **ai-risk-ttx-56** (P2): Implement time-travel/rewind feature to replay rounds with different actions
- 📋 **ai-risk-ttx-8** (P2): Implement prompt versioning and storage system

<!-- BEADS_READY_END -->

<!-- BEADS_ISSUES_START -->

### Open Issues Dependency Graph

```mermaid
graph TD;
    ai-risk-ttx-15["📋 ai-risk-ttx-15<br/>Migrate from SPA to proper routing/pa...<br/>P1"]
    style ai-risk-ttx-15 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-32["📋 ai-risk-ttx-32<br/>Update useGameController to call API ...<br/>P1"]
    style ai-risk-ttx-32 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-33["📋 ai-risk-ttx-33<br/>Remove VITE_LITELLM_API_KEY from client<br/>P1"]
    style ai-risk-ttx-33 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-44["📋 ai-risk-ttx-44<br/>Add React Router and convert to page-...<br/>P2"]
    style ai-risk-ttx-44 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-45["📋 ai-risk-ttx-45<br/>Install and configure React Router<br/>P2"]
    style ai-risk-ttx-45 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-46["📋 ai-risk-ttx-46<br/>Create pages/ directory and move screens<br/>P2"]
    style ai-risk-ttx-46 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-47["📋 ai-risk-ttx-47<br/>Create route layout with Navigation c...<br/>P2"]
    style ai-risk-ttx-47 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-48["📋 ai-risk-ttx-48<br/>Implement HomePage with lobby functio...<br/>P2"]
    style ai-risk-ttx-48 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-49["📋 ai-risk-ttx-49<br/>Implement GamePage with route guards<br/>P2"]
    style ai-risk-ttx-49 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-50["📋 ai-risk-ttx-50<br/>Implement EndGamePage and navigation ...<br/>P2"]
    style ai-risk-ttx-50 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-51["📋 ai-risk-ttx-51<br/>Update Navigation component for routing<br/>P2"]
    style ai-risk-ttx-51 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-52["📋 ai-risk-ttx-52<br/>Update useGameController for router n...<br/>P2"]
    style ai-risk-ttx-52 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-53["📋 ai-risk-ttx-53<br/>Add 404 page and error boundaries<br/>P2"]
    style ai-risk-ttx-53 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-54["📋 ai-risk-ttx-54<br/>Test routing and game flow end-to-end<br/>P2"]
    style ai-risk-ttx-54 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-55["📋 ai-risk-ttx-55<br/>Design unified scenario/prompt tracki...<br/>P2"]
    style ai-risk-ttx-55 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-56["📋 ai-risk-ttx-56<br/>Implement time-travel/rewind feature ...<br/>P2"]
    style ai-risk-ttx-56 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-57["📋 ai-risk-ttx-57<br/>Add backend analytics tracking for LL...<br/>P1"]
    style ai-risk-ttx-57 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-58["📋 ai-risk-ttx-58<br/>Improve action tree visualization and...<br/>P1"]
    style ai-risk-ttx-58 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-59["📋 ai-risk-ttx-59<br/>Clean up project structure and remove...<br/>P1"]
    style ai-risk-ttx-59 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-60["📋 ai-risk-ttx-60<br/>Migrate from Vite to Next.js for Dock...<br/>P1"]
    style ai-risk-ttx-60 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-61["📋 ai-risk-ttx-61<br/>Add game save/load and role switching...<br/>P1"]
    style ai-risk-ttx-61 fill:#fff3cd,stroke:#856404,stroke-width:2px
    ai-risk-ttx-8["📋 ai-risk-ttx-8<br/>Implement prompt versioning and stora...<br/>P2"]
    style ai-risk-ttx-8 fill:#fff3cd,stroke:#856404,stroke-width:2px

    ai-risk-ttx-54 --> ai-risk-ttx-52
    ai-risk-ttx-54 --> ai-risk-ttx-53
    ai-risk-ttx-49 --> ai-risk-ttx-47
    ai-risk-ttx-52 --> ai-risk-ttx-51
    ai-risk-ttx-45 --> ai-risk-ttx-44
    ai-risk-ttx-50 --> ai-risk-ttx-47
    ai-risk-ttx-46 --> ai-risk-ttx-44
    ai-risk-ttx-51 --> ai-risk-ttx-47
    ai-risk-ttx-51 --> ai-risk-ttx-48
    ai-risk-ttx-51 --> ai-risk-ttx-49
    ai-risk-ttx-51 --> ai-risk-ttx-50
    ai-risk-ttx-33 --> ai-risk-ttx-32
    ai-risk-ttx-53 --> ai-risk-ttx-45
    ai-risk-ttx-48 --> ai-risk-ttx-47
    ai-risk-ttx-47 --> ai-risk-ttx-45
    ai-risk-ttx-47 --> ai-risk-ttx-46
```

<!-- BEADS_ISSUES_END -->

**Note:** These sections are auto-updated by the pre-commit hook via `scripts/update_readme.py`.
