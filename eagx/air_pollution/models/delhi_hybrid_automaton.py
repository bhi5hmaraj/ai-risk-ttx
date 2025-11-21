"""
Delhi Air Pollution Hybrid Automaton

Models air quality regime transitions based on AQI thresholds (GRAP stages).

Regimes correspond to India's Graded Response Action Plan (GRAP):
- GOOD (0-50): No restrictions
- MODERATE (51-100): Monitoring
- UNHEALTHY (101-200): GRAP Stage 1 (advisories)
- VERY_UNHEALTHY (201-300): GRAP Stage 2 (restrictions)
- HAZARDOUS (301-400): GRAP Stage 3 (emergency)
- SEVERE (401+): GRAP Stage 4 (shutdown)

Reference: Delhi Pollution Control Committee, GRAP 2024
"""

from dataclasses import dataclass
from enum import Enum
from typing import List, Dict, Tuple, Optional
import numpy as np


class AQIRegime(Enum):
    """Air quality regimes based on official AQI classification"""
    GOOD = "GOOD"
    MODERATE = "MODERATE"
    UNHEALTHY = "UNHEALTHY"
    VERY_UNHEALTHY = "VERY_UNHEALTHY"
    HAZARDOUS = "HAZARDOUS"
    SEVERE = "SEVERE"


@dataclass
class ContinuousState:
    """Continuous variables that evolve in each regime"""
    aqi: float  # Air Quality Index [0, 600+]
    pm25: float  # PM2.5 concentration (μg/m³)
    pm10: float  # PM10 concentration (μg/m³)
    hospitalizations: float  # Current hospitalized patients
    public_alarm: float  # Public concern [0, 100]
    compliance_rate: float  # Adherence to restrictions [0, 1]
    days_in_regime: int  # Consecutive days in current regime


@dataclass
class PlayerAction:
    """Actions players can take"""
    player_id: str
    action_type: str  # e.g., "vehicle_ban", "subsidy", "construction_halt"
    magnitude: float  # Strength [0, 1]
    cost: float  # Budget cost in ₹ crores


@dataclass
class WeatherState:
    """Exogenous weather conditions"""
    wind_speed: float  # km/h
    temperature: float  # °C
    humidity: float  # [0, 1]
    is_raining: bool
    inversion_strength: float  # [0, 1] - traps pollution


class DelhiHybridAutomaton:
    """
    Discrete-time hybrid automaton for Delhi air quality dynamics.

    Structure:
    - Modes: 6 AQI regimes (GOOD → SEVERE)
    - Continuous state: PM2.5, hospitalizations, compliance, etc.
    - Guards: AQI thresholds trigger regime transitions
    - Invariants: Regime-specific dynamics
    - Resets: State adjustments on transitions
    """

    # AQI thresholds for regime transitions (India standard)
    THRESHOLDS = {
        AQIRegime.GOOD: (0, 50),
        AQIRegime.MODERATE: (51, 100),
        AQIRegime.UNHEALTHY: (101, 200),
        AQIRegime.VERY_UNHEALTHY: (201, 300),
        AQIRegime.HAZARDOUS: (301, 400),
        AQIRegime.SEVERE: (401, 600)
    }

    # GRAP stage for each regime
    GRAP_STAGES = {
        AQIRegime.GOOD: 0,
        AQIRegime.MODERATE: 0,
        AQIRegime.UNHEALTHY: 1,
        AQIRegime.VERY_UNHEALTHY: 2,
        AQIRegime.HAZARDOUS: 3,
        AQIRegime.SEVERE: 4
    }

    def __init__(self, dt: float = 1.0):
        """
        Initialize hybrid automaton.

        Args:
            dt: Time step in days
        """
        self.dt = dt
        self.current_regime = AQIRegime.MODERATE
        self.state = ContinuousState(
            aqi=80.0,
            pm25=50.0,
            pm10=100.0,
            hospitalizations=500,
            public_alarm=30.0,
            compliance_rate=0.5,
            days_in_regime=0
        )
        self.time = 0.0
        self.transition_history = []

    def get_regime(self, aqi: float) -> AQIRegime:
        """Classify AQI value into regime"""
        for regime, (low, high) in self.THRESHOLDS.items():
            if low <= aqi <= high:
                return regime
        # Above all thresholds
        return AQIRegime.SEVERE

    def get_grap_stage(self, regime: AQIRegime) -> int:
        """Get GRAP stage for regime"""
        return self.GRAP_STAGES[regime]

    def flow(self, state: ContinuousState, regime: AQIRegime,
             actions: List[PlayerAction], weather: WeatherState) -> ContinuousState:
        """
        Continuous dynamics (difference equations).

        x[t+1] = x[t] + f(x[t], u[t], mode) * dt
        """

        # Compute action effects
        total_emission_reduction = sum(
            self._action_emission_effect(a) for a in actions
        )

        # Base PM2.5 evolution depends on regime
        if regime == AQIRegime.SEVERE:
            # Emergency measures kick in
            base_reduction = -0.15 * state.pm25  # Exponential decay
        elif regime == AQIRegime.HAZARDOUS:
            base_reduction = -0.08 * state.pm25
        else:
            base_reduction = -0.03 * state.pm25  # Slow natural decline

        # Weather effects
        weather_factor = self._weather_dispersion_effect(weather)

        # PM2.5 dynamics
        pm25_change = (
            base_reduction +
            total_emission_reduction +
            weather_factor
        )

        new_pm25 = max(0, state.pm25 + pm25_change * self.dt)

        # PM10 approximately 2x PM2.5 for Delhi
        new_pm10 = new_pm25 * 2.0

        # AQI conversion (simplified US EPA formula)
        new_aqi = self._pm25_to_aqi(new_pm25)

        # Health burden (exposure-response from epidemiology)
        health_increment = self._compute_health_increment(new_pm25)

        new_hospitalizations = state.hospitalizations + health_increment * self.dt

        # Public alarm increases with high AQI
        if new_aqi > 300:
            alarm_change = 5.0
        elif new_aqi > 200:
            alarm_change = 2.0
        else:
            alarm_change = -1.0  # Slowly decreases

        new_alarm = np.clip(state.public_alarm + alarm_change * self.dt, 0, 100)

        # Compliance increases in severe regimes (fear) but decays over time
        if regime in [AQIRegime.HAZARDOUS, AQIRegime.SEVERE]:
            compliance_change = 0.1 * (1 - state.compliance_rate)  # Approach 1
        else:
            compliance_change = -0.05 * state.compliance_rate  # Decay

        new_compliance = np.clip(
            state.compliance_rate + compliance_change * self.dt,
            0.1, 0.95
        )

        return ContinuousState(
            aqi=new_aqi,
            pm25=new_pm25,
            pm10=new_pm10,
            hospitalizations=new_hospitalizations,
            public_alarm=new_alarm,
            compliance_rate=new_compliance,
            days_in_regime=state.days_in_regime + 1
        )

    def _action_emission_effect(self, action: PlayerAction) -> float:
        """Compute PM2.5 reduction from action"""
        effects = {
            "vehicle_ban": -30.0 * action.magnitude,  # Odd-even reduces ~10% of 28% share
            "construction_halt": -15.0 * action.magnitude,
            "industry_restrictions": -20.0 * action.magnitude,
            "subsidy_farmers": -40.0 * action.magnitude * 0.3,  # Reduces burning
            "public_transport_boost": -10.0 * action.magnitude,
            "dust_suppression": -12.0 * action.magnitude
        }
        return effects.get(action.action_type, 0.0)

    def _weather_dispersion_effect(self, weather: WeatherState) -> float:
        """Compute PM2.5 change due to weather"""
        dispersion = 0.0

        # Wind disperses pollution
        if weather.wind_speed > 10:
            dispersion -= 40.0  # Strong dispersal
        elif weather.wind_speed > 5:
            dispersion -= 15.0

        # Rain washes out PM
        if weather.is_raining:
            dispersion -= 80.0  # Wet deposition

        # Temperature inversion traps pollution
        dispersion += 30.0 * weather.inversion_strength

        return dispersion

    def _pm25_to_aqi(self, pm25: float) -> float:
        """
        Convert PM2.5 (μg/m³) to AQI using EPA breakpoint formula.

        Simplified version (full formula has piecewise linear segments).
        """
        if pm25 <= 12:
            return pm25 * 4.17  # 0-50 AQI
        elif pm25 <= 35.4:
            return 50 + (pm25 - 12) * 2.13
        elif pm25 <= 55.4:
            return 100 + (pm25 - 35.4) * 2.5
        elif pm25 <= 150.4:
            return 150 + (pm25 - 55.4) * 1.05
        elif pm25 <= 250.4:
            return 200 + (pm25 - 150.4) * 1.0
        else:
            return 300 + (pm25 - 250.4) * 0.5

    def _compute_health_increment(self, pm25: float) -> float:
        """
        Compute daily hospitalizations from PM2.5 exposure.

        Based on epidemiological studies:
        - 10 μg/m³ increase → 0.8% increase in respiratory admissions
        - Delhi population: 20 million
        - Baseline: ~500 respiratory cases/day
        """
        baseline_pm25 = 35  # Safe level
        excess_pm25 = max(0, pm25 - baseline_pm25)

        # Relative risk per 10 μg/m³
        relative_risk = 1.008 ** (excess_pm25 / 10)

        baseline_cases = 500
        additional_cases = baseline_cases * (relative_risk - 1)

        return additional_cases

    def guard(self, state: ContinuousState) -> Optional[AQIRegime]:
        """
        Check if AQI crosses regime boundary.

        Returns new regime if transition should occur, None otherwise.
        """
        new_regime = self.get_regime(state.aqi)

        if new_regime != self.current_regime:
            return new_regime
        return None

    def reset(self, old_regime: AQIRegime, new_regime: AQIRegime,
              state: ContinuousState) -> ContinuousState:
        """
        State reset on regime transition.

        Some variables jump discontinuously when crossing thresholds.
        """
        new_state = ContinuousState(**state.__dict__)
        new_state.days_in_regime = 0  # Reset counter

        # Entering severe regime triggers emergency response
        if new_regime == AQIRegime.SEVERE and old_regime != AQIRegime.SEVERE:
            new_state.compliance_rate = min(0.95, state.compliance_rate + 0.3)
            new_state.public_alarm = min(100, state.public_alarm + 20)

        return new_state

    def step(self, actions: List[PlayerAction],
             weather: WeatherState) -> Dict:
        """
        Execute one time step.

        Returns:
            Dictionary with updated state and any triggered events
        """
        # Compute continuous evolution
        new_continuous_state = self.flow(
            self.state, self.current_regime, actions, weather
        )

        # Check for regime transition
        new_regime = self.guard(new_continuous_state)

        events = []

        if new_regime is not None:
            # Record transition
            self.transition_history.append({
                'time': self.time,
                'from': self.current_regime,
                'to': new_regime,
                'aqi': new_continuous_state.aqi
            })

            # Trigger events
            if new_regime == AQIRegime.SEVERE:
                events.append("EMERGENCY_DECLARED")
            elif new_regime == AQIRegime.HAZARDOUS:
                events.append("GRAP_STAGE_3")

            # Apply reset map
            new_continuous_state = self.reset(
                self.current_regime, new_regime, new_continuous_state
            )

            self.current_regime = new_regime

        # Update state
        self.state = new_continuous_state
        self.time += self.dt

        return {
            'time': self.time,
            'regime': self.current_regime,
            'grap_stage': self.get_grap_stage(self.current_regime),
            'state': self.state,
            'events': events
        }

    def simulate(self, max_time: float, actions_schedule: List[List[PlayerAction]],
                 weather_schedule: List[WeatherState]) -> Dict:
        """
        Run full simulation.

        Args:
            max_time: Simulation duration (days)
            actions_schedule: List of actions per time step
            weather_schedule: List of weather states per time step

        Returns:
            Complete trajectory history
        """
        history = {
            'time': [],
            'regime': [],
            'grap_stage': [],
            'aqi': [],
            'pm25': [],
            'hospitalizations': [],
            'public_alarm': [],
            'compliance': [],
            'events': []
        }

        steps = int(max_time / self.dt)

        for i in range(steps):
            actions = actions_schedule[i] if i < len(actions_schedule) else []
            weather = weather_schedule[i] if i < len(weather_schedule) else WeatherState(
                wind_speed=5, temperature=20, humidity=0.5,
                is_raining=False, inversion_strength=0.3
            )

            result = self.step(actions, weather)

            history['time'].append(result['time'])
            history['regime'].append(result['regime'])
            history['grap_stage'].append(result['grap_stage'])
            history['aqi'].append(result['state'].aqi)
            history['pm25'].append(result['state'].pm25)
            history['hospitalizations'].append(result['state'].hospitalizations)
            history['public_alarm'].append(result['state'].public_alarm)
            history['compliance'].append(result['state'].compliance_rate)
            history['events'].extend(result['events'])

        return history


if __name__ == "__main__":
    """
    Demo: Simulate October-November Delhi pollution episode.

    Scenario: Pre-Diwali + stubble burning season
    """
    print("=== Delhi Air Pollution Hybrid Automaton Demo ===\n")

    ha = DelhiHybridAutomaton(dt=1.0)  # Daily time steps

    # Initial state: Early October, moderate pollution
    ha.state.aqi = 150
    ha.state.pm25 = 75
    ha.current_regime = AQIRegime.UNHEALTHY

    # 30-day simulation
    num_days = 30

    # Weather schedule (gets worse mid-November)
    weather_schedule = []
    for day in range(num_days):
        if day < 10:
            # Early Oct: some wind
            weather = WeatherState(
                wind_speed=8, temperature=25, humidity=0.6,
                is_raining=False, inversion_strength=0.2
            )
        elif day < 20:
            # Mid Oct: Diwali, low wind, inversions
            weather = WeatherState(
                wind_speed=3, temperature=20, humidity=0.7,
                is_raining=False, inversion_strength=0.7
            )
        else:
            # Late Oct-Nov: worst conditions
            weather = WeatherState(
                wind_speed=2, temperature=15, humidity=0.8,
                is_raining=False, inversion_strength=0.9
            )
        weather_schedule.append(weather)

    # Action schedule: Policy response
    actions_schedule = []
    for day in range(num_days):
        daily_actions = []

        # Day 15: Diwali spike, emergency measures
        if day == 15:
            daily_actions.append(
                PlayerAction("cm", "vehicle_ban", 0.8, 10)
            )
            daily_actions.append(
                PlayerAction("cm", "construction_halt", 1.0, 5)
            )

        # Day 20: Subsidize farmers
        if day == 20:
            daily_actions.append(
                PlayerAction("env", "subsidy_farmers", 0.6, 200)
            )

        actions_schedule.append(daily_actions)

    # Run simulation
    results = ha.simulate(num_days, actions_schedule, weather_schedule)

    # Print summary
    print(f"Simulation: {num_days} days")
    print(f"Initial AQI: {results['aqi'][0]:.0f} ({results['regime'][0].name})")
    print(f"Final AQI: {results['aqi'][-1]:.0f} ({results['regime'][-1].name})")
    print(f"\nMax AQI: {max(results['aqi']):.0f}")
    print(f"Days in SEVERE: {sum(1 for r in results['regime'] if r == AQIRegime.SEVERE)}")
    print(f"Days in HAZARDOUS: {sum(1 for r in results['regime'] if r == AQIRegime.HAZARDOUS)}")

    print(f"\nFinal hospitalizations: {results['hospitalizations'][-1]:.0f}")
    print(f"Peak public alarm: {max(results['public_alarm']):.1f}%")

    print(f"\nRegime transitions: {len(ha.transition_history)}")
    for transition in ha.transition_history:
        print(f"  Day {transition['time']:.0f}: {transition['from'].name} → {transition['to'].name} (AQI={transition['aqi']:.0f})")

    print("\n=== Simulation Complete ===")
