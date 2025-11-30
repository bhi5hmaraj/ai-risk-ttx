# Game UI Analysis: Learning from Crisis Management Games

**Objective**: Extract actionable UI/UX patterns from successful geopolitical/crisis games for our AI Risk TTX MVP.

**Games Analyzed**:
- Balance of Power (1985)
- Precipice (2020)
- Twilight Struggle (2005/digital)
- Cold War strategy games

**Last Updated**: 2025-11-29

---

## Table of Contents

1. [Balance of Power](#balance-of-power)
2. [Precipice](#precipice)
3. [Twilight Struggle](#twilight-struggle)
4. [Cross-Game Patterns](#cross-game-patterns)
5. [MVP Recommendations](#mvp-recommendations)
6. [Implementation Priorities](#implementation-priorities)

---

## Balance of Power

### Overview
Chris Crawford's classic geopolitical simulation (1985). Player manages U.S. foreign policy during Cold War.

### Key UI Patterns

#### 1. **World Map as Primary Interface**
```
┌─────────────────────────────────────┐
│  [World Map - Clickable Regions]    │
│                                     │
│  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │ USA │  │ EUR │  │ASIA │        │
│  └─────┘  └─────┘  └─────┘        │
│                                     │
│  Color-coded by:                    │
│  • Alignment (US/USSR/Neutral)     │
│  • Crisis severity                  │
│  • Recent events                    │
└─────────────────────────────────────┘
```

**What Works**:
- Geographic metaphor reduces cognitive load
- Color coding conveys status at a glance
- Click region → See details (progressive disclosure)
- Spatial memory aids recall ("What happened in Eastern Europe?")

**For Our MVP**:
- Not geographic, but could use **conceptual map**:
  - Public Opinion zone
  - Tech Systems zone
  - Media Coverage zone
  - Regulatory zone
- Each zone clickable for details
- Color intensity shows crisis severity

#### 2. **Tension Meter (DEFCON-style)**
```
┌────────────────────────┐
│  Tension Level         │
│  ████████░░░░░░░░░░░  │
│  ↑ Critical            │
└────────────────────────┘
```

**What Works**:
- Single glanceable metric for "am I winning?"
- Historical precedent (everyone knows DEFCON scale)
- Color progression: Green → Yellow → Orange → Red
- Immediate feedback on action consequences

**For Our MVP**:
✅ **Directly applicable** - We already have "Public Trust" score
- Add visual gauge instead of just number
- Color-code danger levels
- Animate changes to show delta

#### 3. **Crisis Cards/Notifications**
```
┌──────────────────────────────┐
│ 🚨 CRISIS: Soviet Invasion   │
│ Region: Afghanistan           │
│                              │
│ Your options:                │
│ • Condemn publicly           │
│ • Economic sanctions         │
│ • Military pressure          │
│ • Ignore                     │
└──────────────────────────────┘
```

**What Works**:
- Modal popup forces attention (crisis demands response)
- Clear framing: "Here's situation, here's choices"
- Options presented as buttons, not paragraphs
- Consequences preview on hover

**For Our MVP**:
✅ **Adopt crisis card format**
- Current event as prominent card
- Action options as clickable buttons
- Tooltip on hover shows likely outcome
- "Crisis of the Round" framing

#### 4. **Timeline/History View**
```
Turn 1: Soviet pressure in Poland
Turn 2: US economic sanctions
Turn 3: NATO military exercises
Turn 4: Crisis resolved
```

**What Works**:
- Chronological list easier to scan than paragraphs
- Shows cause-and-effect chain
- Collapsed by default, expand for details

**For Our MVP**:
✅ **Already partially implemented**
- Enhance with timeline visualization
- Show only last 2 rounds by default
- "View History" button for full timeline

---

## Precipice

### Overview
Modern nuclear crisis management game (2020). Manage escalating tensions to prevent nuclear war.

### Key UI Patterns

#### 1. **Dashboard Layout**
```
┌────────────────────┬────────────────────┐
│  Crisis Meter      │  Intelligence      │
│  ████████░░░░░░░  │  • Satellite shows │
│                    │  • Chatter up 40%  │
├────────────────────┼────────────────────┤
│  Available Actions │  Event Log         │
│  [3 cards]         │  [Scrollable]      │
└────────────────────┴────────────────────┘
```

**What Works**:
- Quad-panel layout: All critical info visible without scrolling
- Top-left: Most important metric (Crisis Meter)
- Top-right: Situational awareness (Intel)
- Bottom-left: Player agency (Actions)
- Bottom-right: History (Event Log)

**For Our MVP**:
✅ **Strong candidate for layout**
```
┌────────────────────┬────────────────────┐
│  Public Trust      │  Current Situation │
│  ████████████░░░  │  • AI systems...   │
│  65 (-15)          │  • Media reports...│
├────────────────────┼────────────────────┤
│  Your Actions      │  Recent Events     │
│  [Action cards]    │  [Last 2 rounds]   │
└────────────────────┴────────────────────┘
```

**Benefits**:
- No scrolling needed (except event log)
- Clear information hierarchy
- Familiar dashboard pattern
- Works on desktop and tablet

#### 2. **Countdown Timer Visualization**
```
┌────────────────┐
│  TIME LEFT     │
│     ⏱️         │
│    3:42        │
│                │
│  ▰▰▰▰▰▱▱▱▱▱  │
└────────────────┘
```

**What Works**:
- Large countdown creates urgency
- Progress bar shows time visually
- Color changes as time runs out (green → red)
- Pulsing animation when <1 minute

**For Our MVP**:
✅ **Already have timer, enhance visually**
- Make timer more prominent
- Add progress bar underneath
- Color-code urgency
- Pulse/blink when <30 seconds

#### 3. **Action Cards with Icons**
```
┌─────────────────┐
│  🛡️ Defensive   │
│  Deploy Shield  │
│                 │
│  Risk: Low      │
│  Cost: ⚡⚡     │
└─────────────────┘
```

**What Works**:
- Icon immediately communicates action type
- Title is verb-based ("Deploy", "Launch", "Issue")
- Metadata uses icons (risk level, cost)
- Card metaphor familiar to users

**For Our MVP**:
✅ **Adopt card-based action UI**
- Add emoji/icon to each action type
- Use consistent verb structure
- Show cost and risk with icons
- Hover for full description

#### 4. **Consequence Reveal Animation**
```
[Player selects action]
      ↓
[Processing... animation]
      ↓
[New state slides in]
      ↓
[Score change highlights]
```

**What Works**:
- Slight delay builds tension (1-2 seconds)
- Animation shows causality (your action → consequence)
- Score change animated (number counts up/down)
- New information fades in smoothly

**For Our MVP**:
✅ **Easy to implement**
- Add 1-2s processing state
- Animate score changes
- Slide in consequence card
- Use React Spring or Framer Motion

#### 5. **Intel/Clues System**
```
┌──────────────────────────┐
│  Intelligence Reports    │
│                          │
│  🔴 Satellite imagery    │
│     shows troop movement │
│                          │
│  🟡 Intercepted message  │
│     suggests...          │
└──────────────────────────┘
```

**What Works**:
- Gives context without overwhelming
- Bullet-point format
- Color-coded by urgency/confidence
- Optional - can skip reading

**For Our MVP**:
⚠️ **Consider for post-MVP**
- Could add "Context Clues" panel
- Show what AI opponents might do
- Background on current crisis
- Low priority for MVP

---

## Twilight Struggle

### Overview
Card-driven Cold War strategy (board game + digital). Two players compete for global influence.

### Key UI Patterns

#### 1. **Card Hand Interface**
```
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ CARD│ │ CARD│ │ CARD│ │ CARD│
│  1  │ │  2  │ │  3  │ │  4  │
└─────┘ └─────┘ └─────┘ └─────┘
  [Fan layout, bottom of screen]
```

**What Works**:
- Fan layout shows all cards at once
- Click card to play (simple interaction)
- Selected card enlarges for details
- Always visible (persistent UI element)

**For Our MVP**:
✅ **Card-based action selection**
- Display 5 action options as cards
- Fan layout (slight angle/overlap)
- Click to select, click again to confirm
- Selected card highlights

#### 2. **Influence Tracks**
```
US Influence:  ▰▰▰▰▰▰▱▱▱▱
USSR Influence: ▰▰▰▰▰▰▰▰▱▱
```

**What Works**:
- Opposing forces shown on same scale
- Bars make comparison instant
- Color coding (red vs blue)
- Shows relative advantage clearly

**For Our MVP**:
⚠️ **Not directly applicable** (single-player)
- Could show "Public Trust vs. Disinformation"
- Or "Progress toward win vs. loss conditions"
- Medium priority

#### 3. **Event Card Popup**
```
┌──────────────────────────────┐
│  Event: Cuban Missile Crisis │
│  ──────────────────────────  │
│                              │
│  Effect: USSR gains 3 inf... │
│                              │
│  Historical Note:            │
│  In October 1962...          │
│                              │
│  [Acknowledge]               │
└──────────────────────────────┘
```

**What Works**:
- Event is modal (blocks other actions)
- Clear title + effect description
- Optional historical flavor text (collapsed)
- Single button to dismiss ("Acknowledge")

**For Our MVP**:
✅ **Use for round transitions**
- "Round X Complete" modal
- Show consequences
- Display score changes
- "Continue to Next Round" button

#### 4. **Turn Summary Screen**
```
┌──────────────────────────────┐
│  Round 3 Summary             │
│  ────────────────────────    │
│                              │
│  Your Actions:               │
│  • Launched investigation    │
│                              │
│  Opponent Actions:           │
│  • Issued statement          │
│  • Held press conference     │
│                              │
│  Score Changes:              │
│  Public Trust: 72 → 58 (-14) │
│                              │
│  [Continue]                  │
└──────────────────────────────┘
```

**What Works**:
- Recap what just happened
- Lists all player actions
- Shows net score change
- Gives moment to reflect before next round

**For Our MVP**:
✅ **Add round summary modal**
- Show after consequence phase
- List all player actions (human + AI)
- Display score delta
- Brief transition before next ACTION phase

#### 5. **Game Log (Sidebar)**
```
┌──────────────────┐
│  Game Log        │
│  ──────────────  │
│  R3: US played   │
│      "Sanctions" │
│                  │
│  R2: USSR played │
│      "Veto"      │
│                  │
│  R1: US played   │
│      "Summit"    │
│  ▼ Older         │
└──────────────────┘
```

**What Works**:
- Persistent sidebar (always visible)
- Newest at top (reverse chronological)
- Compact format (one line per action)
- Scroll for full history

**For Our MVP**:
✅ **Event log sidebar**
- Show last 3 rounds by default
- Format: "Round X: [Action] → [Brief outcome]"
- Click round to expand details
- "View Full History" button

---

## Cross-Game Patterns

### Universal Success Factors

#### 1. **Visual Status Indicators**

All games use:
- **Color coding**: Green (safe) → Yellow (caution) → Red (danger)
- **Progress bars**: Immediately graspable quantities
- **Icons over text**: Faster recognition

**For Our MVP**:
```
Public Trust: ████████████░░░░░░░░░░ 65 🟡
              [Green bar w/ yellow indicator]

Action Cost: ⚡⚡⚡ (3 points)
Risk Level: 🟡 Medium
```

#### 2. **Information Hierarchy**

Consistent pattern across all games:
1. **Top priority**: Current crisis/situation (center or top)
2. **Second priority**: Available actions (bottom or left)
3. **Third priority**: Context/history (sidebar or collapsed)
4. **Always visible**: Main metric (score/tension/health)

**For Our MVP**:
```
Priority 1: Current Event (top, prominent)
Priority 2: Action Cards (center, large)
Priority 3: Event Log (sidebar, scrollable)
Always: Public Trust Gauge (top-right corner)
```

#### 3. **Turn/Phase Structure**

Standard flow in all games:
```
1. Present Situation
   ↓
2. Show Options
   ↓
3. Player Decides
   ↓
4. Reveal Consequences
   ↓
5. Update State
   ↓
6. [Repeat or End]
```

**For Our MVP**:
✅ **Already follows this pattern**
- Make transitions more explicit
- Add "End of Round" summary screen
- Clear visual distinction between phases

#### 4. **Feedback Loops**

Every decision shows:
- **Immediate feedback**: Visual/audio acknowledgment
- **Short-term consequences**: This round's outcome
- **Long-term tracking**: Score over time (trend)

**For Our MVP**:
- ✅ Immediate: Button press animation
- ✅ Short-term: Consequence card appears
- ⚠️ Add: Score trend chart (last 5 rounds)

#### 5. **Undo/Pause Capability**

All games allow:
- **Pause**: Stop timer to think
- **Review**: See history without consequence
- **Undo** (some games): Reverse last action

**For Our MVP**:
- ✅ Already have pause
- ✅ Already have event log review
- ❌ No undo (by design - decisions are final)

---

## MVP Recommendations

### Must-Have (P0) - Implement First

#### 1. Visual Score Gauge
**Current**: "Public Trust: 65"
**Improved**:
```
┌────────────────────────────┐
│  Public Trust              │
│  ████████████░░░░░░░░░░░  │ 65 🟡
│  ↓ -15 from last round     │
└────────────────────────────┘
```

**Effort**: Low (1-2 days)
**Impact**: High (immediate clarity)

---

#### 2. Card-Based Action UI
**Current**: Button list
**Improved**:
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 🔍 Launch   │ │ 📢 Issue    │ │ 🛡️ Deploy  │
│ Investigation│ │ Statement   │ │ Safeguards  │
│             │ │             │ │             │
│ ⚡⚡ · 🟡   │ │ ⚡ · 🟢     │ │ ⚡⚡⚡ · 🔴 │
└─────────────┘ └─────────────┘ └─────────────┘
```

**Effort**: Medium (3-4 days)
**Impact**: High (better visual hierarchy)

---

#### 3. Round Summary Modal
**New feature**:
```
┌──────────────────────────────┐
│  Round 3 Complete            │
│  ──────────────────────────  │
│                              │
│  Actions Taken:              │
│  • Tech CEO: Investigation   │
│  • Regulator: New rules      │
│  • Journalist: Exposé        │
│                              │
│  Outcome:                    │
│  Public discovered backdoors │
│  Trust declined significantly│
│                              │
│  Score: 72 → 58 (-14) 📉     │
│                              │
│  [Continue to Round 4]       │
└──────────────────────────────┘
```

**Effort**: Low (2-3 days)
**Impact**: Medium (aids comprehension)

---

#### 4. Dashboard Layout
**Reorganize GameScreen**:
```
┌────────────────────┬────────────────────┐
│  📊 Public Trust   │  📰 Current Event  │
│  [Gauge]           │  [Crisis card]     │
│  65 (-15) 🟡       │  AI systems...     │
├────────────────────┼────────────────────┤
│  🎯 Your Actions   │  📜 Recent Rounds  │
│  [Action cards]    │  Round 3: -14      │
│                    │  Round 2: +8       │
│                    │  Round 1: -5       │
└────────────────────┴────────────────────┘
```

**Effort**: Medium (4-5 days, refactor existing)
**Impact**: High (professional look, clearer)

---

### Should-Have (P1) - Next Iteration

#### 5. Icon System for Actions
Add emoji/icon to each action type:
- 🔍 Investigation
- 📢 Communication
- 🛡️ Protection
- ⚖️ Regulation
- 🤝 Cooperation
- ⚠️ Warning

**Effort**: Low (1 day)
**Impact**: Medium (faster recognition)

---

#### 6. Consequence Animation
Add transition between phases:
```
[Action selected]
      ↓ (fade out)
[Processing... 1-2s]
      ↓ (slide in)
[Consequence revealed]
      ↓ (number counts)
[Score updates]
```

**Effort**: Low (2 days with Framer Motion)
**Impact**: Medium (feels more polished)

---

#### 7. Event Log Sidebar
**Move from center to sidebar**:
```
┌──────────────┬─────────────────┐
│ [Main Game]  │  Event Log      │
│              │  ─────────────  │
│              │  Round 3:       │
│              │  • Crisis wors..│
│              │  • Trust -14    │
│              │                 │
│              │  Round 2:       │
│              │  • Invest. laun.│
│              │  ▼ Older        │
└──────────────┴─────────────────┘
```

**Effort**: Medium (3 days, layout change)
**Impact**: Medium (cleaner main view)

---

### Nice-to-Have (P2) - Post-MVP

#### 8. Score Trend Chart
**Small sparkline showing last 5 rounds**:
```
Public Trust: 65 ▁▃▅▇▅ (-14)
                  [Mini chart]
```

**Effort**: Medium (3-4 days with chart library)
**Impact**: Low (interesting but not critical)

---

#### 9. Context Clues Panel
**Intel-style hints**:
```
┌──────────────────────────┐
│  Background Info         │
│  🔵 Tech companies have  │
│     been resistant to... │
│                          │
│  🟡 Public sentiment is  │
│     shifting toward...   │
└──────────────────────────┘
```

**Effort**: Medium (2-3 days)
**Impact**: Low (adds flavor, not essential)

---

#### 10. Conceptual Map Interface
**Instead of geographic map, abstract zones**:
```
┌─────────────────────────────┐
│    Public Opinion           │
│    🟡 Cautious              │
│                             │
│  Tech      Media      Govt  │
│  Systems   Coverage   Action│
│  🔴 Alert  🟢 Calm   🟡Slow │
└─────────────────────────────┘
```

**Effort**: High (1-2 weeks, major redesign)
**Impact**: Medium (different UX paradigm)

---

## Implementation Priorities

### Sprint 1: Visual Polish (1 week)
**Goal**: Make existing UI clearer without restructuring

✅ **Tasks**:
1. Add visual score gauge (2 days)
2. Convert action buttons to cards (3 days)
3. Add icon system (1 day)
4. Test with users (1 day)

**Expected Outcome**: 40-50% reduction in "too much text" complaints

---

### Sprint 2: Information Architecture (1 week)
**Goal**: Reorganize layout for better hierarchy

✅ **Tasks**:
1. Implement dashboard quad-panel layout (3 days)
2. Add round summary modal (2 days)
3. Move event log to sidebar (2 days)

**Expected Outcome**: Clearer game flow, less overwhelming

---

### Sprint 3: Interaction Polish (1 week)
**Goal**: Make interactions feel game-like

✅ **Tasks**:
1. Add consequence reveal animation (2 days)
2. Enhance timer visualization (1 day)
3. Add micro-interactions (hover states, etc.) (2 days)
4. User testing round 2 (2 days)

**Expected Outcome**: More engaging, polished experience

---

### Post-Sprint: Evaluate
**Questions to answer**:
- Did complaints about text decrease?
- Do users complete games faster?
- Is comprehension better?
- Do we need Pixi.js or are CSS animations enough?

**Decision Point**:
- ✅ If feedback is positive → Ship MVP
- ⚠️ If still text-heavy → Consider Pixi.js (see `text-overload-solutions.md`)

---

## Visual Mockups

### Before & After: Action Selection

**Before** (Current):
```
Actions Available:
• Launch comprehensive investigation into AI systems (Cost: 2)
• Issue public statement calling for transparency (Cost: 1)
• Deploy emergency safeguards on critical infrastructure (Cost: 3)

[Submit Actions]
```

**After** (Proposed):
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ 🔍 Launch       │ │ 📢 Issue        │ │ 🛡️ Deploy      │
│ Investigation   │ │ Statement       │ │ Safeguards      │
│                 │ │                 │ │                 │
│ ⚡⚡ Medium    │ │ ⚡ Low          │ │ ⚡⚡⚡ High     │
│ 🟡              │ │ 🟢              │ │ 🔴              │
│                 │ │                 │ │                 │
│ [Select]        │ │ [Select]        │ │ [Select]        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

### Before & After: Score Display

**Before**:
```
Public Trust: 65 (decreased by 15 points from last round)
```

**After**:
```
┌─────────────────────────────┐
│ Public Trust                │
│ ████████████░░░░░░░░░░░░░  │
│ 65  🟡 Caution              │
│ ↓ -15 from Round 2          │
└─────────────────────────────┘
```

---

### Before & After: Full Screen Layout

**Before** (Vertical scroll):
```
[Nav]
[Current Event - long text]
[Your Score]
[Action Options - long list]
[Event Log - very long]
[Footer]
```

**After** (Dashboard, no scroll):
```
┌────────────────────┬────────────────────┐
│ 📊 Public Trust    │ 📰 Current Event   │
│ [Gauge] 65 🟡      │ [Card - collapsed] │
│                    │ AI systems comp... │
│                    │ [Expand for more]  │
├────────────────────┼────────────────────┤
│ 🎯 Your Actions    │ 📜 Recent History  │
│ [Cards in row]     │ R3: Crisis (-14)   │
│ 🔍 🛡️ 📢          │ R2: Invest (+8)    │
│                    │ [View Full Log →]  │
└────────────────────┴────────────────────┘
```

---

## Technical Implementation Notes

### Component Changes Needed

#### 1. ScoreGauge Component
```tsx
// components/ScoreGauge.tsx
interface ScoreGaugeProps {
  value: number;
  max: number;
  delta?: number;
  label: string;
}

export function ScoreGauge({ value, max, delta, label }: ScoreGaugeProps) {
  const percentage = (value / max) * 100;
  const color = percentage > 66 ? 'green' : percentage > 33 ? 'yellow' : 'red';

  return (
    <div className="score-gauge">
      <h3>{label}</h3>
      <div className="gauge-bar">
        <div
          className={`fill fill-${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="score-value">
        {value} {delta && `(${delta > 0 ? '+' : ''}${delta})`}
      </div>
    </div>
  );
}
```

#### 2. ActionCard Component
```tsx
// components/ActionCard.tsx
interface ActionCardProps {
  title: string;
  icon: string;
  cost: number;
  risk: 'low' | 'medium' | 'high';
  description: string;
  onSelect: () => void;
  selected?: boolean;
}

export function ActionCard(props: ActionCardProps) {
  const riskColor = {
    low: '🟢',
    medium: '🟡',
    high: '🔴'
  }[props.risk];

  return (
    <div
      className={`action-card ${props.selected ? 'selected' : ''}`}
      onClick={props.onSelect}
    >
      <div className="card-header">
        <span className="icon">{props.icon}</span>
        <h4>{props.title}</h4>
      </div>
      <div className="card-meta">
        <span>{'⚡'.repeat(props.cost)}</span>
        <span>{riskColor} {props.risk}</span>
      </div>
      <Tooltip content={props.description}>
        <button>Details</button>
      </Tooltip>
    </div>
  );
}
```

#### 3. DashboardLayout Component
```tsx
// components/DashboardLayout.tsx
interface DashboardLayoutProps {
  topLeft: ReactNode;
  topRight: ReactNode;
  bottomLeft: ReactNode;
  bottomRight: ReactNode;
}

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <div className="dashboard-grid">
      <div className="panel top-left">{props.topLeft}</div>
      <div className="panel top-right">{props.topRight}</div>
      <div className="panel bottom-left">{props.bottomLeft}</div>
      <div className="panel bottom-right">{props.bottomRight}</div>
    </div>
  );
}
```

### CSS Patterns

```css
/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr;
  gap: 1rem;
  height: calc(100vh - 4rem);
  padding: 1rem;
}

/* Action Cards */
.action-card {
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.action-card.selected {
  border-color: var(--primary-color);
  background: var(--primary-bg);
}

/* Score Gauge */
.gauge-bar {
  width: 100%;
  height: 24px;
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
}

.gauge-bar .fill {
  height: 100%;
  transition: width 0.5s ease-out;
}

.fill-green { background: var(--success-color); }
.fill-yellow { background: var(--warning-color); }
.fill-red { background: var(--danger-color); }
```

---

## Testing Checklist

### Before Shipping MVP

- [ ] Score gauge animates smoothly on value change
- [ ] Action cards respond to hover/click
- [ ] Dashboard layout works on desktop (1920x1080 minimum)
- [ ] Round summary modal appears after consequence phase
- [ ] Event log sidebar scrolls independently
- [ ] All icons are visible and consistent
- [ ] Color coding is accessible (not relying on color alone)
- [ ] Keyboard navigation works for all interactive elements
- [ ] Mobile layout degrades gracefully (stacked panels)
- [ ] User testing with 5 people shows understanding

---

## Success Metrics

### Quantitative
- **Time to decision**: Average time per action selection (target: <2 minutes)
- **Completion rate**: % of users who finish 5 rounds (target: >80%)
- **Comprehension**: % who can explain consequence of their action (target: >70%)

### Qualitative
- **User feedback**: "Too much text" complaints decrease by 50%
- **First impressions**: "Looks like a real game" vs "Looks like a form"
- **Engagement**: Users report feeling immersed in scenario

---

## References

### Games Studied
- [Balance of Power - MobyGames](https://www.mobygames.com/game/balance-of-power)
- [Precipice - Steam](https://store.steampowered.com/app/951520/Precipice/)
- [Twilight Struggle - Digital Version](https://store.steampowered.com/app/406290/Twilight_Struggle/)

### UI Inspiration
- [Good Game UI Design Patterns](https://www.gameuidatabase.com/)
- [Interface in Game](https://interfaceingame.com/)
- [GMTK: Invisible UI](https://www.youtube.com/watch?v=RElsFpOOwqQ)

### Design Principles
- [Juice It or Lose It](https://www.youtube.com/watch?v=Fy0aCDmgnxg) - Making games feel better
- [10 Principles of Good Game Design](https://www.gamedeveloper.com/design/10-principles-of-good-level-design)

---

**Document Status**: Ready for team review
**Next Steps**: Choose Sprint 1 tasks and start implementation
**Owner**: UX/Dev Team
