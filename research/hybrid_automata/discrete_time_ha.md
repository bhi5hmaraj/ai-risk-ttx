# Discrete-Time Hybrid Automata: Formal Foundation for Macro Modeling

**TL;DR**: Hybrid automata with difference equations instead of differential equations. A well-established formalism perfect for month-by-month macro AI governance models.

**Status**: Not a bespoke hack - this is a real, studied formalism in the hybrid systems literature.

---

## What is a Discrete-Time Hybrid Automaton?

**Intuition**: Combine discrete modes (baseline, race, crisis) with continuous state variables (compute, trust, alignment) that update via **difference equations** at discrete time steps.

**Formal Definition**:

A **discrete-time hybrid automaton** (DTHA) is a tuple:
$$\mathcal{H}_d = (Q, X, U, \Xi, \text{Init}, F, G, R)$$

Where:
- $Q$: Finite set of **modes** (discrete states)
  - Example: $Q = \{\text{Baseline}, \text{Race}, \text{Slowdown}, \text{Catastrophe}, \text{Aligned}\}$

- $X \subseteq \mathbb{R}^n$: **Continuous state space**
  - Example: $X = \mathbb{R}^3$ for $(c, a, t) =$ (compute, alignment, trust)

- $U$: **Input/action space**
  - Example: Policy decisions, player actions

- $\Xi$: **Exogenous shock space**
  - Example: Random incidents, breakthroughs

- $\text{Init} \subseteq Q \times X$: **Initial states**
  - Example: $\text{Init} = \{(\text{Baseline}, (26.0, 0.15, 0.70))\}$

- $F = \{f_q : X \times U \times \Xi \to X \mid q \in Q\}$: **Difference equations** for each mode
  - Example: In Race mode, $f_{\text{Race}}(x_k, u_k, \xi_k) = x_k + \Delta t \cdot g(x_k, u_k)$

- $G = \{g_e : X \to \{0, 1\} \mid e \in E\}$: **Guard conditions** for transitions
  - Example: $g_{\text{baseline} \to \text{race}}(x) = \mathbb{1}[c > 26.5 \land t < 0.6]$

- $R = \{r_e : X \to X \mid e \in E\}$: **Reset maps** (state jumps on transition)
  - Example: $r_e(x) = x$ (often identity, but can reset variables)

**Execution Semantics**:

At each tick $k$:
1. **Continuous update**: $x_{k+1}' = f_{q_k}(x_k, u_k, \xi_k)$ (apply mode-specific difference equation)
2. **Guard check**: Find enabled transitions $E_k = \{e \in E \mid g_e(x_{k+1}') = 1\}$
3. **Mode transition** (if guards satisfied):
   - Pick transition $e^* \in E_k$ (by priority or nondeterministically)
   - Update mode: $q_{k+1} = \text{target}(e^*)$
   - Apply reset: $x_{k+1} = r_{e^*}(x_{k+1}')$
4. **Else**: Stay in mode: $q_{k+1} = q_k$, $x_{k+1} = x_{k+1}'$

---

## Comparison to Continuous-Time Hybrid Automata

| Feature | Continuous-Time HA | Discrete-Time HA |
|---------|-------------------|------------------|
| **Time** | $t \in \mathbb{R}_{\geq 0}$ | $k \in \mathbb{N}$ (ticks) |
| **Dynamics** | $\dot{x} = f_q(x)$ (ODEs) | $x_{k+1} = f_q(x_k)$ (difference eqs) |
| **Evolution** | Integrate ODEs between events | Step forward by $\Delta t$ |
| **Transitions** | Triggered by guards, can happen anytime | Checked at each tick boundary |
| **Timing** | Exact event times matter | Events happen "during" tick $k$ |
| **Zeno behavior** | Possible (infinitely many transitions in finite time) | Impossible (max 1 transition per tick) |
| **Verification** | Reachability often undecidable | More tractable (discrete abstraction) |
| **Tools** | HyTech, PHAVer, SpaceEx | UPPAAL (discrete-time variant), Stateflow |
| **Use case** | Physical systems, embedded control | Macro models, sampled control, planning |

**When to use discrete-time**:
- Natural decision rhythm is discrete (monthly policies, quarterly budgets)
- Intra-tick dynamics don't matter (macro effects dominate)
- Want simpler analysis (no ODE integration, no Zeno issues)
- Monte Carlo simulation is primary analysis method

---

## Why Discrete-Time HA for Macro AI Governance?

### 1. Natural Modeling Granularity

**Macro decision rhythms are discrete**:
- Government policies: Monthly/quarterly updates
- Corporate strategy: Quarterly earnings, annual budgets
- International treaties: Negotiation rounds (months/years)
- Public opinion: Polling cycles, election cycles

**Mismatch with continuous time**:
- ODEs suggest infinitesimal decisions (unrealistic for policy)
- Zeno behavior (infinitely many regime changes) is artifact, not feature
- Intra-month dynamics rarely matter for decade-scale projections

**Fit with discrete time**:
- $\Delta t = 1$ month matches decision granularity
- One state update per policy cycle
- No Zeno behavior (by construction)

### 2. Computational Advantages

**Discrete-time is faster**:
- No ODE integration (Runge-Kutta, adaptive step size)
- Simple forward Euler: $x_{k+1} = x_k + \Delta t \cdot f(x_k)$
- Or direct difference equation: $x_{k+1} = A x_k + B u_k$

**Enables Monte Carlo at scale**:
- 1000 runs × 120 ticks = 120,000 state updates
- With ODEs: Each requires ~10-100 integration substeps
- With difference eqs: Direct computation (10-100x speedup)

**Parallel-friendly**:
- Each MC run is independent
- No shared ODE solver state
- Linear scaling on multi-core

### 3. Theoretical Justification

**Sampling theorem perspective**:
- If underlying continuous dynamics have time constant $\tau$
- Sample at $\Delta t \ll \tau$ → Discrete approximation is accurate
- For AI governance: $\tau \sim$ months to years, $\Delta t =$ 1 month is fine

**Discrete-time HA as abstraction**:
- Start with continuous-time HA (if you want)
- Sample at fixed rate $\Delta t$
- Result: Discrete-time HA (well-defined mathematical operation)
- Literature: Oehlerking (2007), Althoff et al. (2008)

---

## Special Cases: MLD and PWA Systems

### Mixed Logical Dynamical (MLD) Systems

**Definition** (Bemporad & Morari, 1999):

MLD systems are discrete-time hybrid systems with:
- **Linear dynamics** in each mode: $x_{k+1} = A_q x_k + B_q u_k + E_q \xi_k$
- **Logical constraints** on mode transitions: Encoded as mixed-integer linear inequalities

**Canonical form**:
$$
\begin{align}
x_{k+1} &= A x_k + B_1 u_k + B_2 \delta_k + B_3 z_k \\
y_k &= C x_k + D_1 u_k + D_2 \delta_k + D_3 z_k \\
E_2 \delta_k + E_3 z_k &\leq E_1 u_k + E_4 x_k + E_5
\end{align}
$$

Where:
- $\delta_k \in \{0,1\}^{n_\delta}$: Binary logic variables (mode indicators)
- $z_k \in \mathbb{R}^{n_z}$: Auxiliary continuous variables
- Inequalities encode guards and resets

**Key advantage**: Can encode as **Mixed-Integer Program (MIP)**
- Enables optimal control synthesis (MILP / MIQP)
- Well-supported solvers (Gurobi, CPLEX)
- Predictive control for hybrid systems

**Example: AI-2027 as MLD**

Modes as binary variables:
$$
\delta_k = [\delta_{\text{baseline}}, \delta_{\text{race}}, \delta_{\text{slowdown}}]^T \in \{0,1\}^3
$$

Dynamics:
$$
x_{k+1} = A_{\text{baseline}} x_k \cdot \delta_{\text{baseline}} + A_{\text{race}} x_k \cdot \delta_{\text{race}} + \ldots + B u_k
$$

Guards as linear inequalities:
$$
\begin{align}
\delta_{\text{race}} = 1 &\implies c_k > 26.5 \land t_k < 0.6 \\
&\iff \text{Linear inequalities on } (c_k, t_k, \delta_{\text{race}})
\end{align}
$$

**When to use MLD**:
- Want optimal control (MILP)
- Dynamics are roughly linear in each mode
- Guards are linear inequalities
- Have good MIP solver

---

### Piecewise Affine (PWA) Systems

**Definition**:

PWA systems partition state space into **polyhedral regions** $\{R_i\}$, with affine dynamics in each region:
$$
x_{k+1} = A_i x_k + B_i u_k + c_i \quad \text{if } x_k \in R_i
$$

Where $R_i = \{x \mid H_i x \leq K_i\}$ (polyhedron)

**Relation to DTHA**:
- PWA is DTHA where modes correspond to polyhedral regions
- Guards are boundary crossings between regions
- Resets are typically identity (continuous across boundaries)

**Example: AI-2027 as PWA**

Partition state space $(c, a, t)$ into regions:
$$
\begin{align}
R_{\text{baseline}} &= \{(c, a, t) \mid c \leq 26.5 \lor t \geq 0.6\} \\
R_{\text{race}} &= \{(c, a, t) \mid c > 26.5 \land t < 0.6 \land (a \geq 0.15 \lor c \leq 28)\} \\
R_{\text{catastrophe}} &= \{(c, a, t) \mid c > 28 \land a < 0.15\}
\end{align}
$$

Dynamics in each region:
$$
x_{k+1} = A_{\text{baseline}} x_k + B u_k \quad \text{if } x_k \in R_{\text{baseline}}
$$

**When to use PWA**:
- State space naturally partitions into polyhedral regions
- Dynamics are affine (or approximately so)
- Want to leverage convex optimization / polytope tools

**Tools**: MPT (Multi-Parametric Toolbox) in MATLAB

---

## Example: AI-2027 as Discrete-Time HA

### Formal Specification

**Modes**:
$$Q = \{\text{Baseline}, \text{Race}, \text{Slowdown}, \text{Catastrophe}, \text{Aligned}\}$$

**State variables** ($X = \mathbb{R}^3$):
$$x_k = (c_k, a_k, t_k) = (\text{compute}, \text{alignment}, \text{trust})$$

**Difference equations** (mode-specific):

**Baseline mode**:
$$
\begin{align}
c_{k+1} &= c_k + \alpha_{\text{base}} \cdot c_k + u_k^c \\
a_{k+1} &= a_k + \beta \cdot (1 - a_k) \\
t_{k+1} &= \max(0, t_k - \gamma_{\text{base}})
\end{align}
$$

**Race mode**:
$$
\begin{align}
c_{k+1} &= c_k + \alpha_{\text{race}} \cdot c_k + u_k^c \quad (\alpha_{\text{race}} > \alpha_{\text{base}}) \\
a_{k+1} &= a_k + 0.5 \beta \cdot (1 - a_k) \quad \text{(slower alignment progress)} \\
t_{k+1} &= \max(0, t_k - \gamma_{\text{race}}) \quad (\gamma_{\text{race}} > \gamma_{\text{base}})
\end{align}
$$

**Slowdown mode**:
$$
\begin{align}
c_{k+1} &= c_k + 0.5 \alpha_{\text{base}} \cdot c_k + u_k^c \quad \text{(slower compute growth)} \\
a_{k+1} &= a_k + 1.5 \beta \cdot (1 - a_k) \quad \text{(faster alignment)} \\
t_{k+1} &= \min(1, t_k + 0.02) \quad \text{(trust rebuilding)}
\end{align}
$$

**Catastrophe & Aligned** (absorbing):
$$
x_{k+1} = x_k \quad \text{(no change)}
$$

**Guards** (transition conditions):

$$
\begin{align}
g_{\text{baseline} \to \text{race}}(x) &= \mathbb{1}[c > 26.5 \land t < 0.6] \\
g_{\text{baseline} \to \text{slowdown}}(x) &= \mathbb{1}[a > 0.4 \land t > 0.75] \\
g_{\text{race} \to \text{catastrophe}}(x) &= \mathbb{1}[a < 0.15 \land c > 28] \\
g_{\text{race} \to \text{slowdown}}(x) &= \mathbb{1}[\text{incident} \land t > 0.5] \\
g_{\text{slowdown} \to \text{aligned}}(x) &= \mathbb{1}[a > 0.7 \land k > 60] \\
g_{\text{slowdown} \to \text{baseline}}(x) &= \mathbb{1}[t < 0.5]
\end{align}
$$

**Resets**: Mostly identity, except:
$$
r_{\text{baseline} \to \text{race}}(c, a, t) = (c, a, t)  \quad \text{(identity)}
$$

Could add resets like:
$$
r_{\text{race} \to \text{slowdown}}(c, a, t) = (c, a, \min(t + 0.1, 1))  \quad \text{(trust bump from coordination)}
$$

**Initial state**:
$$
\text{Init} = \{(\text{Baseline}, (26.0, 0.15, 0.70))\}
$$

---

### Simulation Algorithm

```python
def simulate_dtha(initial_state, horizon, params):
    """
    Simulate discrete-time hybrid automaton

    Args:
        initial_state: (mode, x) tuple
        horizon: Number of ticks
        params: Dictionary of parameters (alpha, beta, gamma, etc.)

    Returns:
        trajectory: List of (mode, x) tuples
    """
    mode, x = initial_state
    trajectory = [(mode, x)]

    for k in range(horizon):
        # 1. Apply mode-specific dynamics
        x_next = apply_difference_equation(mode, x, params)

        # 2. Check guards
        enabled_transitions = [
            (target_mode, reset)
            for (source, target, guard, reset) in transitions
            if source == mode and guard(x_next)
        ]

        # 3. Take transition (if any)
        if enabled_transitions:
            # Priority: catastrophe > aligned > others
            mode_next, reset_func = select_transition(enabled_transitions)
            x_next = reset_func(x_next)
        else:
            mode_next = mode

        # 4. Record and continue
        trajectory.append((mode_next, x_next))
        mode, x = mode_next, x_next

    return trajectory

def apply_difference_equation(mode, x, params):
    """Mode-specific difference equations"""
    c, a, t = x
    alpha, beta, gamma = params['alpha'][mode], params['beta'], params['gamma'][mode]

    c_next = c + alpha * c
    a_next = a + beta * (1 - a)
    t_next = max(0, min(1, t - gamma))

    return (c_next, a_next, t_next)
```

---

## Stochastic Discrete-Time Hybrid Automata (SDTHA)

**Extension**: Add randomness

**Three sources of stochasticity**:

### 1. Stochastic Transitions (Probabilistic Guards)

Instead of deterministic guard:
$$
g_e(x) = \mathbb{1}[\text{condition}]
$$

Use probabilistic transition:
$$
\mathbb{P}(\text{transition } e \mid x) = p_e(x)
$$

**Example**: Race → Catastrophe with probability depending on alignment
$$
\mathbb{P}(\text{race} \to \text{catastrophe} \mid a) = 0.05 \cdot \exp(-10a)
$$

### 2. Stochastic Dynamics (Process Noise)

Add noise to difference equations:
$$
x_{k+1} = f_q(x_k, u_k) + \xi_k
$$

Where $\xi_k \sim \mathcal{N}(0, \Sigma_q)$ (Gaussian noise)

**Example**: Compute growth with noise
$$
c_{k+1} = c_k + \alpha c_k + \epsilon_k \quad \text{where } \epsilon_k \sim \mathcal{N}(0, 0.1^2)
$$

### 3. Parameter Uncertainty (Epistemic)

Parameters are drawn from distributions:
$$
\theta \sim p(\theta)
$$

Fixed for one run, varied across Monte Carlo runs.

**Example**: Growth rate uncertain
$$
\alpha_{\text{race}} \sim \text{Uniform}(0.15, 0.25)
$$

**Full SDTHA**:
- Outer loop (Monte Carlo): Sample $\theta \sim p(\theta)$
- Inner loop (per run): Apply stochastic transitions and process noise

This is exactly what our Monte Carlo framework does!

---

## Literature and Tools

### Key Papers

**Discrete-Time Hybrid Systems**:
- **Oehlerking (2007)**: "Decomposition of stability proofs for hybrid systems" - Explicitly defines discrete-time hybrid automata
- **Bemporad & Morari (1999)**: "Control of systems integrating logic, dynamics, and constraints" - MLD systems
- **Heemels et al. (2001)**: "Equivalence of hybrid dynamical models" - Shows equivalence of MLD, PWA, and other forms

**Verification & Reachability**:
- **Belta & Habets (2006)**: "Controlling a class of nonlinear systems on rectangles" - Discrete-time reachability
- **Alur et al. (2000)**: "Discrete abstractions of hybrid systems" - Abstraction-based verification

**Control Synthesis**:
- **Mayne & Raković (2003)**: "Model predictive control of constrained piecewise affine discrete-time systems" - MPC for PWA
- **Borrelli (2003)**: "Constrained optimal control of linear and hybrid systems" - Optimal control for discrete-time HA

### Tools

**Discrete-Time Hybrid System Modeling**:
- **HYSDEL**: High-level language → compiles to MLD form
- **MPT (Multi-Parametric Toolbox)**: PWA systems, MPC, reachability in MATLAB
- **Stateflow** (MATLAB): Discrete-time hybrid automata, widely used in automotive/aerospace

**Verification**:
- **UPPAAL** (discrete-time mode): Model checking for timed automata with discrete time
- **SpaceEx** (discrete-time scenarios): Reachability for hybrid systems

**Our Stack** (custom Python):
- Direct implementation of discrete-time HA
- Monte Carlo wrapper for stochasticity
- Integration with LLM-driven narrative (Simulacra)

---

## Advantages for AI Governance Modeling

### 1. **Transparency**

**Discrete-time is more intuitive**:
- "Each month, state updates according to..."
- No ODE integration artifacts
- Direct correspondence with real decision cycles

**Stakeholder communication**:
- Policymakers think in discrete cycles (quarterly reports, annual budgets)
- "Month 24: Race mode triggered" clearer than "$t = 23.47$ days"

### 2. **Computational Efficiency**

**Fast simulation**:
- 120 ticks (10 years, monthly) = 120 simple state updates
- vs continuous HA: 120 ODE integration intervals × 10-100 substeps = 1200-12000 evaluations

**Enables Monte Carlo**:
- 1000 runs × 120 ticks = 120,000 state updates (milliseconds)
- Parallelizes trivially

### 3. **Easier Analysis**

**Discrete abstractions natural**:
- State space is already "semi-discrete" (modes + discretized continuous vars)
- Reachability analysis more tractable
- Can use MIP solvers for control synthesis (if MLD form)

**Monte Carlo + Sensitivity**:
- No ODE solver numerical errors to worry about
- Sensitivity analysis simpler (direct parameter → output mapping)

### 4. **Matches Domain**

**Macro AI governance is inherently discrete**:
- Policy updates: Monthly/quarterly
- Treaties: Negotiation rounds (weeks/months)
- Corporate decisions: Board meetings (quarterly)
- Public opinion: Polling cycles

**Forcing continuous time is artificial**:
- Suggests decision-makers react infinitesimally fast (unrealistic)
- Introduces Zeno issues that don't exist in reality

---

## Design Choices for AI-2027

### Time Quantum: $\Delta t = 1$ month

**Rationale**:
- Policy cycle: Monthly → quarterly updates
- Horizon: 10 years = 120 ticks (reasonable)
- Resolution: Sufficient to capture regime transitions

**Too coarse** (e.g., $\Delta t = 1$ year):
- Miss intra-year dynamics (e.g., rapid race escalation)
- 10 ticks insufficient for statistical analysis

**Too fine** (e.g., $\Delta t = 1$ day):
- 3650 ticks for 10 years (slower, more noise)
- False precision (no policy changes daily)

### Difference Equation Form

**Choice**: Explicit forward Euler
$$
x_{k+1} = x_k + \Delta t \cdot f(x_k, u_k)
$$

**Alternatives**:
- **Direct difference equation**: $x_{k+1} = A x_k + B u_k$ (linear)
- **Implicit methods**: More stable but requires solver

**Rationale**: Explicit is simple, sufficient for our smooth macro dynamics

### Mode Transition Logic

**Choice**: Priority-based deterministic guards (baseline) + probabilistic extensions (advanced)

**Priority ordering**:
1. Catastrophe (highest - absorbing state)
2. Aligned (absorbing)
3. Race/Slowdown (reversible)
4. Baseline (default)

**Stochastic extensions**:
- Incident probabilities: $p_{\text{incident}} = 0.02$ per month
- Breakthrough probabilities: $p_{\text{breakthrough}} = 0.05$ per month
- Sample each tick, update state

---

## Integration with Other Formalisms

### Discrete-Time HA + System Dynamics

**SD provides**:
- Macro feedback loops (stocks & flows)
- Parameter calibration from historical data
- Intuitive stock-flow diagrams

**HA adds**:
- Discrete regime changes
- Guards and mode-specific dynamics
- Formal verification (if needed)

**Combination**: Our approach
- Use SD-style difference equations for continuous evolution
- Use HA-style modes and guards for regime changes
- Result: Discrete-time hybrid system

### Discrete-Time HA + Agent-Based Models

**ABM provides**:
- Micro-level heterogeneity
- Emergent macro behavior from agent interactions

**HA provides**:
- Macro state tracking (aggregate compute, trust)
- Regime detection (when does race mode emerge from agent behavior?)

**Combination**: Hierarchical
- ABM at micro level (agent decisions)
- Aggregate to macro state (sum compute, average trust)
- HA mode transitions from macro state
- Macro state feeds back to agents (policy constraints, public trust)

### Discrete-Time HA + Monte Carlo

**MC provides**:
- Uncertainty propagation (parameter distributions)
- Risk quantification (P(catastrophe), time to AGI distribution)
- Sensitivity analysis (which parameters matter)

**HA provides**:
- Structured state space (modes + continuous vars)
- Formal definition for MC simulator

**Combination**: MC as outer loop
- Inner: Discrete-time HA simulator (deterministic or stochastic)
- Outer: Monte Carlo over parameters and shocks
- This is exactly our architecture!

---

## Verification and Analysis

### Reachability Analysis

**Question**: Can we reach Catastrophe mode from Initial state?

**Discrete-time answer**:
- Compute forward reachable set: $\text{Reach}_k = \{x \mid \exists \text{ trajectory of length } k \text{ to } x\}$
- Check: $\text{Catastrophe} \cap \text{Reach}_k \neq \emptyset$ for some $k \leq N$?

**Advantage over continuous-time**: No Zeno behavior, discrete steps

**Tools**:
- MPT for PWA systems
- Custom BFS/DFS for small state spaces
- Monte Carlo for large/continuous spaces (approximate reachability)

### Probabilistic Verification (SDTHA)

**Question**: $\mathbb{P}[\Diamond \text{Catastrophe}] < 0.1$? (Is catastrophe probability < 10%?)

**Methods**:
1. **Statistical Model Checking** (SMC):
   - Run Monte Carlo (N runs)
   - Estimate $\hat{p} = \frac{\# \text{catastrophe runs}}{N}$
   - Check: $\hat{p} + \epsilon < 0.1$ where $\epsilon$ is confidence bound

2. **Discrete-time Markov Chain (DTMC) abstraction**:
   - Discretize continuous state space into grid
   - Build transition matrix $P$
   - Compute exact probabilities (if state space small enough)

**Our approach**: SMC via Monte Carlo (practical for continuous state)

### Optimal Control Synthesis

**Question**: What policy $u_k$ minimizes $\mathbb{P}[\Diamond \text{Catastrophe}]$?

**MLD approach** (if applicable):
- Formulate as MILP: Minimize expected cost subject to MLD constraints
- Solve with Gurobi/CPLEX

**MPC approach**:
- At each tick $k$, solve finite-horizon optimal control
- Apply first control $u_k^*$
- Replan at $k+1$

**Limitations for AI governance**:
- Non-convex objectives (P(catastrophe) not linear in $u$)
- Large state space (difficult for exact MIP)
- Uncertainty in dynamics (robust MPC needed)

**Practical alternative**: Policy search via Monte Carlo
- Parameterize policy: $u = \pi(x; \theta)$
- Evaluate via MC: $J(\theta) = \mathbb{E}[\text{cost}]$ over MC runs
- Optimize $\theta$ (gradient-free: CMA-ES, Bayesian opt)

---

## Comparison to Our Earlier Continuous-Time HA Discussions

**Recall**: We initially discussed continuous-time hybrid automata with ODEs.

**Shift to discrete-time**:

| Aspect | Continuous-Time HA | Discrete-Time HA (Our Choice) |
|--------|-------------------|-------------------------------|
| **Dynamics** | $\dot{x} = f_q(x)$ | $x_{k+1} = f_q(x_k)$ |
| **Rationale** | Physical systems | Macro policy cycles |
| **Verification** | Harder (Zeno, undecidable) | Easier (discrete, no Zeno) |
| **Simulation** | ODE solver needed | Direct forward step |
| **Monte Carlo** | Slow (integration) | Fast (explicit update) |
| **Temporal logic** | MTL, STL | LTL, PLTL (discrete) |
| **Tools** | SpaceEx, PHAVer | UPPAAL, MPT, custom |

**Is discrete-time "giving up" on continuous?**
- **No**: It's a deliberate modeling choice for macro timescales
- **Continuous-time still useful** for physical subsystems (if needed)
- **Discrete-time is standard** for macro socio-economic modeling

---

## Relation to Kripke Structures and LTL

**Kripke structure**: Purely discrete
- States: $S$ (no continuous variables)
- Transitions: $\to$ (labeled with actions/propositions)

**Discrete-time HA**: Hybrid discrete
- States: $Q \times X$ (modes + continuous vars)
- Transitions: Guards + resets

**LTL verification**:
- Define propositions over $(q, x)$: e.g., $p_{\text{safe}} = (q \neq \text{Catastrophe})$
- Check: $\mathcal{H}_d \models \Box p_{\text{safe}}$ (always safe)

**Method**: Abstract continuous state to discrete labels
- Partition $X$ into regions: $X_1, \ldots, X_m$
- Abstract state: $(q, X_i)$
- Result: Finite Kripke structure (can apply LTL model checking)

**Our use case**: Less verification, more exploration
- We care about **distributions** (Monte Carlo), not just yes/no verification
- LTL useful for specifying properties, but MC gives probabilities

---

## Code Example: Minimal Discrete-Time HA Simulator

```python
from dataclasses import dataclass
from typing import Callable, List, Tuple
import numpy as np

@dataclass
class DTHAMode:
    """Mode in discrete-time hybrid automaton"""
    name: str
    dynamics: Callable  # (x, u, params) -> x_next
    transitions: List[Tuple[str, Callable]]  # [(target_mode, guard_fn)]

class DiscreteTimeHA:
    """Discrete-time hybrid automaton simulator"""

    def __init__(self, modes: List[DTHAMode], initial_mode: str, initial_state: np.ndarray):
        self.modes = {m.name: m for m in modes}
        self.current_mode = initial_mode
        self.state = initial_state
        self.trajectory = [(initial_mode, initial_state.copy())]

    def step(self, u, params):
        """Single time step"""
        mode_obj = self.modes[self.current_mode]

        # 1. Apply dynamics
        x_next = mode_obj.dynamics(self.state, u, params)

        # 2. Check guards
        for target_mode, guard in mode_obj.transitions:
            if guard(x_next, params):
                self.current_mode = target_mode
                break  # Take first enabled transition

        # 3. Update state
        self.state = x_next
        self.trajectory.append((self.current_mode, self.state.copy()))

        return self.current_mode, self.state

    def simulate(self, horizon: int, policy: Callable, params):
        """Simulate for horizon steps"""
        for k in range(horizon):
            u = policy(self.state, self.current_mode, k)
            self.step(u, params)

        return self.trajectory

# Example: AI-2027
def baseline_dynamics(x, u, params):
    c, a, t = x
    c_next = c + params['alpha_base'] * c + u['compute_investment']
    a_next = a + params['beta'] * (1 - a)
    t_next = max(0, t - params['gamma_base'])
    return np.array([c_next, a_next, t_next])

def race_dynamics(x, u, params):
    c, a, t = x
    c_next = c + params['alpha_race'] * c + u['compute_investment']
    a_next = a + 0.5 * params['beta'] * (1 - a)  # Slower alignment
    t_next = max(0, t - params['gamma_race'])
    return np.array([c_next, a_next, t_next])

# Guards
def guard_baseline_to_race(x, params):
    c, a, t = x
    return c > 26.5 and t < 0.6

def guard_race_to_catastrophe(x, params):
    c, a, t = x
    return a < 0.15 and c > 28

# Define modes
baseline_mode = DTHAMode(
    name="Baseline",
    dynamics=baseline_dynamics,
    transitions=[("Race", guard_baseline_to_race)]
)

race_mode = DTHAMode(
    name="Race",
    dynamics=race_dynamics,
    transitions=[("Catastrophe", guard_race_to_catastrophe)]
)

catastrophe_mode = DTHAMode(
    name="Catastrophe",
    dynamics=lambda x, u, p: x,  # Absorbing
    transitions=[]
)

# Simulate
ha = DiscreteTimeHA(
    modes=[baseline_mode, race_mode, catastrophe_mode],
    initial_mode="Baseline",
    initial_state=np.array([26.0, 0.15, 0.70])
)

params = {
    'alpha_base': 0.10,
    'alpha_race': 0.20,
    'beta': 0.05,
    'gamma_base': 0.01,
    'gamma_race': 0.05
}

policy = lambda x, mode, k: {'compute_investment': 0.0}  # No intervention

trajectory = ha.simulate(horizon=120, policy=policy, params=params)

print(f"Final mode: {trajectory[-1][0]}")
print(f"Final state: {trajectory[-1][1]}")
```

---

## Summary

**Discrete-Time Hybrid Automata** are:
- ✅ **Real formalisms** (not bespoke hacks)
- ✅ **Well-studied** (MLD, PWA, verification literature)
- ✅ **Natural for macro modeling** (discrete decision cycles)
- ✅ **Computationally efficient** (no ODE integration)
- ✅ **MC-friendly** (fast simulation, easy parallelization)
- ✅ **Transparent** (intuitive for stakeholders)

**For AI governance**:
- Matches policy/strategic timescales (months/quarters)
- Enables Monte Carlo risk analysis at scale
- Avoids Zeno and continuous-time artifacts
- Direct connection to decision-making rhythms

**Our approach**: Discrete-time HA + Monte Carlo
- Inner loop: DTHA simulator (modes + difference equations)
- Outer loop: MC over parameter uncertainty
- Result: Distributions over futures, sensitivity analysis, policy comparison

**Next steps**:
- Implement DTHA simulator (see code example above)
- Add stochasticity (probabilistic transitions, process noise)
- Wrap in Monte Carlo (see [../monte_carlo/examples.md](../monte_carlo/examples.md))
- Integrate with Simulacra (see [../simulacra_integration/monte_carlo_for_ttx.md](../simulacra_integration/monte_carlo_for_ttx.md))

---

## References

**Foundational**:
- Bemporad, A., & Morari, M. (1999). Control of systems integrating logic, dynamics, and constraints. *Automatica*, 35(3), 407-427.
- Heemels, W. P. M. H., De Schutter, B., & Bemporad, A. (2001). Equivalence of hybrid dynamical models. *Automatica*, 37(7), 1085-1091.

**Verification & Reachability**:
- Oehlerking, J. (2007). *Decomposition of Stability Proofs for Hybrid Systems*. PhD thesis, Carl von Ossietzky Universität Oldenburg.
- Belta, C., & Habets, L. C. G. J. M. (2006). Controlling a class of nonlinear systems on rectangles. *IEEE TAC*, 51(11), 1749-1759.

**Control Synthesis**:
- Borrelli, F. (2003). *Constrained Optimal Control of Linear and Hybrid Systems*. Springer.
- Mayne, D. Q., & Raković, S. V. (2003). Model predictive control of constrained piecewise affine discrete-time systems. *International Journal of Robust and Nonlinear Control*, 13(3-4), 261-279.

**Tools**:
- Torrisi, F. D., & Bemporad, A. (2004). HYSDEL—A tool for generating computational hybrid models for analysis and synthesis problems. *IEEE Transactions on Control Systems Technology*, 12(2), 235-249.
- Kvasnica, M., Grieder, P., & Baotić, M. (2004). Multi-Parametric Toolbox (MPT). *Hybrid Systems: Computation and Control*, 448-462.

---

## Related Documentation

- [../simulacra_integration/evals/discrete_time_modeling.md](../simulacra_integration/evals/discrete_time_modeling.md) - Discrete-time for macro problems
- [../monte_carlo/README.md](../monte_carlo/README.md) - Monte Carlo overview
- [../monte_carlo/integration.md](../monte_carlo/integration.md) - MC with different formalisms
- [../matrix/adapters/README.md](../matrix/adapters/README.md) - HybridAutomatonAdapter implementation
- [../simulacra_integration/monte_carlo_for_ttx.md](../simulacra_integration/monte_carlo_for_ttx.md) - Integration with Simulacra

---

**Status**: Formal foundation established. Ready for implementation.
