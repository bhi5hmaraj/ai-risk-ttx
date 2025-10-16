# Building Simulacra: An AI-Powered Crisis Simulation Game

**Where Hyperreality Meets Strategic Decision-Making**

---

## Introduction: Simulations That Become Reality

In 1981, French philosopher Jean Baudrillard introduced the concept of *simulacra*—copies without originals, simulations that become more "real" than reality itself. In his theory of hyperreality, the boundaries between simulation and reality collapse completely.

**Simulacra** embodies this concept as an AI-powered tabletop exercise (TTX) where synthetic decision-makers interact with human players in emergent crisis narratives. What starts as a simulation quickly becomes its own authentic reality—a hyperreal space for exploring high-stakes strategic decision-making.

## What is a Tabletop Exercise?

A **Tabletop Exercise (TTX)** is a simulated crisis scenario where participants role-play as key decision-makers. Used extensively in government, military, and corporate settings, TTXs test strategic thinking, reveal system vulnerabilities, and prepare leaders for real-world emergencies.

Simulacra transforms the traditional TTX into an interactive single-player experience where:
- An **AI Game Master** generates unique crisis scenarios and evolving events
- **Five AI opponents** make their own strategic choices with hidden agendas
- **Every playthrough is different**, adapting to your decisions in real-time
- **Counterfactual analysis** reveals what would have happened if no one acted

## Gameplay: Strategic Decisions Under Pressure

### Choose Your Role

Each scenario features **six unique roles** with both public and hidden objectives:

**Example roles from the election crisis scenario:**
- **Election Commissioner** - Maintain electoral integrity while managing public perception
- **Tech CEO** - Balance platform responsibility with business interests
- **Federal Regulator** - Navigate political pressure and enforcement duties
- **Journalist** - Expose truth while maintaining credibility
- **Campaign Manager** - Win the election by any means necessary
- **Cybersecurity Expert** - Contain threats while avoiding panic

Each role has **public objectives** (visible to all) and **secret objectives** (your hidden win conditions), creating tension between collective good and personal gain.

### The Action System

Every round, you face **limited action points** (typically 3) forcing tough prioritization:

1. **AI generates 5 action options** tailored to your role and the crisis
2. **You select actions** costing 1-3 points each
3. **AI opponents choose their actions** based on their own secret objectives
4. **Consequences unfold** in a dynamic timeline narrative
5. **Scores update** - both the public "Core Metric" and your hidden score

The game ends when the public score drops to zero (crisis failure) or after 5 rounds.

### Action Tree Visualization

After each round, explore the **interactive action tree** using React Flow:
- See all available options for every player
- Understand what choices the AI opponents considered
- Trace the path from options to final decisions
- Analyze the strategic landscape of the round

### Counterfactual Analysis

Each round concludes with **"If no one acted..."** analysis:
- Compare actual outcomes against the inaction baseline
- Understand whether interventions helped or hurt
- Learn how the crisis would have naturally evolved
- Calibrate your intuition for future rounds

## Multiple Scenario Types

Simulacra offers diverse crisis simulations:

### 1. Classic (Election Crisis)
AI-generated scenarios around election integrity, misinformation, and platform governance. Every playthrough creates a unique opening crisis.

### 2. AI Safety
A pre-built scenario exploring AGI deployment, AI alignment failures, and existential risk governance. Navigate technical, political, and ethical dimensions of transformative AI.

### 3. Community Scenarios
Browse and play scenarios created by other players. Upvote your favorites and discover creative crisis simulations from the community.

### 4. Custom Scenarios
Provide a crisis description, and the AI Game Master generates:
- A detailed opening scenario
- Six unique roles with objectives
- The initial state of the core metric
- Context for the unfolding emergency

---

## Technology Stack: Building the Simulation

### Frontend Architecture

**React 19 + TypeScript + Vite**
- Modern React hooks-based architecture for reactive state management
- TypeScript strict mode for type safety across 10,000+ lines of code
- Vite for lightning-fast development and optimized production builds

**State Management**
Centralized via `useGameController` hook managing:
- Game phase flow (LOBBY → STARTING → ACTION → CONSEQUENCE → END)
- Player state (roles, scores, action history)
- Event log and round history
- UI state (timers, modals, loading indicators)

**Key Frontend Libraries:**
- **React Flow** - Interactive action tree visualization with custom node styling
- **Tailwind CSS** - Utility-first styling for responsive dark-mode UI
- **Heroicons** - Clean, consistent iconography

### AI Integration: The Game Master

**LLM-Powered Dynamic Content**
All narrative and strategic content is generated by Large Language Models via the **LiteLLM proxy**, providing flexibility to use different models:

**Supported Models:**
- **Google Gemini Flash** (default) - Fast, cost-effective generation
- **GPT-4o-mini** - Balanced quality and speed
- **Gemini Pro** (planned) - Higher quality for complex scenarios

**Structured Outputs with Zod**
Every LLM call uses **Zod schemas** for validation via `zodResponseFormat`:

```typescript
// Example: Action generation schema
const actionOptionsSchema = z.object({
  options: z.array(z.object({
    title: z.string(),
    description: z.string(),
    cost: z.number().min(1).max(3),
  })).length(5)
});
```

If structured output fails, the service automatically falls back to `json_object` mode with manual parsing, ensuring robustness.

**Core LLM Functions:**

1. **generateInitialScenario()** - Creates opening crisis narrative
2. **generateActionOptions()** - Generates 5 tailored action choices per player
3. **generateAIPlayerActions()** - Two-step AI decision process:
   - First: Generate options for AI player
   - Second: Choose actions based on secret objectives
4. **generateConsequences()** - Resolves round with timeline storytelling
5. **generateCounterfactualConsequences()** - Calculates inaction baseline
6. **generateCustomScenario()** - Creates full scenario from user description

**Parallel API Calls**
During consequence resolution, the game makes parallel LLM calls:
- Generate options for 5 AI opponents simultaneously
- Calculate counterfactual in parallel with action generation
- Minimize round latency despite complex AI reasoning

### Backend & Data Persistence

**Vercel Serverless Functions**
API routes handle:
- Scenario submission and moderation
- Community voting (with fingerprinting to prevent duplicates)
- User feedback collection

**Prisma + PostgreSQL**
- Schema-driven database with type-safe queries
- Community scenarios with approval workflow
- Voting records and feedback analytics
- Multi-environment support (local, preview, production)

**Admin Tools**
CLI scripts for scenario moderation and feedback analysis:
```bash
# Scenario management
npm run scenarios -- --status pending
npm run scenarios -- --approve <id>
npm run scenarios -- --reject <id> "reason"

# Feedback analytics
npm run analyze -- --env production --stats
npm run analyze -- --model gpt-4o-mini --export data.csv
```

### Prompt Engineering: Crafting the Narrative

All prompts follow consistent principles:

**1. Clear AI Role Definition**
```
You are the Game Master of a crisis simulation tabletop exercise...
```

**2. Structured Context**
- Round number and crisis state
- Current scores and metrics
- Previous actions and outcomes
- Player role and objectives

**3. Timeline-Based Storytelling**
Consequences use 3-5 chronological "beats":
```
1. [First development and immediate reactions]
2. [Secondary consequences emerging]
3. [Tertiary effects and new complications]
4. [Score change with clear reasoning]
```

**4. Explicit Schema Requirements**
Every prompt specifies exact JSON structure with field descriptions, ensuring consistent outputs.

### Error Handling & Resilience

**Graceful Degradation:**
- LLM call failures return `null` and set error state
- User sees clear error message with "Return to Lobby" option
- Console logs provide detailed debugging information
- Retry logic for transient failures

**Timer Management:**
- 5-minute action phase timer with pause/resume
- Auto-submit empty actions on timeout
- Timer resets between rounds
- Visual countdown with color changes

---

## Community Features

### Scenario Sharing
Create custom scenarios in-game and share them with the community using the **"Make Public"** button. Your scenario enters a moderation queue where admins review it for quality and appropriateness.

### Upvoting System
Vote for your favorite community scenarios. The system uses **anonymous fingerprinting** to prevent duplicate votes while maintaining privacy.

### Feedback Collection
After playing, submit feedback to help improve Simulacra. Feedback is stored with:
- Model used for generation
- Scenario type played
- Game completion status
- User comments and ratings

Admins can analyze feedback across environments with powerful filtering and export options.

---

## Deployment: From Local to Production

### Local Development
```bash
# Install dependencies
npm ci

# Set up database
npm run db:setup

# Configure environment (.env)
DATABASE_URL="postgresql://user@localhost:5432/ttx-local"
VITE_LITELLM_API_KEY="your-api-key"
VITE_LLM_MODEL="gemini-2.5-flash"

# Start development server
npm run dev

# Open Prisma Studio for database management
npm run db:studio
```

### Vercel Deployment

**Build Settings:**
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js Version: `20.x`

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection (local dev)
- `PRISMA_DATABASE_URL` - Prisma Accelerate URL (preview/production)
- `VITE_LITELLM_API_KEY` - LiteLLM proxy API key
- `VITE_LLM_MODEL` - Model name (e.g., `gemini-2.5-flash`)

**Pre-Commit Workflow:**
Use the helper script to ensure clean deployments:
```bash
./git-push.sh                           # Prepare repo
./git-push.sh -c "Your commit message"  # Auto-commit and push
```

This validates Node version, regenerates lockfiles, runs build, and stages changes.

---

## Open Source & Collaboration

Simulacra is an **open-source project** welcoming contributions:

**Ways to Contribute:**
- Add new features or improve existing ones
- Fix bugs and improve error handling
- Enhance documentation and tutorials
- Create and share custom scenarios
- Improve prompt engineering for better narratives
- Add new scenario types or game mechanics

**Get Involved:**
- GitHub: [github.com/bhi5hmaraj/ai-risk-ttx](https://github.com/bhi5hmaraj/ai-risk-ttx)
- Submit Pull Requests for any improvements
- Open issues for bugs or feature requests
- Reach out: matib275 [at] gmail [dot] com

---

## The Philosophy of Hyperreal Simulation

What makes Simulacra more than just a game?

**1. Emergent Narratives**
The AI doesn't follow scripts—it generates responses based on context, creating genuinely surprising and coherent storylines.

**2. Strategic Depth**
Limited resources, hidden objectives, and AI opponents with their own agendas create genuine strategic tension. Every decision matters.

**3. Learning Through Play**
Counterfactual analysis and action tree visualization help players understand:
- How systems respond to interventions
- The unintended consequences of well-meaning actions
- The challenge of coordinating under uncertainty
- The tension between individual and collective goals

**4. A Space for Exploration**
By simulating crises too complex or risky to experiment with in reality, Simulacra creates a safe space to:
- Test strategic intuitions
- Explore failure modes
- Practice decision-making under pressure
- Understand how AI and human decision-makers interact

In this sense, the simulation becomes a legitimate form of knowledge production—not a mere copy of reality, but its own hyperreal space for learning and discovery.

---

## Future Roadmap

**Upcoming Features:**
- **Multiplayer Mode** - Play with friends in real-time
- **Enhanced Model Support** - Migration to Gemini Pro for higher quality
- **Multiple Core Metrics** - Track Public Trust, Stability, and Capacity separately
- **Stakeholder Relationships** - Dynamic alliances and conflicts with AI players
- **Forecast & Calibration** - Predict outcomes and improve your intuition
- **External Events** - News shocks and leaks that force reactive decisions
- **After-Action Review** - Export full game history for analysis

---

## Play Simulacra Today

Experience the intersection of philosophy, AI, and strategic gameplay.

**Try it now at:** [simulacra.example.com](#) *(Add your deployment URL)*

The simulation awaits. What will you decide when reality collapses into hyperreality?

---

*Simulacra - Where Simulation Becomes Reality*
