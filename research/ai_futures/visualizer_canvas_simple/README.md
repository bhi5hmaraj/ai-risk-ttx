# AI2027 State Machine Visualizer

Interactive visualizer for the AI2027 causal DAG created by Daniel Kokotajlo and Scott Alexander.

## Overview

This React application provides an interactive representation of the AI2027 forecast's underlying state machine. All states, transitions, probabilities, and timelines are derived directly from the published research at [ai-2027.com](https://ai-2027.com).

## Features

- **Visual State Machine**: React Flow-based graph showing all states and transitions
- **Time Simulation**: Configurable time scaling (map simulation days to wall clock seconds)
- **Interactive Transitions**:
  - **Automatic**: Time-based transitions (e.g., compute scaling)
  - **Probabilistic**: Roll-based events (e.g., espionage incidents)
  - **Choice-based**: User decisions (e.g., invest in agentic AI or tool AI)
- **Global State Tracking**: Real-time display of key variables
  - Compute (FLOP), algorithmic efficiency, capability level
  - Race dynamics (US-China relations, race pressure, espionage risk)
  - Safety metrics (alignment investment, safety margin)
- **Epistemic Confidence**: Transitions color-coded by strength of evidence
  - Green (>60%): Strong evidence
  - Orange (30-60%): Moderate evidence
  - Red (<30%): Weak/speculative
  - Dark Red (<0%): Contested by researchers
- **Two Endings**: Race Ending (extinction) or Slowdown Ending (committee control)

## Installation

```bash
cd research/ai_futures/visualizer
npm install
```

## Running

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Production Build

```bash
npm run build
```

This creates optimized files in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment

### GitHub Pages

**Option 1: Using GitHub Actions (Recommended)**

1. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: research/ai_futures/visualizer/package-lock.json

      - name: Install dependencies
        working-directory: research/ai_futures/visualizer
        run: npm ci

      - name: Build
        working-directory: research/ai_futures/visualizer
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'research/ai_futures/visualizer/dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

2. In your GitHub repository:
   - Go to **Settings** > **Pages**
   - Source: **GitHub Actions**
   - Push to main branch to trigger deployment

**Option 2: Manual Deployment with gh-pages**

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to `package.json`:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "homepage": "https://USERNAME.github.io/REPO-NAME/research/ai_futures/visualizer"
}
```

3. Update `vite.config.js` to set base path:
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/REPO-NAME/research/ai_futures/visualizer/',
  server: {
    port: 3001
  }
})
```

4. Deploy:
```bash
npm run deploy
```

**Option 3: Deploy to Vercel**

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd research/ai_futures/visualizer
vercel
```

3. Follow prompts, Vercel will auto-detect Vite and configure build settings

**Option 4: Deploy to Netlify**

This repo includes `netlify.toml` configuration for easy deployment.

**Method 1: Netlify CLI (Recommended)**

1. Install Netlify CLI:
```bash
npm i -g netlify-cli
```

2. Build and deploy:
```bash
cd research/ai_futures/visualizer
npm run build
netlify deploy --prod
```

3. Follow prompts:
   - Authorize with Netlify
   - Create new site or select existing
   - Publish directory: `dist`

**Method 2: Netlify Dashboard (Drag & Drop)**

1. Build locally:
```bash
cd research/ai_futures/visualizer
npm run build
```

2. Go to [Netlify Dashboard](https://app.netlify.com/)
3. Drag the `dist` folder to the deploy zone

**Method 3: GitHub Integration**

1. Push this repo to GitHub
2. In Netlify dashboard: New site → Import from Git
3. Settings auto-detected from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Base directory: `research/ai_futures/visualizer`

**Troubleshooting**:
- If you see "Failed to load module script" error, ensure `netlify.toml` and `public/_redirects` exist
- The `netlify.toml` sets correct MIME types for JavaScript modules
- The `_redirects` file handles SPA routing

## Usage

### Setup Phase

1. **Simulation Duration**: Choose how many years to simulate (1-5 years, default 3)
2. **Real-Time Duration**: Choose wall clock time for playthrough (5-30 minutes, default 10)
3. Click "Begin Simulation"

The time scale automatically maps simulation days to wall clock seconds. For example:
- 3 year simulation (1095 days) in 10 minutes (600 seconds)
- = 1.825 sim days per real second
- = ~110 sim days (3.5 months) per real minute

### Simulation Phase

**Time Controls**:
- **Play/Pause**: Control time progression
- Time automatically advances when playing
- Manual triggering available for all transitions

**Available Actions**:
- **Automatic Transitions**: Trigger when conditions met (e.g., compute threshold reached)
- **Probabilistic Transitions**: Roll dice to see if event occurs (e.g., espionage incident)
- **Choice Transitions**: Make strategic decisions at branch points

**State Machine View**:
- **Current state**: Highlighted in red
- **Visited states**: Highlighted in cyan
- **Transition confidence**: Shown as percentages on edges
- **Animated edges**: Automatic transitions

**Global State Panel**:
- Live tracking of all key variables
- Color-coded bars show levels (green = safe, orange = moderate, red = critical)
- Critical thresholds trigger visual warnings

### End States

**Extinction (Race Ending)**:
- Reached if safety margin drops too low during superintelligence
- Represents misaligned ASI takeover scenario

**Committee Control (Slowdown Ending)**:
- Reached if alignment investment remains high and slowdown chosen
- Represents aligned ASI controlled by oversight committee

## Architecture

### State Machine Model (`src/model.js`)

All data structures derived from `research/ai_futures/analysis/ai2027_causal_dag.json`:

**States**:
- Current (2024) - P=1.0
- GPT-5 Level - P=0.7
- US-China AI Race - P=0.6
- AGI (2027) - P=0.5
- Superintelligence - P=0.3
- Extinction (end) - Conditional
- Aligned Committee (end) - Conditional

**Transitions**:
Each transition includes:
- `from` / `to`: State IDs
- `trigger`: Event description
- `mechanism`: How transition occurs
- `type`: automatic, probabilistic, or choice
- `epistemicConfidence`: Strength of evidence (-1 to 1)
- `citation`: Reference to AI2027 source
- `conditions`: Function checking if transition available
- `effects`: Function updating global state

**Global State Variables**:
- Capabilities: compute_flop, algorithmic_efficiency, capability_level
- Race: us_china_relations, race_pressure, espionage_risk
- Safety: alignment_investment, safety_margin
- Time: simDays, simDate

### Components

- `App.jsx`: Main application controller
- `SetupScreen.jsx`: Initial configuration
- `StateMachineVisualizer.jsx`: React Flow graph visualization
- `ControlPanel.jsx`: Time controls and transition buttons
- `GlobalStateDisplay.jsx`: State variable monitoring

### Libraries

- **React 18**: UI framework
- **ReactFlow**: Graph visualization
- **Zustand**: State management (planned, currently using React state)
- **Vite**: Build tool

## Grounding in Research

This visualizer **represents** AI2027's research, not critiques it. All mechanics are grounded in their published work:

### Compute Scaling (Epistemic Confidence: 0.60)
> "3.4x/year increase in compute for leading AI company through December 2027"
>
> Source: AI2027 Compute Forecast

### Algorithmic Progress (Epistemic Confidence: 0.40, Contested)
> "Algorithmic progress currently 3-30% faster with AI chatbots. Expected 5-60% faster at RE-Bench saturation. Assumes 50% of overall progress."
>
> Source: AI2027 Timelines Forecast

### Agent Transition (Epistemic Confidence: 0.15, Highly Speculative)
> "SC → SAR: 15% chance immediate, otherwise 4 years (80% CI: 1.5-10). Assumes 5x AI R&D multiplier."
>
> Source: AI2027 Takeoff Forecast

### Recursive Self-Improvement / FOOM (Epistemic Confidence: -0.10, Contested)
> "SIAR → ASI: 95 years human-only time, but 250x AI R&D multiplier → actual time ~4 months. Highly speculative."
>
> Source: AI2027 Takeoff Forecast

### Security Vulnerability (Epistemic Confidence: 0.65)
> "No U.S. AI project on track to be secure against nation-state actors by 2027. Leading projects at WSL3 (vulnerable to OC4 nation-state attacks)."
>
> Source: AI2027 Security Forecast

### Race Dynamics (Epistemic Confidence: 0.60-0.70)
> "China is only a few months behind as ASI approaches, pressuring U.S. to press forward despite warning signs."
>
> Source: AI2027 Main Scenario

## Extending

To add new states or transitions:

1. Edit `src/model.js`
2. Add to `STATES` object
3. Add to `TRANSITIONS` array with:
   - Trigger, mechanism, type
   - Epistemic confidence score
   - Citation to AI2027 source
   - Conditions and effects functions

## License

MIT - See parent project license

## Citations

All data from:
- AI 2027 by Daniel Kokotajlo, Scott Alexander, et al.
- Published at https://ai-2027.com
- Research supplements: Compute, Timelines, Takeoff, AI Goals, Security forecasts

This visualizer is an independent educational tool and not officially affiliated with the AI2027 project.
