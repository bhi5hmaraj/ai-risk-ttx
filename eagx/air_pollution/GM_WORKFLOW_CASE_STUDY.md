# GM Workflow Case Study: Dr. Sharma Creates "October Crisis 2024"

## Profile: The Game Master

**Name**: Dr. Anjali Sharma
**Background**: Environmental policy researcher, 8 years experience
**Technical Skills**: Can use Excel, familiar with policy models, basic Python
**Domain Knowledge**: Expert on Delhi air pollution, has field research experience
**Goal**: Create TTX for graduate policy seminar (20 students)

---

## Starting Materials

Dr. Sharma has collected:

**Documents**:
1. `SAFAR_Delhi_Emission_Inventory_2023.pdf` (40 pages)
   - Sector-wise emissions (vehicles 28%, industry 20%, stubble 26%, etc.)
   - Seasonal variations
   - Weather impact data

2. `IIT_Delhi_Stubble_Burning_Study.pdf` (65 pages)
   - Farmer survey results (N=5000)
   - Subsidy program evaluation
   - Compliance rates by district

3. `Supreme_Court_Judgment_2022.pdf` (20 pages)
   - GRAP framework
   - Legal obligations of governments
   - Penalty mechanisms

4. `Workshop_Notes_Oct2023.docx` (12 pages)
   - Notes from stakeholder workshop
   - Quotes from farmers, industry leaders, activists
   - Political dynamics

**Data Files**:
5. `Delhi_AQI_Oct_Nov_2019_2023.csv`
   - Daily AQI readings
   - 150 days × 5 years

6. `Subsidy_Program_Outcomes.xlsx`
   - 2019-2023 subsidy programs
   - Coverage, costs, effectiveness

**Personal Knowledge**:
- Interviewed 50+ farmers in Punjab
- Attended 10+ government-NGO meetings
- Understands political pressures on Chief Minister

---

## Phase 1: Document Ingestion (30 minutes)

### Step 1.1: Upload to Architect

Dr. Sharma opens Architect Mode interface:

```
=== Architect Mode: Create Custom Scenario ===

Step 1: Provide Domain Knowledge

Upload documents (PDF, Word, Excel, CSV):
[Choose Files]

Or paste text:
[Text Box]

Uploaded:
✅ SAFAR_Delhi_Emission_Inventory_2023.pdf (40 pages)
✅ IIT_Delhi_Stubble_Burning_Study.pdf (65 pages)
✅ Supreme_Court_Judgment_2022.pdf (20 pages)
✅ Workshop_Notes_Oct2023.docx (12 pages)
✅ Delhi_AQI_Oct_Nov_2019_2023.csv (15 KB)
✅ Subsidy_Program_Outcomes.xlsx (8 KB)

[Next: Extract Knowledge] [Add More Files]
```

### Step 1.2: LLM Extraction

System processes documents (2 minutes):

```
Processing documents...

📄 Parsing SAFAR report...
   ✅ Extracted emission inventory
   ✅ Identified 5 sectors
   ✅ Found seasonal variation patterns

📄 Parsing IIT Delhi study...
   ✅ Extracted farmer survey data
   ✅ Found subsidy elasticity: -0.6
   ✅ Identified compliance predictors

📄 Parsing Supreme Court judgment...
   ✅ Extracted GRAP stages
   ✅ Mapped AQI thresholds → legal obligations

📄 Parsing workshop notes...
   ✅ Identified 8 stakeholder quotes
   ✅ Extracted political tensions
   ✅ Found 3 potential conflict scenarios

📊 Parsing AQI data...
   ✅ Computed statistics: mean=245, max=497
   ✅ Identified spike dates (Diwali, stubble season)

📊 Parsing subsidy data...
   ✅ Average coverage: 45%
   ✅ Average effectiveness: 38% reduction

Complete! Extracted knowledge graph with:
- 7 stakeholders
- 18 parameters
- 12 potential events
- 6 constraints
```

### Step 1.3: Review Extraction

Dr. Sharma sees structured summary:

```
=== Extracted Scenario Elements ===

STAKEHOLDERS (7 detected):
1. Delhi Chief Minister
   - Constraints: ₹800cr budget, election in 18 months
   - Objectives (inferred): AQI control, public approval
   - Authority: Delhi-only policies

2. Punjab Agriculture Secretary
   - Constraints: Crop timeline (Nov 15 deadline)
   - Objectives (inferred): Farmer livelihoods
   - Authority: Cannot control Delhi

[Show 5 more...]

PARAMETERS (18 calibrated):
- stubble_burning_baseline: 3000 tons/day (Oct-Nov)
  Source: SAFAR 2023, Table 4.2

- subsidy_effectiveness: 0.60 reduction at 75% coverage
  Source: IIT Delhi study, page 42

- public_alarm_threshold: AQI > 300 triggers media attention
  Source: Workshop notes, stakeholder feedback

[Show 15 more...]

EVENTS (12 proposed):
1. Diwali Firecracker Spike
   - Trigger: Round 3 (Oct 25-Nov 10)
   - Effect: AQI +100, public_alarm +20
   - Source: Historical data (2019-2023 average)

2. Supreme Court Hearing
   - Trigger: AQI > 400 for 2 consecutive rounds
   - Effect: Government accountability +50
   - Source: SC Judgment 2022

[Show 10 more...]

[Accept All] [Review Each] [Manual Edit]
```

Dr. Sharma clicks **[Review Each]** because she wants to verify assumptions.

---

## Phase 2: Configuration (45 minutes)

### Step 2.1: Scenario Metadata

```
=== Scenario Configuration ===

Basic Info:
Name: October Crisis 2024
Description: [Text box with LLM suggestion]
   "Navigate Delhi's worst pollution season in a decade.
    Farmers need to clear fields, government faces budget
    constraints, and public health is at stake."

Target Audience:
○ General Public (simplified)
● Graduate Students (balanced)
○ Policy Professionals (advanced)

Learning Objectives (select or add):
☑ Understand multi-stakeholder coordination challenges
☑ Experience trade-offs between economy and environment
☑ Learn about policy implementation barriers
☐ Practice negotiation and coalition-building
☐ Other: ___________

Duration:
Rounds: 5 [slider: 3-10]
Minutes per round: 8 [slider: 5-15]
Estimated total time: 60-75 minutes

[Next: Configure Stakeholders]
```

### Step 2.2: Stakeholder Configuration

Dr. Sharma reviews proposed stakeholders:

```
STAKEHOLDER 1: Delhi Chief Minister

Public Objective (visible to all):
"Keep AQI below 300 throughout the season"

Hidden Objective (secret win condition):
Current: "Maintain public approval >60% while spending <₹600cr"

✏️ Edit Hidden Objective:
[Text box]

GM Note: Too focused on budget. I want tension between
short-term approval vs long-term solutions.

Revised: "Win re-election (approval >60%) while being
seen as decisive on pollution (take at least 3 major actions)"

Initial Resources:
- Delhi Budget: ₹800 crores [slider: 0-2000]
- Political Capital: 100 [slider: 0-200]

Action Restrictions:
✓ Can subsidize within Delhi
✓ Can ban/mandate in Delhi
✗ Cannot force Punjab/Haryana actions
✗ Cannot override central government

[Save] [Reset to Default]
```

Dr. Sharma adjusts 3 stakeholders' hidden objectives to create better tensions.

**Key Changes**:
1. **Farmer Rep**: Added "Minimize farmer income loss <20%" (was just "Protect livelihoods")
2. **Industry Leader**: Changed to "Delay stringent regulations until after Q4 earnings" (creates time pressure)
3. **Activist**: Added "Mobilize at least 2 public protests if government inaction" (makes them more active)

### Step 2.3: Initial Conditions

```
Initial State:

Environmental:
AQI: 150 [slider: 50-400]
PM2.5: 80 μg/m³ [auto-computed from AQI]
Season: Pre-Diwali (Oct 15-Nov 1)

Economic:
Delhi Budget: ₹800 crores
Central Subsidy Fund: ₹500 crores

Social:
Public Approval: 65% [slider: 30-90]
Public Alarm: 40% [slider: 0-100]

Behavioral:
Farmers Using Alternatives: 30% [slider: 0-100]
Industry Compliance: 50% [slider: 0-100]
Enforcement Capacity: 50% [slider: 0-100]

Weather (affects each round randomly):
Wind Speed: 3-8 km/h (typical Oct-Nov range)
Temperature: 15-25°C
Rain Probability: 10% per round

[Use Typical October] [Use Worst Case] [Custom]
```

Dr. Sharma selects **[Use Typical October]** - wants realistic, not artificially hard.

### Step 2.4: Events & Triggers

Dr. Sharma reviews 12 proposed events, keeps 8, adds 2 custom:

**Added Event 1**:
```
Event: International Conference Cancellation

Trigger:
Type: Conditional
Condition: "aqi > 450 AND round >= 2"

Effects:
- public_alarm: +30
- international_reputation: -20
- media_attention: +40

Narrative Template:
"COP30 organizers announce Delhi removed from consideration
for hosting 2026 preparatory meetings, citing 'unacceptable
air quality risks to delegates.'"

GM Rationale: From personal experience, this happened in 2019,
very impactful politically.
```

**Added Event 2**:
```
Event: Farmer Cooperative Success Story

Trigger:
Type: Conditional
Condition: "farmers_compliance > 0.60 AND round >= 3"

Effects:
- farmer_trust: +20
- media_attention: +15
- public_approval: +10

Narrative Template:
"In Ludhiana district, 200 farmers formed a cooperative to
jointly purchase Happy Seeder machines. 'We're not the
problem, we're part of the solution,' says cooperative leader."

GM Rationale: Want to show positive path exists, not just crisis.
```

### Step 2.5: Win Conditions

```
Win Conditions:

Public Goal (shared):
Primary: AQI average < 250 across all rounds
Secondary: Complete 5 rounds without catastrophic failure

Failure Conditions (game over):
- AQI > 500 for 1 round (public health emergency)
- Budget negative (bankruptcy)
- Public approval < 30% (legitimacy crisis)

Hidden Goals (per role):
[Edited in Step 2.2]

Victory Evaluation:
At game end, each player sees:
1. Did public goal succeed? (Yes/No)
2. Did your hidden goal succeed? (Yes/No)
3. Your contribution score (based on actions taken)

Win = Public goal + Your hidden goal
Partial = Public goal OR your hidden goal
Loss = Neither

[Next: Set Difficulty]
```

### Step 2.6: Difficulty Calibration

```
Difficulty Settings:

Preset: ● Medium ○ Easy ○ Hard ○ Custom

What "Medium" Means:
- Win rate in AI simulations: 50-60%
- Requires coordination (can't win alone)
- Some margin for error (2-3 suboptimal actions OK)
- Achievable objectives (not contradictory)

Advanced Knobs (optional):
Budget Multiplier: 1.0 [slider: 0.5-2.0]
   (1.5 = 50% more budget, easier)

Action Effectiveness: 1.0 [slider: 0.5-2.0]
   (1.2 = actions 20% more effective, easier)

Event Severity: 1.0 [slider: 0.5-2.0]
   (0.8 = events 20% less severe, easier)

Time Pressure: Normal
   ● 8 min/round (normal)
   ○ 12 min/round (relaxed)
   ○ 5 min/round (intense)

[Keep Medium Preset] [Customize]
```

Dr. Sharma keeps Medium preset - wants challenging but achievable.

---

## Phase 3: Validation (20 minutes)

### Step 3.1: Automated Checks

System runs validation:

```
=== Validating Scenario ===

Consistency Checks:
✅ All initial values within bounds
✅ Win conditions not contradictory
✅ Event triggers are reachable
✅ Stakeholder authorities don't overlap
✅ Budget allocations sum correctly

Balance Checks (running simulations with AI agents...):
✅ Scenario can be won (55% win rate in 20 simulations)
✅ Scenario can be lost (40% lose in simulations)
✅ No dominant strategy detected
⚠️ Role balance issue detected

   Problem: "Farmer Representative" won hidden objective
   only 20% of the time (target: 40-60%)

   Diagnosis: Hidden objective "Minimize farmer losses <20%"
   is too strict given that crop delays are inevitable.

   Suggested Fix: Change to "Minimize losses <30%" OR
   add alternative win path: "Successfully negotiate
   compensation package >₹200cr"

   [Accept Suggestion] [Ignore] [Manual Fix]
```

Dr. Sharma clicks **[Accept Suggestion]** - adds alternative win path.

**Re-running validation**:

```
✅ Role balance improved: Farmer Rep now wins 45% (acceptable)

Playability Checks:
✅ Each round has 3-5 meaningful choices
⚠️ Round 4 may have limited options (avg budget remaining: ₹150cr)

   Suggestion: Add mid-game event "Emergency Fund Release"
   that gives ₹200cr if public_alarm > 70

   [Accept] [Ignore]
```

Dr. Sharma **[Accepts]** - ensures game doesn't stall in Round 4.

**Final validation**:

```
✅ All checks passed!
✅ Scenario is ready for deployment

Summary:
- 7 stakeholders (balanced)
- 8 events (mix of scheduled and conditional)
- 18 calibrated parameters
- Difficulty: Medium
- Estimated win rate: 52%
- Estimated playtime: 65-75 minutes

[Generate Scenario File] [Back to Edit] [Run Detailed Simulation]
```

### Step 3.2: Detailed Simulation (Optional)

Dr. Sharma clicks **[Run Detailed Simulation]** to see a sample playthrough:

```
=== Simulated Playthrough (AI Agents) ===

Round 1:
- CM: Subsidize farmers (₹300cr, magnitude 0.75)
- Env Minister: Monitor compliance (₹50cr)
- Farmer Rep: Wait (building trust)
- Industry: Negotiate delay on regulations
- Activist: Publicize health data

Result:
AQI: 150 → 185 (worse than expected, weather unfavorable)
Farmer compliance: 30% → 48% (subsidy working)
Budget: 800 → 450 (₹350cr spent)

Round 2:
Event triggered: "Diwali Firecracker Spike"
AQI: 185 → 290 (spike!)

Players respond:
- CM: Construction ban (₹5cr)
- Env Minister: Negotiate with Punjab government
- Activist: File court case

Result:
AQI: 290 → 260 (emergency measures help)
Public alarm: 40% → 65% (public worried)

[Continue simulation...] [Skip to end]

Final Result:
Public goal: AQI average 242 ✅ (target <250)
Rounds completed: 5 ✅
CM hidden goal: ✅ (approval 63%, took 4 major actions)
Farmer hidden goal: ✅ (negotiated ₹220cr compensation)
Industry hidden goal: ❌ (regulations passed in Round 3)

Outcome: PUBLIC WIN + 2/3 hidden goals = Good outcome
```

Dr. Sharma reviews, satisfied that scenario is balanced.

---

## Phase 4: Export & Deploy (5 minutes)

### Step 4.1: Generate Scenario File

```
=== Export Scenario ===

Scenario Name: October Crisis 2024
Author: Dr. Anjali Sharma
Created: 2025-01-15

Format:
● JSON (for game engine)
○ PDF (human-readable summary)
○ Both

[Generate File]

Generated: october_crisis_2024.json (2.4 MB)

This file contains:
- All stakeholder definitions
- Event triggers and narratives
- Calibrated parameters
- Win/lose conditions
- LLM prompts for narrative generation

Load this file in the game engine to run the scenario.

[Download] [Copy to Clipboard] [Upload to Game Server]
```

### Step 4.2: Preview for Players

Dr. Sharma clicks **[Preview for Players]** to see what students will see:

```
=== October Crisis 2024 ===

You are decision-makers during Delhi's worst air pollution
season in a decade. Farmers face pressure to clear fields
before the wheat planting deadline, but stubble burning sends
AQI soaring. The government has limited budget and time
before elections. Can you coordinate to keep Delhi breathable?

Roles (7 players):
1. Delhi Chief Minister
2. Central Environment Minister
3. Punjab Agriculture Secretary
4. Industry Association Leader
5. Public Health Director
6. Civil Society Activist
7. Transport Commissioner

Duration: 60-75 minutes (5 rounds)

Difficulty: Medium (requires coordination)

Learning Goals:
- Understand coordination challenges across jurisdictions
- Experience policy trade-offs
- Learn about implementation barriers

[Ready to Play] [Learn More] [Share Scenario]
```

---

## Total Time Investment

**Dr. Sharma's Time**:
- Upload documents: 5 min
- Review extractions: 10 min
- Configure stakeholders: 20 min
- Set initial conditions: 10 min
- Review events: 15 min
- Validation & refinement: 20 min
- **Total: ~80 minutes**

**System Processing**:
- Document extraction: 2 min (LLM)
- Simulations for validation: 3 min (AI agents)
- **Total automated: ~5 minutes**

**Result**: In ~1.5 hours, Dr. Sharma created a scientifically-grounded, balanced, playable scenario without writing code.

---

## Post-Deployment: Running the Game

### Week Later: Dr. Sharma Runs TTX with Students

**Setup** (10 min):
1. Load `october_crisis_2024.json` in game engine
2. Students join session
3. Assign roles randomly
4. Brief students on objectives

**Gameplay** (70 min):
- Students play 5 rounds
- System tracks all actions, state changes
- LLM generates narratives based on Dr. Sharma's scenario parameters

**Debrief** (20 min):
- Review action tree (what choices were available)
- Discuss coordination failures
- Compare to real 2019 October crisis

**Student Feedback**:
> "The farmer dilemma felt so real - we wanted to help them but
> had to prioritize AQI. Exactly the kind of trade-off real
> policymakers face."

> "I didn't realize how important timing is - by Round 4 we'd
> spent all our budget and had no options left."

---

## Dr. Sharma's Reflection

**What Worked**:
- ✅ Document extraction saved hours of manual data entry
- ✅ Validation caught the Farmer role imbalance I missed
- ✅ Students engaged with realistic scenario (grounded in actual data)
- ✅ Narrative quality was high (LLM used my workshop quotes)

**What She'd Change**:
- 🔄 Add more mid-game events (Round 4 still felt a bit slow)
- 🔄 Make hidden objectives slightly easier (only 40% of students achieved theirs)
- 🔄 Include a "catastrophic failure" scenario (students wanted to see worst case)

**Would She Use Architect Mode Again?**
> "Absolutely. As a policy person, not a coder, this was
> game-changing. I could translate my expertise into a working
> TTX without learning Python. The validation caught issues I
> never would have spotted. I'm already planning a Beijing
> version for next semester."

---

## Key Takeaways

### For Game Engine Designers

1. **Document extraction is critical**: GMs have knowledge in PDFs, not code
2. **Validation must be automatic**: GMs can't spot balance issues without playtesting
3. **Tiered control works**: Most GMs used Wizard mode, advanced users appreciated Designer mode
4. **LLM quality matters**: Narrative generation must match GM's domain expertise

### For Game Masters

1. **Start with documents**: Don't try to specify everything manually
2. **Trust the validation**: AI simulations caught real issues
3. **Iterate quickly**: Easy to tweak and re-validate in minutes
4. **Focus on pedagogy**: Let system handle math, you design learning experience

### For the Architecture

1. **Three phases work**: Ingestion → Configuration → Validation
2. **GM time budget**: ~1-2 hours to create first scenario
3. **Bottleneck**: Event design (GMs want more guidance here)
4. **Success metric**: Can domain expert create playable scenario without code? ✅ Yes.
