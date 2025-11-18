"""
System Dynamics Model for AI 2027 Scenario

System Dynamics uses:
- Stock and Flow diagrams
- Feedback loops (reinforcing and balancing)
- Discrete-time difference equations
- Delays and nonlinearities

Good for: Understanding systemic behavior, identifying feedback loops,
          analyzing tipping points and regime shifts

Libraries: PySD, but we'll use plain NumPy for clarity
"""

from dataclasses import dataclass
from typing import Dict, List, Callable
import numpy as np
import matplotlib.pyplot as plt


@dataclass
class StockFlowModel:
    """
    System Dynamics model with stocks (state variables) and flows (rates of change).

    Stocks: Accumulated quantities (e.g., capabilities, trust, research)
    Flows: Rates of change (e.g., capability_growth_rate, trust_erosion_rate)
    Auxiliaries: Intermediate calculations
    """

    def __init__(self, dt: float = 0.1):
        """
        Args:
            dt: Time step for discrete-time integration
        """
        self.dt = dt
        self.time = 0.0

        # STOCKS (state variables)
        self.capabilities = 20.0  # AI capability level [0, 100]
        self.public_trust = 70.0  # Trust in AI institutions [0, 100]
        self.safety_research = 30.0  # Accumulated safety research [0, 100]
        self.coordination_capacity = 40.0  # International coordination [0, 100]
        self.public_alarm = 10.0  # Public concern about AI [0, 100]

        # PARAMETERS (constants)
        self.base_growth_rate = 0.05  # Base capability growth
        self.racing_multiplier = 3.0  # How much racing accelerates growth
        self.trust_erosion_from_racing = 0.02  # Trust lost per time step when racing
        self.alarm_threshold = 60  # Capability level that triggers public alarm
        self.coordination_difficulty = 0.8  # How hard coordination is (0=easy, 1=hard)

        # EXOGENOUS INPUTS (player-controlled)
        self.investment_rate = 50.0  # R&D investment [0, 100]
        self.transparency_effort = 0.0  # Transparency initiatives [0, 10]
        self.safety_investment = 0.0  # Safety research funding [0, 10]
        self.racing_intensity = 0.0  # How many players racing [0, 3]

        # History for plotting
        self.history = {
            'time': [],
            'capabilities': [],
            'public_trust': [],
            'safety_research': [],
            'coordination_capacity': [],
            'public_alarm': []
        }

    def _capability_growth_rate(self) -> float:
        """
        Flow: Rate of capability growth per time step.

        This has REINFORCING FEEDBACK:
        - More capabilities → more investment → faster growth (S-curve)

        And a BALANCING FEEDBACK:
        - High alarm → regulatory pressure → slower growth
        """
        # Logistic growth with investment
        logistic_term = self.capabilities * (1 - self.capabilities / 100)
        investment_effect = self.investment_rate / 100

        # Racing accelerates growth
        racing_effect = 1 + (self.racing_intensity / 3) * self.racing_multiplier

        # Public alarm creates regulatory drag
        alarm_drag = 1 - (self.public_alarm / 100) * 0.5

        growth = self.base_growth_rate * logistic_term * investment_effect * \
                racing_effect * alarm_drag

        return growth

    def _trust_change_rate(self) -> float:
        """
        Flow: Rate of trust change per time step.

        BALANCING FEEDBACK LOOP:
        - Racing → erodes trust → public pressure → coordination attempts
        - Transparency → builds trust → more freedom to develop

        REINFORCING FEEDBACK (negative):
        - Low trust → harder to coordinate → more racing → lower trust
        """
        # Base decay
        decay = -0.005 * self.public_trust

        # Racing erodes trust (nonlinear - accelerates at high racing levels)
        racing_erosion = -self.trust_erosion_from_racing * (self.racing_intensity ** 2)

        # Transparency builds trust
        transparency_boost = 0.01 * self.transparency_effort * (100 - self.public_trust) / 100

        # Coordination success builds trust
        coord_boost = 0.005 * self.coordination_capacity * (100 - self.public_trust) / 100

        # Crisis collapse (tipping point)
        if self.public_trust < 30 and self.capabilities > 70:
            crisis_collapse = -1.0  # Rapid collapse
        else:
            crisis_collapse = 0.0

        return decay + racing_erosion + transparency_boost + coord_boost + crisis_collapse

    def _safety_research_rate(self) -> float:
        """
        Flow: Rate of safety research accumulation.

        Diminishing returns: harder to make progress as you accumulate more.
        """
        # Investment effect
        investment_effect = self.safety_investment

        # Diminishing returns
        diminishing = (100 - self.safety_research) / 100

        # Coordination boosts safety research (shared knowledge)
        coord_multiplier = 1 + (self.coordination_capacity / 100) * 0.5

        return investment_effect * diminishing * coord_multiplier * 0.1

    def _coordination_change_rate(self) -> float:
        """
        Flow: Rate of coordination capacity change.

        CRITICAL NONLINEARITY:
        - Coordination is hard to build but easy to destroy
        - Trust is a prerequisite for coordination
        """
        # Trust enables coordination (threshold function)
        if self.public_trust < 40:
            trust_factor = 0.2  # Very hard to coordinate with low trust
        elif self.public_trust < 60:
            trust_factor = 0.6
        else:
            trust_factor = 1.0

        # Player efforts to coordinate
        coord_effort = (3 - self.racing_intensity) / 3  # Inverse of racing

        # Growth when attempting coordination
        growth = 0.05 * coord_effort * trust_factor * (100 - self.coordination_capacity) / 100

        # Decay when racing
        decay = -0.03 * self.racing_intensity

        return growth + decay

    def _public_alarm_rate(self) -> float:
        """
        Flow: Rate of public alarm increase.

        DELAY: Public alarm responds slowly to capability growth.
        NONLINEARITY: Alarm spikes when capabilities cross threshold.
        """
        # Alarm grows if capabilities exceed comfort level
        if self.capabilities > self.alarm_threshold:
            capability_alarm = 0.05 * (self.capabilities - self.alarm_threshold)
        else:
            capability_alarm = 0.0

        # Racing without transparency increases alarm
        racing_alarm = 0.02 * self.racing_intensity * (1 - self.transparency_effort / 10)

        # Trust moderates alarm (people trust institutions to handle it)
        trust_damping = -(self.public_alarm / 100) * (self.public_trust / 100) * 0.01

        # Alarm decays slowly if capabilities are safe and trust is high
        natural_decay = -0.005 * self.public_alarm if self.public_trust > 60 else 0

        return capability_alarm + racing_alarm + trust_damping + natural_decay

    def step(self):
        """
        Euler integration: x[t+1] = x[t] + f(x[t]) * dt

        Update all stocks based on their flows.
        """
        # Compute all flows
        cap_flow = self._capability_growth_rate()
        trust_flow = self._trust_change_rate()
        safety_flow = self._safety_research_rate()
        coord_flow = self._coordination_change_rate()
        alarm_flow = self._public_alarm_rate()

        # Update stocks (Euler integration)
        self.capabilities += cap_flow * self.dt
        self.public_trust += trust_flow * self.dt
        self.safety_research += safety_flow * self.dt
        self.coordination_capacity += coord_flow * self.dt
        self.public_alarm += alarm_flow * self.dt

        # Enforce bounds [0, 100]
        self.capabilities = np.clip(self.capabilities, 0, 100)
        self.public_trust = np.clip(self.public_trust, 0, 100)
        self.safety_research = np.clip(self.safety_research, 0, 100)
        self.coordination_capacity = np.clip(self.coordination_capacity, 0, 100)
        self.public_alarm = np.clip(self.public_alarm, 0, 100)

        # Update time
        self.time += self.dt

        # Record history
        self.history['time'].append(self.time)
        self.history['capabilities'].append(self.capabilities)
        self.history['public_trust'].append(self.public_trust)
        self.history['safety_research'].append(self.safety_research)
        self.history['coordination_capacity'].append(self.coordination_capacity)
        self.history['public_alarm'].append(self.public_alarm)

    def simulate(self, duration: float, player_actions: Dict[str, Callable[[float], float]]):
        """
        Run simulation for specified duration with time-varying player actions.

        Args:
            duration: Simulation time (in years)
            player_actions: Dict mapping action names to functions of time
        """
        num_steps = int(duration / self.dt)

        for step in range(num_steps):
            # Update player-controlled inputs based on time
            if 'investment_rate' in player_actions:
                self.investment_rate = player_actions['investment_rate'](self.time)
            if 'transparency_effort' in player_actions:
                self.transparency_effort = player_actions['transparency_effort'](self.time)
            if 'safety_investment' in player_actions:
                self.safety_investment = player_actions['safety_investment'](self.time)
            if 'racing_intensity' in player_actions:
                self.racing_intensity = player_actions['racing_intensity'](self.time)

            self.step()

    def plot_results(self):
        """Plot simulation results"""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('System Dynamics Simulation: AI 2027 Scenario', fontsize=16, fontweight='bold')

        # Capabilities
        axes[0, 0].plot(self.history['time'], self.history['capabilities'], linewidth=2, color='#e74c3c')
        axes[0, 0].axhline(y=self.alarm_threshold, color='orange', linestyle='--', label='Alarm threshold')
        axes[0, 0].set_xlabel('Time (years)')
        axes[0, 0].set_ylabel('AI Capabilities')
        axes[0, 0].set_title('Capability Growth')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)

        # Trust and Alarm
        axes[0, 1].plot(self.history['time'], self.history['public_trust'], linewidth=2,
                       color='#3498db', label='Public Trust')
        axes[0, 1].plot(self.history['time'], self.history['public_alarm'], linewidth=2,
                       color='#e67e22', label='Public Alarm')
        axes[0, 1].set_xlabel('Time (years)')
        axes[0, 1].set_ylabel('Level')
        axes[0, 1].set_title('Trust and Alarm Dynamics')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)

        # Safety Research
        axes[1, 0].plot(self.history['time'], self.history['safety_research'], linewidth=2, color='#2ecc71')
        axes[1, 0].set_xlabel('Time (years)')
        axes[1, 0].set_ylabel('Safety Research')
        axes[1, 0].set_title('Safety Research Accumulation')
        axes[1, 0].grid(True, alpha=0.3)

        # Coordination
        axes[1, 1].plot(self.history['time'], self.history['coordination_capacity'], linewidth=2, color='#9b59b6')
        axes[1, 1].set_xlabel('Time (years)')
        axes[1, 1].set_ylabel('Coordination Capacity')
        axes[1, 1].set_title('International Coordination')
        axes[1, 1].grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig('models/system_dynamics_results.png', dpi=300, bbox_inches='tight')
        print("Plot saved to: models/system_dynamics_results.png")


if __name__ == "__main__":
    # Example simulation: Racing scenario
    model = StockFlowModel(dt=0.05)

    # Define time-varying player actions
    def racing_scenario(t):
        """Players start racing at t=2, attempt coordination at t=5"""
        if t < 2:
            return 0.0  # No racing initially
        elif t < 5:
            return 3.0  # Full racing (3 players)
        else:
            return 0.5  # Attempt to de-escalate

    def transparency_scenario(t):
        """Transparency kicks in after public alarm"""
        if t < 3:
            return 2.0
        else:
            return 7.0  # High transparency after alarm

    def safety_scenario(t):
        """Safety investment ramps up"""
        return min(8.0, t * 2)

    player_actions = {
        'investment_rate': lambda t: 60.0,  # Constant high investment
        'racing_intensity': racing_scenario,
        'transparency_effort': transparency_scenario,
        'safety_investment': safety_scenario
    }

    print("=== System Dynamics Simulation ===")
    print("Simulating racing scenario with late coordination attempt...\n")

    model.simulate(duration=10.0, player_actions=player_actions)

    print(f"Final state at t={model.time:.1f}:")
    print(f"  Capabilities: {model.capabilities:.1f}")
    print(f"  Public Trust: {model.public_trust:.1f}")
    print(f"  Safety Research: {model.safety_research:.1f}")
    print(f"  Coordination: {model.coordination_capacity:.1f}")
    print(f"  Public Alarm: {model.public_alarm:.1f}")

    # Analyze feedback loops
    print("\n=== Feedback Loop Analysis ===")
    if model.public_trust < 30:
        print("⚠️  TRUST COLLAPSE LOOP ACTIVATED")
        print("    Racing → Trust erosion → Harder coordination → More racing")

    if model.capabilities > 70 and model.safety_research < 50:
        print("⚠️  CAPABILITY-SAFETY GAP")
        print("    High capabilities without adequate safety research")

    if model.public_alarm > 70:
        print("⚠️  PUBLIC ALARM LOOP")
        print("    High capabilities → Public alarm → Regulatory pressure")

    model.plot_results()
