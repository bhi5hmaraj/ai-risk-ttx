# Research Brief: Tabletop Exercise Design Principles for AI Governance Education

## Project Context

**Simulacra** is a digital tabletop exercise (TTX) game designed to educate players about AI governance, stakeholder dynamics, and the tension between self-interest and public good. The name references Jean Baudrillard's concept of simulations that become more "real" than reality itself.

### Core Mission
Make people aware of:
- How AI governance works in practice
- How multiple stakeholders with different incentives interact
- The complex interplay between personal objectives and collective welfare
- Decision-making under uncertainty during AI-driven crises

### Design Philosophy
**We're building a meta-game** - a framework that allows players and facilitators to create their own crisis scenarios. While our focus is AI governance, the system should support diverse crisis domains: cybersecurity incidents, public health emergencies, climate crises, financial meltdowns, etc.

This raises fundamental questions:
- **What abstractions work across all crisis types?** (universal state variables, mechanics, causal patterns)
- **What should be fixed vs. configurable?** (core game engine vs. scenario parameters)
- **How do we balance constraint (maintaining educational value) with creative freedom (enabling diverse scenarios)?**

All recommendations should **generalize to different scenario types** and help us design a flexible yet pedagogically sound framework.

### Primary Inspiration
Our main inspiration is the **[AI 2027 Futures Project](https://www.ai2027.com/)** and similar organizations building TTX games for policy education and scenario planning. We also draw inspiration from:
- **Will Wright's The Sims and SimCity** - emergent complexity from simple rules, accessible simulation design
- **System dynamics modeling** (John Sterman's work) - modeling feedback loops and complex systems behavior

We aim to learn from their approaches while creating a more accessible, scalable digital experience.

### Two Distinct Audiences

**CRITICAL**: Our game must serve **two fundamentally different audiences** with different needs:

#### 1. General Public (Awareness & Engagement)
**Goal**: Raise awareness about AI governance issues through accessible, engaging gameplay

**Needs**:
- **Simple mechanics**: Easy to understand, low barrier to entry
- **High engagement**: Fun, dramatic, emotionally compelling
- **High-level insights**: Grasp the big picture without getting lost in details
- **Short sessions**: Playable in 20-40 minutes
- **Memorable takeaways**: Walk away with 2-3 key insights about governance complexity

**Design priorities**: Entertainment value, accessibility, viral potential, emotional impact

#### 2. Policymakers & Decision-Makers (Training & Analysis)
**Goal**: Develop sophisticated understanding of multi-stakeholder dynamics and policy consequences

**Needs**:
- **Complex mechanics**: Realistic representation of governance systems
- **High fidelity**: Accurate modeling of causal relationships, second-order effects
- **Deep insights**: Understand subtle interactions, feedback loops, unintended consequences
- **Longer sessions**: Willing to invest 1-2 hours for depth
- **Actionable learning**: Transfer skills to real-world policy decisions
- **Debriefing tools**: Rich analysis and reflection capabilities

**Design priorities**: Realism, depth, analytical rigor, professional credibility

#### Design Challenge

**How do we serve both audiences without compromising either?**

Possible approaches to explore:
- **Difficulty modes**: Simplified vs. advanced gameplay (like Civilization's difficulty levels)
- **Separate modes**: "Story Mode" vs. "Simulation Mode"
- **Progressive complexity**: Tutorial → Intermediate → Expert scenarios
- **Modular features**: Core experience + optional advanced mechanics
- **Different scenarios**: Public-facing scenarios (dramatic) vs. professional scenarios (realistic)

This tension between **engagement vs. depth** and **accessibility vs. realism** is central to our design challenge.

---

## Current Implementation (For Context Only)

**Note**: We are **not** constrained by our current design. This section provides context on where we are today, but we welcome recommendations for fundamental redesigns based on TTX best practices.

### Current Game Mechanics

### Game Structure

**Players & Roles:**
- Single-player experience (human vs AI opponents)
- 6 distinct roles representing different stakeholders:
  - **Election Commissioner** - Oversees electoral integrity
  - **Tech CEO** - Represents private sector interests
  - **Journalist** - Media/public transparency advocate
  - **Federal Regulator** - Government oversight
  - **Campaign Manager** - Political operations
  - **Cybersecurity Expert** - Technical security advisor
- Each role has:
  - **Public objectives** (visible to all) - collaborative goals
  - **Hidden objectives** (secret) - personal win conditions that may conflict with public good

**Turn-Based Gameplay:**
1. **Scenario Setup**: Player selects a role and scenario type (pre-built AI safety crisis, classic election scenario, or custom scenario)
2. **Round Structure** (5 rounds total):
   - **Crisis Event**: An AI Game Master generates a dynamic scenario description based on previous actions and current state
   - **Action Phase**:
     - Player receives 5 action options generated by AI
     - Has 3 action points to spend (actions cost 1-3 points each)
     - 5-minute timer per turn
     - Can view what other AI players are considering (their available options)
   - **Consequence Phase**:
     - AI Game Master evaluates all player actions simultaneously
     - Provides narrative consequences in chronological "beats"
     - Updates two score types:
       - **Public Score** ("Democratic Legitimacy" or scenario-specific metric) - shared win condition
       - **Hidden Scores** - personal progress toward secret objectives
     - Shows "counterfactual" - what would have happened if no one acted
3. **End Condition**: Game ends after 5 rounds or if public score drops to 0

**Action System:**
- Actions are dynamically generated by LLM, not from a fixed pool
- Range from cooperative (bolster public score) to self-serving (advance hidden objective)
- Cost varies based on complexity and impact
- Examples: "Issue public statement", "Launch internal investigation", "Coordinate with other agencies", "Leak information to press"

**Scoring Mechanics:**
- **Public Score**: Represents collective welfare (e.g., "Democratic Legitimacy" in election scenarios)
  - All players share this score
  - Falling too low causes game over
- **Hidden Score**: Personal progress tracked secretly
  - Win condition evaluated at game end
  - May incentivize actions that harm public score

**Post-Game:**
- Victory determined by hidden objective completion AND public score survival
- **Action Tree Visualization**: Shows all players' available options and chosen actions across rounds as a decision tree
- Round-by-round breakdown with score changes and event log

### Key Game Elements

**AI Game Master:**
- Generates opening scenario based on selected type
- Creates contextually appropriate action options for each player
- Writes consequence narratives that respond to player choices
- Simulates AI opponent behavior (generates their options, then selects actions based on their hidden objectives)
- Maintains narrative coherence across rounds
- **Technically**: LLM acts as a stochastic game master, implementing a conditional probability distribution over valid game continuations

**Transparency Features:**
- Players can see AI opponents' available action options before submitting
- Counterfactual analysis shows baseline consequences of inaction
- Full action history preserved for review (append-only log structure)

**Dual-Utility System:**
- **Public Score**: Shared metric (e.g., "Democratic Legitimacy") - cooperative element
- **Hidden Scores**: Private progress toward secret objectives - competitive element
- Creates principal-agent problem: players balance collective good vs. personal objectives
- Implements Pareto frontier trade-offs

**Parallel Processing:**
- During consequence phase, AI player actions and counterfactual computed in parallel
- Fork-join pattern minimizes latency

**Scenario Types:**
1. **Classic**: AI-generated election crisis scenarios
2. **AI Safety**: Pre-built scenario about AI model misuse during elections
3. **Custom**: Player provides description, AI generates full scenario setup

**Mathematical/Technical Architecture (Current Implementation):**

Our current architecture can be viewed as a **sequential multi-agent game** with:
- **Finite horizon**: Maximum 5 rounds (T=5)
- **Perfect recall**: Complete history of all actions preserved
- **Imperfect information**: Hidden objectives create strategic uncertainty
- **Stochastic transitions**: LLM-generated consequences introduce probabilistic elements
- **Cooperative-competitive dynamics**: Shared public metric + conflicting private goals

**State Space Model:**
The game state at time t is a tuple: S_t = (phase, round, coreMetric, currentEvent, history)
- **phase** ∈ {LOBBY, STARTING, ACTION, CONSEQUENCE, END} - finite state machine
- **round** ∈ [0, 5] - current round number
- **coreMetric** ∈ [0, 100] - public score (clamped)
- **currentEvent** - narrative state describing current crisis
- **history** - append-only log of all actions, options, and consequences

**Phase Transitions:**
```
LOBBY → STARTING (start game)
STARTING → ACTION (initial scenario generated)
ACTION → CONSEQUENCE (player actions submitted)
CONSEQUENCE → ACTION (if round < 5 and coreMetric > 0)
CONSEQUENCE → END (if round ≥ 5 or coreMetric ≤ 0)
```

**Agent Model:**
Each agent i has:
- **Role**: Fixed identity (Election Commissioner, Tech CEO, Journalist, etc.)
- **Type**: Human or AI
- **Public utility**: Visible objective (maximize public score)
- **Hidden utility**: Secret objective (personal win condition)
- **Hidden score**: Accumulated progress toward hidden objective
- **Action points**: Budget for selecting actions (default: 3 per round)

**Dual-Utility Creates Principal-Agent Problem:**
- Players must balance collective good (public score) vs. personal objectives (hidden score)
- Total utility = α·ΔPublicScore + β·ΔHiddenScore (player-determined weights)
- Creates Pareto frontier trade-offs: improving one may harm the other
- Forces minimum cooperation: if public score ≤ 0, everyone loses

**Action System as Constrained Optimization:**
- Each round, LLM generates 5 action options per player
- Each action has cost ∈ {1, 2, 3}
- Players select actions subject to: Σ(action costs) ≤ 3 (action points)
- This is a variant of the knapsack problem with utility uncertainty

**LLM as Stochastic Game Master:**
The LLM implements a conditional probability distribution: P(outcome | state, actions, prompt)
- Not a fixed transition function, but implicitly defined by model weights
- Context-dependent (influenced by entire game history)
- Constrained by structured output schemas (Zod validation)
- Acts as black-box Markov Decision Process

**Consequence Function:**
Maps joint actions to outcomes: C(state, {all player actions}) → (ΔpublicScore, {ΔhiddenScores}, nextEvent, narrative)
- Generates 3-5 chronological "beats" describing what happened
- Updates all scores
- Creates next crisis event
- Maintains narrative coherence with history

**Counterfactual Analysis:**
System computes parallel "null world": What happens if no one acts?
- Provides baseline comparison ("cost of inaction")
- Helps LLM calibrate action consequences
- Prevents degenerate strategies (doing nothing)
- Computed in parallel for performance

**Parallel Processing Architecture:**
During CONSEQUENCE phase, system runs in parallel:
1. Generate AI player action options (n-1 calls)
2. Generate AI player choices (n-1 calls)
3. Compute counterfactual (1 call)
4. Then sequentially: Generate consequences with all results

Fork-join pattern minimizes latency from ~10-20 sequential LLM calls to ~4-5 call rounds.

**Information Asymmetry:**
- **Observable**: Public score, current event, full history, all players' chosen actions, public objectives
- **Private**: Each player's hidden score, hidden objective, available action points
- **Zero information**: Other players' hidden states
- Creates signaling game: actions may reveal information about hidden objectives

**Termination Conditions:**
Game ends when: (round > 5) OR (publicScore ≤ 0)
- Soft constraint: Complete 5 rounds (success)
- Hard constraint: Keep public score > 0 (failure condition)

**Schema Validation as Type System:**
- Zod schemas enforce contracts between LLM and game engine
- Runtime type checking prevents: type errors, constraint violations, missing fields
- Fallback strategies: try stricter constraints → JSON mode with parsing → error and halt

**Event Log Structure:**
History is append-only log where each entry contains:
- Round number
- All player actions taken
- All available action options (for action tree visualization)
- Consequences (score changes, narrative)
- Counterfactual outcome
- Forms complete causal graph for provenance tracking and replay

**Key Technical Innovations:**
1. **LLM as probability distribution** over valid game continuations
2. **Structured output validation** bridges probabilistic text generation and deterministic game logic
3. **Parallel LLM computation** for performance
4. **Counterfactual reasoning** for baseline comparison
5. **Pure functional state updates** for reproducibility
6. **Complete history logging** for action tree visualization and analysis

**Design Trade-offs in Current System:**
- **Flexibility** (dynamic action generation) vs. **Predictability** (fixed action pool)
- **Narrative coherence** (LLM storytelling) vs. **Mechanical consistency** (explicit simulation)
- **Accessibility** (5 rounds, simple scoring) vs. **Depth** (complex system dynamics)
- **Single-player** (playable anytime) vs. **Multiplayer** (social dynamics, negotiation)

**Note**: We are **not constrained** by this implementation. If research suggests fundamental redesigns (e.g., explicit system dynamics models, different turn structures, separate modes for different audiences), we're open to it.

---

## Primary Research Objective

**Conduct a comprehensive literature survey on tabletop exercise design principles**, with emphasis on:
1. Military strategy TTX and crisis simulation best practices
2. Educational game design and learning theory
3. **Meta-game architecture and universal world modeling abstractions**

Use these findings to recommend a **domain-agnostic TTX framework** that:
- Works across multiple crisis types (AI governance, cybersecurity, climate, public health, etc.)
- Allows scenario creators to build custom exercises while maintaining educational value
- Balances fixed structure (game engine) with configurable parameters (scenario content)

We are **open to fundamental redesign** of our current approach. Do not be constrained by our current implementation.

---

## Core Research Questions

### 1. Military & Government TTX Practices

**Critical Focus Area**: Military organizations have refined TTX methodology over decades for training strategic decision-making under uncertainty. What can we learn from them?

**Research Topics:**

*Historical & Contemporary Military TTX:*
- How do military war games structure scenario progression and crisis escalation?
- What are the standard phases of military TTX (e.g., briefing, execution, hot wash/debrief)?
- How do they balance realism vs. learning objectives?
- What role does the "White Cell" (control/adjudication team) play vs. "Red Team" (adversary) vs. "Blue Team" (friendly forces)?
- How do they handle fog of war, information asymmetry, and uncertainty?
- What formats exist: seminar-style, operations-based, command post exercises (CPX), etc.?

*Facilitation & Adjudication:*
- How are player actions evaluated and consequences determined?
- What methods exist for adjudicating ambiguous situations (dice rolls, referee judgment, simulation models)?
- How do facilitators inject new information or "injects" to drive scenario evolution?
- What is the role of the Game Master/Control Cell in maintaining educational focus?

*Learning Outcomes:*
- How do military TTX measure effectiveness of training?
- What debriefing practices maximize learning transfer?
- How do they capture lessons learned and institutionalize knowledge?
- How do repetition and variation balance in training scenarios?

*Examples to Study:*
- U.S. military wargaming (National Defense University, RAND Corporation scenarios)
- NATO crisis management exercises
- Homeland Security tabletop exercises (HSEEP framework)
- FEMA disaster response simulations
- Cybersecurity incident response TTX (e.g., Cyber Storm exercises)

### 2. Educational Serious Games & Policy Simulations

**Research Topics:**

*Established Policy TTX:*
- How do organizations like AI 2027 Futures Project structure their exercises?
- What methodologies do think tanks use for scenario planning (e.g., CSIS, CFR)?
- How do academic programs teach policy/strategy through simulation?
- What are best practices from Model UN, crisis committees, and policy debate formats?

*Serious Games for Governance:*
- What design principles make games effective educational tools vs. entertainment?
- How do successful serious games balance engagement and didacticism?
- **Will Wright's simulation design philosophy**:
  - How does SimCity teach urban planning without being didactic?
  - How does The Sims create emergent storytelling from simple rules?
  - What makes his simulations feel "toylike" and accessible while modeling complexity?
  - How does he hide system dynamics complexity behind intuitive interfaces?
- What examples exist of games teaching complex systems (Democracy 4, Fate of the World, etc.)?
- How do they handle moral ambiguity and contested values?
- **How do games teach systems thinking?**
  - Feedback loops, delays, non-linearities
  - Unintended consequences
  - Leverage points in complex systems

*Digital vs. Physical TTX:*
- What are advantages/limitations of digital platforms vs. in-person exercises?
- How does medium affect player engagement, learning, and social dynamics?
- What hybrid approaches exist?
- Can digital tools enhance traditional TTX without losing key benefits?

### 3. Game Design Foundations for Multi-Stakeholder Scenarios

**Research Topics:**

*Information Architecture:*
- How should information be distributed among players (perfect info, hidden info, asymmetric info)?
- What role does negotiation, communication, and alliance-building play in learning?
- How do games prevent "quarterbacking" (dominant players) or encourage engagement from all?
- When should player actions be simultaneous vs. sequential?

*Incentive Design:*
- How do games create meaningful tension between individual and collective interests?
- What role do hidden objectives, role-playing constraints, and win conditions play?
- How do scoring systems shape player behavior and learning?
- Should games have winners, or focus purely on exploration/learning?

*Scenario Escalation:*
- How should crises evolve in response to player actions vs. pre-scripted events?
- What narrative structures maintain engagement over multiple rounds?
- How do you balance player agency with narrative coherence?
- What pacing and round structures optimize learning?

*Replayability & Variation:*
- How much variation is needed for educational value in repeated plays?
- What should vary: starting conditions, player roles, scenario events, evaluation criteria?
- How do games support skill progression from novice to expert players?

### 4. World Modeling & Simulation Design

**Critical Focus Area**: We need domain-agnostic modeling abstractions that work across AI governance, cybersecurity, climate, public health, and other crisis scenarios. What are the universal elements of multi-stakeholder crisis response?

**Research Topics:**

*Universal Modeling Abstractions:*
- **What state variables are common across crisis scenarios?**
  - Public trust/legitimacy/confidence metrics
  - Stakeholder resources (political capital, funding, influence)
  - Information states (what's known, what's hidden, uncertainty levels)
  - Time pressure and urgency dynamics
  - Institutional relationships and alliances
  - Media/public attention
  - Technical/operational capabilities
- **What game mechanics generalize across domains?**
  - Resource allocation and action costs
  - Information revelation and discovery
  - Coordination and negotiation
  - Trade-offs between competing objectives (individual vs. collective good)
  - Escalation and de-escalation dynamics
  - Feedback loops (reinforcing and balancing)
- **What are proven domain-agnostic frameworks for modeling socio-technical crises?**
  - **System dynamics models** (John Sterman's approach): Stock-and-flow diagrams, feedback loops, delays
  - **Agent-based modeling** approaches: Emergent behavior from simple agent rules
  - **Network/graph models** of stakeholder relationships
  - **Institutional analysis frameworks** (e.g., Ostrom's IAD framework)
  - **Will Wright's simulation philosophy**: Emergent complexity from simple, intuitive rules (The Sims, SimCity)
  - **Dual-utility models**: Balancing public good (shared metric) vs. private objectives (hidden scores)

*Constraint vs. Free-Form Balance:*
- **Fixed Framework Elements** (what should be hard-coded):
  - What game structure should be universal? (phases, turn mechanics, etc.)
  - What state variables must always exist?
  - What rules should be immutable to ensure learning objectives?
  - What boundaries prevent "degenerate" scenarios that don't teach anything?
- **Configurable Elements** (what scenario creators should control):
  - What should be customizable per scenario? (roles, objectives, events, metrics)
  - How much freedom should scenario creators have?
  - What parameters need constraints to maintain educational value?
  - How do you prevent creators from making unbalanced or broken scenarios?
- **Examples from Meta-Game Design**:
  - How do tabletop RPG systems balance universal rules vs. campaign-specific content? (D&D core rules vs. modules)
  - How do game creation tools constrain while enabling creativity? (Minecraft, Roblox, Dreams, etc.)
  - How do crisis simulation platforms handle multi-domain flexibility?
  - What does "minimal viable framework" look like?

*Meta-Game Architecture:*
- **Scenario Creation & Configuration**:
  - What should scenario "specification" look like? (data structure, schema)
  - What can be procedurally generated vs. must be authored?
  - How do professional TTX designers create new scenarios? What's their workflow?
  - What tooling exists for scenario authorship? (editors, validators, playtesting tools)
- **Parameterization Strategy**:
  - What knobs and dials should creators have access to?
  - How granular should configuration be? (high-level themes vs. detailed parameters)
  - What defaults ensure good experiences for novice creators?
  - How do you expose complexity progressively? (simple mode vs. advanced mode)
- **Quality Assurance**:
  - How do you validate that a custom scenario will be playable and educational?
  - What automated checks can catch broken scenarios before players encounter them?
  - How do you provide feedback to scenario creators about balance and pacing?

*Simulation Fidelity:*
- What level of detail is appropriate for educational vs. operational planning TTX?
- **How do we adjust fidelity for different audiences?**
  - General public: Simplified causality, dramatic outcomes
  - Policymakers: Realistic complexity, nuanced consequences
- How do professional TTX balance computational models vs. human judgment?
- What role do quantitative metrics vs. qualitative narrative play?
- When should outcomes be deterministic vs. probabilistic?
- **Examples from successful simulations**:
  - How does SimCity balance accessibility with system dynamics complexity?
  - How do serious games like "Fate of the World" handle climate modeling fidelity?
  - How do business simulations (inspired by system dynamics) teach feedback loops?

*Causal Modeling:*
- How do effective simulations represent cause-and-effect relationships?
- **System dynamics approach** (John Sterman): How can we represent feedback loops, delays, non-linearities?
  - Reinforcing loops (vicious/virtuous cycles)
  - Balancing loops (homeostasis, resistance)
  - Time delays that create oscillations and surprises
- What frameworks exist for modeling socio-technical systems, governance, and institutional behavior?
- How do you represent second-order effects and delayed consequences?
- How should counterfactual analysis be integrated?
- **How do you model causality in domain-agnostic ways?** (universal causal patterns)
- **How do you make complex causality accessible?**
  - For general public: Visible, immediate, intuitive cause-effect
  - For policymakers: Subtle interactions, delayed effects, feedback loops

*AI & LLM Integration:*
- How are organizations using LLMs to augment or automate TTX facilitation?
- What are risks and benefits of AI-generated content in educational simulations?
- How can AI maintain consistency, fairness, and pedagogical intent?
- What human oversight is necessary?
- **How can LLMs work with structured world models vs. pure narrative generation?**
  - Hybrid approaches: structured state + LLM narrative layer
  - How to ensure LLM respects game rules and state
  - How to make LLM outputs consistent with world model

### 5. Theory of Change & Impact Measurement

**Critical Focus Area**: Understanding the causal pathway from gameplay to real-world impact is essential for designing an effective educational tool. What exactly should players learn, how does gameplay produce that learning, and how do we measure success?

**Research Topics:**

*Theory of Change Frameworks:*
- What are established theory of change (ToC) models for educational games and simulations?
- How do serious games articulate their intended impact pathway?
- What are the key stages: inputs → activities → outputs → outcomes → impact?
- What assumptions underlie the belief that TTX gameplay leads to better governance understanding?
- What are common failure modes where gameplay doesn't translate to learning?

*Learning Outcomes & Objectives:*
- What specific knowledge, skills, and attitudes should players develop?
  - **Knowledge**: Understanding of governance mechanisms, stakeholder dynamics, policy options
  - **Skills**: Strategic thinking, systems analysis, negotiation, trade-off evaluation
  - **Attitudes**: Appreciation for complexity, empathy for different stakeholder perspectives, humility about decision-making under uncertainty
- How do we define "governance literacy" or "systems thinking" in measurable terms?
- What are appropriate learning objectives for different audience segments (students vs. professionals vs. general public)?
- Should objectives focus on domain-specific knowledge (AI governance) or transferable skills (multi-stakeholder reasoning)?

*Immediate vs. Downstream Outcomes:*
- **Immediate**: Player engagement, comprehension during play, expressed enjoyment
- **Short-term**: Knowledge retention, attitude shifts, self-reported learning
- **Medium-term**: Application to other scenarios, changed mental models, discourse quality
- **Long-term**: Actual policy influence, career choices, civic engagement
- What level of impact is realistic to expect and measure for a digital game?
- How do we avoid claiming impact we can't actually demonstrate?

*Measurement & Evaluation Methods:*
- What assessment methods exist for educational games?
  - Pre/post knowledge tests
  - Behavioral measures during gameplay (decision patterns, strategy quality)
  - Self-reported learning and attitude surveys
  - Qualitative interviews and think-aloud protocols
  - Long-term follow-up studies
  - Control group comparisons
- What metrics specifically capture systems thinking and multi-stakeholder reasoning?
- How do professional TTX programs evaluate their effectiveness?
- What are validated instruments for measuring governance literacy, policy reasoning, etc.?
- How can we build measurement into the game experience without disrupting it?

*Attribution & Validity Challenges:*
- How do we know learning came from the game vs. other factors?
- What confounds exist (prior knowledge, discussion with peers, external events)?
- What is the risk of teaching "the wrong lessons" through oversimplified simulation?
- How do we validate that in-game behavior reflects real understanding vs. gaming the system?
- What evidence would convince skeptics that the game produces meaningful learning?

*Examples & Case Studies:*
- How do existing serious games (Democracy, Fate of the World, Papers Please) articulate their theory of change?
- What impact evaluations exist for policy simulations, Model UN, etc.?
- What has research shown about transfer of learning from games to real contexts?
- Are there successful examples of games demonstrably improving governance outcomes?

### 6. User Experience & Interface Design for Strategy Games

**Research Topics:**

*Cognitive Load & Decision Support:*
- How do strategy games present complex information without overwhelming players?
- What UI patterns support strategic thinking (decision trees, consequence previews, etc.)?
- How should time pressure be used (if at all) in educational contexts?
- What data visualization approaches help players understand systems dynamics?

*Feedback & Reflection:*
- How do games provide actionable feedback on decision quality?
- What post-game analysis tools support learning (replays, decision trees, comparative analysis)?
- How do debriefing/after-action review interfaces enhance educational value?
- What role does peer feedback play in multiplayer learning experiences?

*Accessibility & Scalability:*
- How can TTX be designed for various group sizes (solo, small team, large cohort)?
- What onboarding approaches help novices engage with complex scenarios?
- How do successful games balance depth for experts with accessibility for newcomers?

---

## Research Methodology

### Primary Sources to Consult

1. **Military & Government Publications:**
   - US Department of Defense wargaming doctrine and handbooks
   - RAND Corporation reports on simulation design
   - Homeland Security Exercise and Evaluation Program (HSEEP) guidelines
   - NATO Joint Analysis and Lessons Learned Centre publications
   - Academic journals: *Simulation & Gaming*, *Journal of Strategic Studies*

2. **TTX Practitioners & Organizations:**
   - AI 2027 Futures Project methodology and published scenarios
   - Center for Strategic & International Studies (CSIS) scenario planning
   - Council on Foreign Relations (CFR) crisis simulations
   - Harvard Kennedy School exercises and case studies
   - Articles/interviews with professional TTX facilitators

3. **Serious Games & Educational Design:**
   - Academic research on game-based learning
   - Post-mortems from successful serious games (Papers, Please; Democracy series; etc.)
   - Educational game design frameworks (MDA framework, Learning Mechanics-Game Mechanics model)
   - Research on role-playing simulations in education

4. **Game Design Theory:**
   - Books: *A Theory of Fun*, *Rules of Play*, *Characteristics of Games*
   - Articles on negotiation games (Diplomacy), social deduction (Werewolf/Mafia variants)
   - Research on emergent gameplay and player interaction design
   - Studies on competitive vs. cooperative game dynamics

5. **System Dynamics & Modeling:**
   - **John Sterman, *Business Dynamics: Systems Thinking and Modeling for a Complex World*** (2000) - definitive text on system dynamics
   - Literature on modeling complex adaptive systems
   - Agent-based modeling for social simulation
   - Game theory applications to multi-stakeholder scenarios
   - Research on AI/LLM-augmented simulations
   - Domain-agnostic frameworks: Elinor Ostrom's IAD (Institutional Analysis & Development) framework
   - Systems dynamics modeling (Peter Senge, Donella Meadows)
   - Feedback loop modeling: reinforcing loops, balancing loops, delays

6. **Meta-Game Design & Scenario Creation:**
   - How tabletop RPG systems balance core rules vs. scenarios (D&D, Powered by the Apocalypse systems)
   - Game creation platforms: How do Minecraft, Roblox, Dreams balance constraint vs. creativity?
   - Scenario authoring tools for crisis simulations
   - Modding communities and user-generated content ecosystems
   - Academic work on "possibility spaces" and game design constraints
   - Professional TTX scenario development workflows and methodologies

7. **Theory of Change & Impact Measurement:**
   - Academic literature on serious games and learning outcomes
   - Program evaluation frameworks for educational interventions
   - Theory of change methodologies (W.K. Kellogg Foundation, others)
   - Validated instruments for measuring systems thinking, governance literacy, policy reasoning
   - Meta-analyses of game-based learning effectiveness
   - Impact evaluation case studies from TTX programs

### Research Approach

1. **Literature Review**: Synthesize findings from academic papers, military doctrine, practitioner reports, and game design theory

2. **Case Study Analysis**: Deep-dive into 3-5 exemplar TTX systems (military, policy, and serious games) to identify design patterns

3. **Design Principles Extraction**: Distill findings into actionable principles for educational TTX design

4. **Application to AI Governance**: Translate general principles to specific recommendations for our domain

5. **Generalization Check**: Ensure recommendations work across multiple scenario types (AI, cybersecurity, climate, public health, etc.)

---

## Expected Deliverables

Please structure your research report as follows:

### 1. Executive Summary (2-3 pages)
- Key findings on what makes TTX effective for strategy education
- Top 5-10 design principles derived from literature
- High-level recommendations for Simulacra redesign

### 2. Literature Review by Domain (20-30 pages)

**A. Military & Government TTX Best Practices**
- Historical evolution of TTX methodology
- Standard frameworks (HSEEP, NATO, DoD)
- Key design elements: phases, roles, facilitation, adjudication
- Examples of highly successful exercises
- Common pitfalls and lessons learned

**B. Educational Serious Games & Policy Simulations**
- AI 2027 Futures Project and similar initiatives (structure, methodology, outcomes)
- Academic policy simulation programs
- Successful serious games for teaching complex systems
- Research on learning outcomes from game-based education
- **Case studies on accessibility vs. depth**:
  - How does SimCity/The Sims balance casual play and serious simulation?
  - How does Civilization handle difficulty modes and complexity scaling?
  - How do business simulations serve both students and executives?
  - Democracy game's approach to complexity levels

**C. Game Design Foundations**
- Information architecture principles (perfect/hidden/asymmetric information)
- Incentive structures for multi-stakeholder scenarios
- Player interaction mechanics (negotiation, coalition-building, etc.)
- Balancing competition and cooperation
- Replayability and skill progression design

**D. World Modeling & Meta-Game Architecture**
- **Universal abstractions**: Domain-agnostic state variables and mechanics
  - What state variables generalize across crisis types? (trust, resources, information, time, relationships, capabilities)
  - What causal patterns are universal?
  - What game mechanics work across domains?
- **Constraint vs. free-form balance**:
  - Fixed framework elements vs. configurable parameters
  - How do RPG systems, game creation platforms, and modding ecosystems handle this?
  - Examples: D&D core rules vs. campaigns, Minecraft blocks vs. creations, Roblox engine vs. experiences
- **Scenario specification and authoring**:
  - How do professional TTX designers create scenarios?
  - What tools and workflows exist for scenario authorship?
  - How to validate scenario quality and balance?
- **Simulation approaches**:
  - Simulation fidelity trade-offs (detail vs. playability)
  - Causal modeling approaches for socio-technical systems
  - Deterministic vs. probabilistic outcome generation
- **LLM integration strategies**:
  - Hybrid models: structured state + LLM narrative layer
  - How to ensure LLM respects game rules
  - Human oversight requirements

**E. Theory of Change & Impact Measurement**
- Theory of change frameworks for educational games
- Learning objectives taxonomy (knowledge, skills, attitudes)
- Measurement methodologies: pre/post tests, behavioral analysis, self-report, qualitative
- Validated instruments for systems thinking and governance literacy
- Attribution challenges and validity threats
- Case studies of impact evaluation from TTX programs
- Meta-analyses on game-based learning effectiveness

**F. User Experience & Interface Design**
- Cognitive load management for strategic decision-making
- Information presentation patterns for complex scenarios
- Post-game analysis and debriefing tools
- Accessibility and scalability considerations

### 3. Design Principles Framework (5-10 pages)

Synthesize findings into a structured framework of TTX design principles, organized by:
- **Pedagogical Principles**: What supports learning? What instructional design elements enhance knowledge transfer?
- **Engagement Principles**: What maintains player interest and motivation?
- **Simulation Principles**: What creates believable, meaningful scenarios?
- **Interaction Principles**: What drives productive player engagement?
- **Measurement Principles**: How do we assess learning outcomes and validate impact?

For each principle:
- State the principle clearly
- Cite supporting evidence from literature
- Provide examples of implementation
- Note trade-offs or tensions with other principles

**Special Focus**: Include a clear articulation of theory of change - the causal pathway from game mechanics → player experience → learning outcomes → real-world impact

### 4. Recommendations for Simulacra (10-15 pages)

Apply the design principles to specific recommendations for our project:

**A. Core Game Architecture**
- Should we fundamentally restructure phases, roles, or turn structure?
- What elements from our current design should we keep vs. replace?
- How should we adapt military/government TTX models for digital, AI-driven context?
- **How do we serve two fundamentally different audiences?**
  - Should we have separate modes (Awareness Mode vs. Training Mode)?
  - Progressive complexity (start simple, unlock depth)?
  - Difficulty settings (like Civilization)?
  - Separate games entirely?
  - Modular design (core + advanced features)?

**B. Multiplayer Design**
- How should human-vs-human gameplay work?
- What information should be shared vs. hidden?
- What communication and negotiation mechanics?
- How do we prevent metagaming while encouraging strategic play?

**C. Simulation Model & Meta-Game Architecture**
- **Universal abstractions**: What state variables and mechanics should be domain-agnostic?
  - What's common across all crisis scenarios? (trust, resources, information, time pressure, etc.)
  - What causal relationships are universal?
  - What game mechanics generalize across domains?
- **Constraint vs. free-form balance**:
  - What should be fixed (core game engine) vs. configurable (scenario parameters)?
  - How much freedom should scenario creators have?
  - What boundaries ensure scenarios remain educational?
- **Scenario specification framework**:
  - What does a "scenario definition" data structure look like?
  - What can be procedurally generated vs. must be authored?
  - What parameters should be exposed to creators?
- **Hybrid LLM + structured model**:
  - Should we combine explicit world state with LLM narrative layer?
  - How do we ensure LLM respects game rules and state?
  - What level of simulation fidelity is appropriate?
- How should we structure scenario progression and escalation?
- How do we balance player agency with narrative coherence?

**D. Learning & Progression**
- How should onboarding and difficulty scaling work?
- What analytics and feedback support skill development?
- How do we structure debriefing/reflection to maximize learning transfer?
- Should there be meta-progression across games?

**E. Generalization to Custom Scenarios**
- What framework elements must be scenario-agnostic?
- How can facilitators/users configure scenarios?
- What AI-generated vs. human-authored content balance?

**F. Theory of Change & Impact Measurement**
- **Articulate our theory of change**: What is the causal pathway from gameplay to impact?
  - What specific learning outcomes should we target (knowledge, skills, attitudes)?
  - What game mechanics and design elements produce those outcomes?
  - What assumptions are we making about how learning happens?
- **Core takeaways**: What should a player walk away understanding after one session?
- **Measurement strategy**:
  - What metrics should we track to validate the game is working?
  - What in-game analytics reveal learning vs. just engagement?
  - What external assessments (pre/post tests, surveys) are worth implementing?
  - How can we build measurement into the experience without disrupting it?
- **Validation approach**: How do we know we're teaching the right lessons?

**G. UI/UX Priorities**
- What interface elements are critical for educational value?
- How should information be presented to support strategic thinking?
- What post-game analysis tools are essential?

### 5. Implementation Roadmap (3-5 pages)

**Prioritization Matrix:**
- **High Impact / Low Effort**: Quick wins to implement first
- **High Impact / High Effort**: Strategic investments for major improvements
- **Low Impact / Low Effort**: Nice-to-haves
- **Low Impact / High Effort**: Avoid or deprioritize

**Known Trade-offs:**
- Realism vs. playability
- Transparency vs. strategic depth
- Simplicity vs. richness
- Guided experience vs. open exploration
- Single-player accessibility vs. multiplayer depth

**Technical Considerations:**
- What is feasible with LLM-based content generation?
- Where is human authorship or oversight necessary?
- What can be automated vs. requires manual facilitation?

### 6. Generalization Analysis (2-3 pages)

Demonstrate how recommendations apply across scenario types:
- AI governance and safety
- Cybersecurity incident response
- Climate crisis and environmental policy
- Public health emergencies
- Financial crisis management
- Any other crisis domains

What elements are domain-specific vs. domain-agnostic?

---

## Success Criteria for Recommendations

Your recommendations should optimize for:

### Educational Impact (Primary Goal)
- Players develop accurate mental models of multi-stakeholder governance dynamics
- Understanding of how individual incentives interact with collective welfare
- Recognition of trade-offs, second-order effects, and unintended consequences
- Transfer of learning to real-world policy thinking

### Engagement & Motivation
- Experience is compelling enough that players want to complete scenarios
- High replay value with meaningful variation
- Appropriate balance of challenge and accessibility
- Emotional investment in outcomes

### Authenticity & Realism
- Scenarios reflect real-world complexity without becoming overwhelming
- Decisions feel meaningful and consequential
- Outcomes are plausible and internally consistent
- Avoids oversimplification or didacticism

### Scalability & Flexibility
- Works for solo play, small groups, and larger cohorts
- Supports both facilitated and self-directed experiences
- Accessible to novices, engaging for experts
- Generalizes across multiple crisis domains

### Practical Feasibility
- Can be implemented with current LLM technology
- Reasonable development effort for small team
- Sustainable to maintain and update
- Can scale technically for broader usage

---

## Context for Your Research

### Target Audiences

We have **two primary audiences with fundamentally different needs**:

#### Audience 1: General Public (Awareness)
- **Who**: Anyone interested in understanding AI governance and policy
- **Current knowledge**: Little to no background in policy or governance
- **Time commitment**: 20-40 minutes
- **Goal**: Awareness, engagement, memorable high-level insights
- **Success metric**: "Wow, governance is more complex than I thought!"

#### Audience 2: Policymakers & Decision-Makers (Training)
- **Who**: Policy students, AI safety researchers, governance professionals, organizational leaders
- **Current knowledge**: Moderate to high policy/governance background
- **Time commitment**: 1-2 hours, willing to replay and analyze
- **Goal**: Develop sophisticated mental models, practice decision-making skills
- **Success metric**: "This helped me think through trade-offs I'll face in my work"

#### Secondary Audiences
- Educators looking for classroom tools (serve both above audiences)
- Organizations running internal training (primarily Audience 2)

### Usage Contexts
- **Self-directed learning**: Individuals exploring governance concepts on their own
- **Classroom integration**: Structured discussions before/after gameplay
- **Organizational training**: Companies, government agencies, NGOs running scenario planning
- **Public engagement**: Events, exhibits, awareness campaigns

### Current Gaps to Address
- **No theoretical foundation** from established TTX literature
- **No articulated theory of change**: Unclear causal pathway from gameplay to learning to real-world impact
- **No impact measurement**: Don't know how to assess if players are actually learning what we intend
- **Dual-audience challenge unresolved**: Don't know how to serve both general public (engagement) and policymakers (depth)
- **World modeling approach unclear**: Should we use explicit system dynamics models or pure LLM narrative?
- Unclear whether our structure (roles, rounds, scoring) is pedagogically optimal
- Single-player only (vs. multiplayer collaboration/competition)
- Limited debriefing and reflection tools
- Uncertain how to balance engagement vs. educational rigor
- Unknown best practices for LLM-driven facilitation vs. human oversight
- **Core takeaway undefined**: What exactly should players walk away understanding?
- **Meta-game architecture undefined**: What should be fixed vs. configurable for scenario creators?

### Constraints & Considerations
- Small development team (1-3 developers)
- Must remain web-based and accessible
- LLM costs must be reasonable at scale
- Cannot require extensive human facilitation for every session
- Must work across diverse scenario types (AI governance, cybersecurity, climate, etc.)
- Open to fundamental redesign if evidence supports it

---

## Final Notes

We want this research to be **comprehensive and evidence-based**, not constrained by our current implementation. If the literature suggests we should fundamentally rethink our approach, we want to know.

Key areas where we're especially uncertain:

**1. Dual-Audience Challenge (CRITICAL)**
- How do we serve general public (needs engagement, simplicity) AND policymakers (needs depth, realism)?
- Should we build:
  - Two separate experiences?
  - One game with difficulty modes (like Civilization)?
  - Progressive complexity (unlock depth over time)?
  - Modular features (core + advanced)?
- How do successful games/simulations handle this? (SimCity's accessibility vs. complexity; Democracy game's modes)

**2. Theory of Change**
- What is the actual causal pathway from playing our game to understanding AI governance?
- What assumptions are we making?
- For general public: What 2-3 key insights should they leave with?
- For policymakers: What specific skills/mental models should they develop?

**3. Core Learning Outcomes**
- What specifically should players learn? Domain knowledge (AI governance) or transferable skills (systems thinking)?
- How do we teach feedback loops, delays, unintended consequences?
- What's the role of counterfactual thinking?

**4. Impact Measurement**
- How do we validate that the game is effective? What metrics matter?
- Different metrics for different audiences?

**5. Meta-Game Architecture**
- We're building a framework that lets people create scenarios across domains (AI, cyber, climate, etc.)
  - What abstractions work across all crisis types?
  - What should be fixed vs. configurable?
  - How do we balance creative freedom with maintaining educational value?
  - What does "scenario specification" look like?

**6. World Modeling Approach**
- Should we use explicit system dynamics models (Sterman's approach) or trust LLM narrative generation? Or a hybrid?
- How do we represent feedback loops, delays, non-linearities?
- How much should we model explicitly vs. leave to LLM?

**7. Game Structure**
- Is turn-based action selection the right model, or should we look at seminar-style, free-form negotiation, or other formats?
- How much human facilitation should be required vs. fully automated?
- What is the optimal group size and player interaction model?

**8. Core Takeaway**
- If we could only teach players one thing, what should it be?
- Different for different audiences?

Your research will directly inform our roadmap for the next 6-12 months of development. Thank you for your thorough analysis!

---

## References & Starting Points

To help you get started, here are some initial references we've found valuable:

**Military & Government TTX:**
- Peter Perla, *The Art of Wargaming* (1990)
- RAND Corporation wargaming resources: https://www.rand.org/topics/wargaming.html
- HSEEP guidelines: https://www.fema.gov/emergency-managers/national-preparedness/exercises/hseep

**AI Governance TTX:**
- AI 2027 Futures Project: https://www.ai2027.com/
- Center for Security and Emerging Technology (CSET) scenario planning work

**Serious Games & Learning:**
- Clark Abt, *Serious Games* (1970)
- James Paul Gee, *What Video Games Have to Teach Us About Learning and Literacy* (2003)
- Research from Games for Change: https://www.gamesforchange.org/

**Game Design Theory:**
- Salen & Zimmerman, *Rules of Play* (2003)
- Hunicke, LeBlanc, Zubek, "MDA: A Formal Approach to Game Design and Game Research" (2004)

**World Modeling & Meta-Game Design:**
- **John Sterman, *Business Dynamics: Systems Thinking and Modeling for a Complex World*** (2000)
- **Will Wright and The Sims/SimCity**: Research on his design philosophy, emergent gameplay, accessible simulation
  - "The Sims: A Simulation Game of Emergent Complexity"
  - GDC talks and interviews on simulation design
  - How simple rules create complex, believable behavior
- Elinor Ostrom, *Governing the Commons* (1990) and IAD framework
- Donella Meadows, *Thinking in Systems: A Primer* (2008)
- Peter Senge, *The Fifth Discipline* (1990) - systems thinking
- Tabletop RPG design: *Powered by the Apocalypse* design framework, Vincent Baker's *Dogs in the Vineyard*
- Game creation platforms: Research on Minecraft, Roblox, Dreams, LittleBigPlanet modding ecosystems
- Jesse Schell, *The Art of Game Design* (2008) - constraints and possibility spaces
- Academic work on user-generated content and modding communities

**Theory of Change & Impact Measurement:**
- W.K. Kellogg Foundation, *Logic Model Development Guide* (2004)
- ActKnowledge & Aspen Institute, *Theory of Change* resources
- Kurt Squire, research on game-based learning and educational games
- *Assessment in Game-Based Learning* by Dirk Ifenthaler et al. (2012)
- Academic journals: *Journal of Educational Psychology*, *Learning and Instruction*
- Systems thinking assessment tools (e.g., Richmond's systems thinking assessments)

These are just starting points - please explore broadly and follow promising leads!

---

## Summary: Core Questions on World Modeling Abstractions

Given that we're building a **meta-game framework** for creating crisis scenarios across domains, please give special attention to:

### 1. Universal State Variables
What state variables generalize across all crisis scenarios?
- Public trust/confidence/legitimacy
- Stakeholder resources (political capital, funding, influence, attention)
- Information states (known, hidden, uncertain)
- Time pressure and urgency
- Institutional relationships and power dynamics
- Media/public attention
- Technical/operational capabilities
- What else?

### 2. Universal Game Mechanics
What mechanics work across domains?
- Resource allocation and action costs
- Information revelation and discovery
- Coordination and negotiation
- Trade-offs between individual vs. collective objectives
- Escalation and de-escalation dynamics
- What else?

### 3. Fixed vs. Configurable
What should be **hard-coded** (core engine):
- Turn structure and phases?
- Action point systems?
- Score calculation methods?
- Information flow rules?
- Certain state variables that always exist?

What should be **configurable** (per scenario):
- Roles and objectives?
- Starting conditions?
- Event templates?
- Victory conditions?
- Specific metrics (beyond core ones)?
- Narrative flavor and domain context?

### 4. Constraint vs. Creative Freedom
How do we prevent scenarios that:
- Are unbalanced or unwinnable?
- Don't teach anything meaningful?
- Break game mechanics or incentives?
- Are too simple or too complex?

While still allowing:
- Diverse crisis domains and contexts
- Creative scenario design
- Experimentation with different structures
- Facilitator customization

### 5. Scenario Specification
What does a "scenario definition" data structure look like?
- JSON/YAML schema?
- What fields are required vs. optional?
- What can be procedurally generated by LLM vs. must be authored?
- How do we make authorship accessible to non-programmers?

### 6. Examples to Study
Please examine how these handle fixed vs. configurable:
- **D&D**: Core rules (fixed) vs. campaign modules (configurable)
- **Powered by the Apocalypse RPGs**: Playbooks (fixed structure) vs. moves (customizable)
- **Minecraft**: Block physics (fixed) vs. what you build (free)
- **Roblox**: Engine capabilities (fixed) vs. experiences (user-created)
- **Military TTX platforms**: What's standardized vs. what scenario designers control?

Your insights on these questions will be crucial for our architecture decisions. Thank you!
