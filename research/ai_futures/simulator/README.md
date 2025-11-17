# AI-2027 Interactive Simulator

Interactive web-based simulator for the AI-2027 scenario by Daniel Kokotajlo, Scott Alexander, et al.

## Overview

This simulator faithfully represents the AI-2027 research in an interactive format:
- **State Machine**: 19 states from Mid-2025 through 2030
- **Branch Point**: October 2027 critical decision (Race vs. Slowdown)
- **Two Endings**: Race (AI takeover) vs. Slowdown (committee control)
- **Quantitative Variables**: 10+ metrics that evolve dynamically based on AI-2027 research
- **Probabilistic Forecasting**: Uses Squiggle language for uncertainty modeling

## Architecture

**Data Layer (Parsimonious to AI-2027)**:
- `simulation_model.json`: Complete state machine and variables
- `engine/SimulationEngine.js`: Time-based simulation logic with dynamic rates
- `engine/SquiggleIntegration.js`: Probabilistic forecasting with Squiggle
- `models/squiggleModels.js`: Uncertainty models for transitions and variables

**Presentation Layer**:
- React 18 with hooks
- Zustand for state management
- React Flow for state machine visualization
- Plotly for real-time graphs
- Squiggle for probabilistic modeling

## Features

✅ **Implemented**:
- Simulation engine with time-based progression
- State transitions (automatic and user-triggered)
- Dynamic variable updates matching AI-2027 research
- Configurable sim duration and speed
- Control panel with play/pause/reset
- Current state info display
- Branch point decision interface
- Key variables dashboard

🚧 **In Progress**:
- React Flow state machine visualization
- Timeline flowchart view
- Plotly real-time graphs

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open http://localhost:3001

## Build

```bash
npm run build
```

## Usage

1. **Configure**: Set how long you want to play (real-world minutes)
2. **Play**: Watch the simulation progress through 2025-2027
3. **Decide**: At October 2027 branch point, choose Race or Slowdown
4. **Observe**: See how variables evolve based on AI-2027 research
5. **Switch Views**: Toggle between state machine, flowchart, and graphs

## Data Model

The simulation model (`simulation_model.json`) includes:

### States (19 total)
- S1-S13: Main timeline (Mid-2025 → Sep 2027)
- S14_BRANCH: October 2027 decision point
- S15_RACE → S19_RACE: Race ending (extinction)
- S15_SLOWDOWN → S17_SLOWDOWN: Slowdown ending (committee control)

### Variables (10+)
- `ai_rd_multiplier`: How much faster AI research is with AI (1x → 500x)
- `misalignment_risk_score`: Risk of misaligned goals (0-1)
- `public_job_loss_rate`: Share of workforce displaced (0-0.8)
- `stock_market_index`: Relative to 2025 baseline (100 → 300+)
- `gdp_growth_rate`: Annual GDP growth (2% → 200%)
- And more...

### Dynamic Rates
Variables update based on:
- Current state
- Time elapsed
- AI R&D multiplier compounding
- Economic feedback loops
- All rates grounded in AI-2027 research

## Credits

Based on [ai-2027.com](https://ai-2027.com) by:
- Daniel Kokotajlo (OpenAI researcher, TIME100)
- Scott Alexander (Astral Codex Ten)
- Thomas Larsen (Center for AI Policy)
- Eli Lifland (AI Digest)
- Romeo Dean (Harvard CS)

## License

For research and educational purposes. See AI-2027 project for original research licensing.
