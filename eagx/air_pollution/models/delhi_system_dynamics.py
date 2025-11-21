"""
Delhi Air Pollution System Dynamics Model

Stock-flow model capturing emissions, dispersion, and health impacts.

Key feedback loops:
1. Reinforcing: Pollution → Health → Productivity ↓ → Poverty → More Pollution
2. Balancing: Pollution → Alarm → Pressure → Action → Pollution ↓
3. Reinforcing (Meteorological): PM → Cooling → Inversion → PM ↑

Calibrated to Delhi data from SAFAR India, IIT Delhi emission inventories.
"""

from dataclasses import dataclass
from typing import List, Dict
import numpy as np


@dataclass
class PolicyAction:
    """Policy intervention affecting flows"""
    vehicle_restriction: float = 0.0  # [0, 1] - fraction of vehicles off road
    construction_ban: float = 0.0  # [0, 1] - fraction of activity halted
    industry_compliance: float = 0.5  # [0, 1] - emission control adoption
    stubble_subsidy: float = 0.0  # [0, 1] - subsidy coverage
    dust_suppression: float = 0.0  # [0, 1] - road watering, covering


@dataclass
class WeatherConditions:
    """Weather affecting dispersion"""
    wind_speed: float = 5.0  # km/h
    temperature: float = 20.0  # °C
    humidity: float = 0.6  # [0, 1]
    rainfall: float = 0.0  # mm/day
    mixing_height: float = 1000.0  # meters (inversion layer)


class DelhiSystemDynamics:
    """
    Stock-and-flow model for Delhi air pollution.

    Stocks (state variables):
    - PM2.5 in atmosphere (tons)
    - PM10 in atmosphere (tons)
    - Hospitalized patients (count)
    - Cumulative premature deaths (count)
    - Public alarm level [0, 100]

    Flows (rates of change):
    - Emissions (various sources)
    - Dispersion (wind, dilution)
    - Deposition (wet and dry)
    - Health impacts (exposure-response)
    """

    def __init__(self, dt: float = 1.0):
        """
        Initialize model.

        Args:
            dt: Time step in days
        """
        self.dt = dt
        self.time = 0.0

        # Stocks (initial values for early October)
        self.pm25_atmosphere = 3000.0  # tons in Delhi airshed
        self.pm10_atmosphere = 6000.0
        self.hospitalized_patients = 800
        self.cumulative_deaths = 0
        self.public_alarm = 40.0

        # Emission source parameters (tons/day, baseline)
        # Based on IIT Delhi & SAFAR emission inventories
        self.vehicular_base = 350  # 28% of total
        self.industry_base = 250  # 20%
        self.construction_base = 210  # 17%
        self.residential_base = 110  # 9% (cooking, heating)
        self.dust_base = 150  # 12%
        self.stubble_burning_base = 0  # 0-300 depending on season

        # Dispersion parameters
        self.wind_dispersion_coeff = 0.4  # fraction per day at baseline wind
        self.wet_deposition_coeff = 0.85  # fraction removed by 10mm rain
        self.dry_deposition_coeff = 0.05  # fraction per day

        # Health parameters (from epidemiology)
        self.hospitalization_rate_pm25 = 0.02  # per μg/m³ excess, per million pop
        self.mortality_rate_pm25 = 0.001  # per μg/m³ excess, per million pop
        self.delhi_population = 20  # million
        self.discharge_rate = 0.1  # fraction per day

        # Alarm dynamics
        self.alarm_sensitivity = 0.5  # how quickly public reacts

    def _compute_emissions(self, policy: PolicyAction, season: str) -> float:
        """
        Compute total PM2.5 emissions (tons/day).

        Args:
            policy: Current policy interventions
            season: "pre_diwali", "post_diwali", "winter"

        Returns:
            Total PM2.5 emission rate
        """
        # Vehicular (affected by restrictions)
        vehicular = self.vehicular_base * (1 - 0.3 * policy.vehicle_restriction)

        # Industrial (affected by compliance)
        industry = self.industry_base * (1 - 0.4 * policy.industry_compliance)

        # Construction (can be halted)
        construction = self.construction_base * (1 - policy.construction_ban)

        # Residential (not policy-controllable in short term)
        residential = self.residential_base

        # Dust (affected by suppression measures)
        dust = self.dust_base * (1 - 0.6 * policy.dust_suppression)

        # Stubble burning (highly seasonal, affected by subsidy)
        if season == "pre_diwali":
            # Peak burning season (Oct-Nov)
            base_burning = 3000  # Up to 3000 tons/day at peak
            # Subsidy reduces burning (50% subsidy → 30% reduction in burning)
            burning_reduction = 0.6 * policy.stubble_subsidy
            stubble = base_burning * (1 - burning_reduction)
        elif season == "post_diwali":
            stubble = 1000 * (1 - 0.6 * policy.stubble_subsidy)
        else:
            stubble = 100  # Minimal in winter

        total = vehicular + industry + construction + residential + dust + stubble

        return total

    def _compute_dispersion(self, weather: WeatherConditions) -> float:
        """
        Compute dispersion rate (fraction of PM removed per day).

        Wind speed is key: Higher wind → more dispersion
        Mixing height: Lower → trapped pollution
        """
        # Wind effect (non-linear: calm vs windy has huge difference)
        if weather.wind_speed < 3:
            wind_factor = 0.1  # Stagnant
        elif weather.wind_speed < 8:
            wind_factor = 0.4
        else:
            wind_factor = 0.7  # Strong dispersal

        # Mixing height effect (inversions trap pollution)
        mixing_factor = weather.mixing_height / 1000.0  # Normalized to baseline

        dispersion_rate = self.wind_dispersion_coeff * wind_factor * mixing_factor

        return dispersion_rate

    def _compute_deposition(self, weather: WeatherConditions) -> float:
        """
        Compute wet + dry deposition rate.

        Rain is very effective at washing out PM.
        """
        wet = 0.0
        if weather.rainfall > 1:  # mm/day
            # Heavy rain removes most PM
            wet = self.wet_deposition_coeff * (weather.rainfall / 10)

        dry = self.dry_deposition_coeff

        return min(1.0, wet + dry)  # Can't remove more than 100%

    def _compute_health_impacts(self, pm25_concentration: float) -> tuple:
        """
        Compute health burden from PM2.5 exposure.

        Args:
            pm25_concentration: μg/m³

        Returns:
            (new_hospitalizations, new_deaths)
        """
        # Baseline safe level (WHO guideline)
        safe_level = 15  # μg/m³ (24-hour)

        excess_pm25 = max(0, pm25_concentration - safe_level)

        # Linear exposure-response (simplified)
        # Real models use log-linear or non-linear functions
        new_hospitalizations = (
            self.hospitalization_rate_pm25 *
            excess_pm25 *
            self.delhi_population
        )

        new_deaths = (
            self.mortality_rate_pm25 *
            excess_pm25 *
            self.delhi_population
        )

        return new_hospitalizations, new_deaths

    def _pm25_to_concentration(self, pm25_tons: float) -> float:
        """
        Convert atmospheric PM2.5 (tons) to ground-level concentration (μg/m³).

        Simplified: Assumes uniform mixing in Delhi airshed.
        Real models use 3D dispersion (AERMOD, CALPUFF).
        """
        # Delhi area: ~1500 km²
        # Mixing volume: area × mixing height
        area_km2 = 1500
        mixing_height_km = 1.0  # ~1 km
        volume_km3 = area_km2 * mixing_height_km

        # Convert: tons in volume → μg/m³
        # 1 ton = 1e12 μg
        # 1 km³ = 1e12 m³
        concentration = (pm25_tons * 1e12) / (volume_km3 * 1e12)

        return concentration

    def _alarm_dynamics(self, aqi: float) -> float:
        """
        Public alarm increases with severe AQI, decreases slowly otherwise.

        Feedback loop: High alarm → political pressure → action
        """
        if aqi > 300:
            alarm_change = 10 * self.alarm_sensitivity
        elif aqi > 200:
            alarm_change = 3 * self.alarm_sensitivity
        elif aqi > 100:
            alarm_change = 0.5 * self.alarm_sensitivity
        else:
            alarm_change = -2 * self.alarm_sensitivity  # Decays

        return alarm_change

    def step(self, policy: PolicyAction, weather: WeatherConditions,
             season: str = "pre_diwali") -> Dict:
        """
        Execute one time step using Euler integration.

        x[t+1] = x[t] + f(x[t], u[t]) * dt
        """
        # Flow: Emissions
        emission_flow = self._compute_emissions(policy, season)

        # Flow: Dispersion
        dispersion_rate = self._compute_dispersion(weather)
        dispersion_flow = dispersion_rate * self.pm25_atmosphere

        # Flow: Deposition
        deposition_rate = self._compute_deposition(weather)
        deposition_flow = deposition_rate * self.pm25_atmosphere

        # Net change in PM2.5 stock
        pm25_change = emission_flow - dispersion_flow - deposition_flow

        # Update PM2.5 stock
        self.pm25_atmosphere = max(0, self.pm25_atmosphere + pm25_change * self.dt)

        # PM10 roughly 2x PM2.5 for Delhi
        self.pm10_atmosphere = self.pm25_atmosphere * 2.0

        # Convert to concentration
        pm25_conc = self._pm25_to_concentration(self.pm25_atmosphere)
        pm10_conc = pm25_conc * 2.0

        # AQI (simplified formula)
        aqi = self._concentration_to_aqi(pm25_conc)

        # Health impacts
        new_hosp, new_deaths = self._compute_health_impacts(pm25_conc)

        # Update health stocks
        self.hospitalized_patients += (new_hosp - self.discharge_rate * self.hospitalized_patients) * self.dt
        self.cumulative_deaths += new_deaths * self.dt

        # Public alarm dynamics
        alarm_change = self._alarm_dynamics(aqi)
        self.public_alarm = np.clip(self.public_alarm + alarm_change * self.dt, 0, 100)

        # Advance time
        self.time += self.dt

        return {
            'time': self.time,
            'pm25_stock': self.pm25_atmosphere,
            'pm25_concentration': pm25_conc,
            'pm10_concentration': pm10_conc,
            'aqi': aqi,
            'emission_flow': emission_flow,
            'dispersion_flow': dispersion_flow,
            'deposition_flow': deposition_flow,
            'hospitalizations': self.hospitalized_patients,
            'cumulative_deaths': self.cumulative_deaths,
            'public_alarm': self.public_alarm
        }

    def _concentration_to_aqi(self, pm25: float) -> float:
        """Convert PM2.5 μg/m³ to AQI (EPA formula)"""
        if pm25 <= 12:
            return pm25 * 4.17
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

    def simulate(self, num_days: int, policy_schedule: List[PolicyAction],
                 weather_schedule: List[WeatherConditions],
                 season_schedule: List[str]) -> Dict:
        """Run full simulation"""
        history = {
            'time': [],
            'aqi': [],
            'pm25_conc': [],
            'emissions': [],
            'hospitalizations': [],
            'deaths': [],
            'alarm': []
        }

        for day in range(num_days):
            policy = policy_schedule[day] if day < len(policy_schedule) else PolicyAction()
            weather = weather_schedule[day] if day < len(weather_schedule) else WeatherConditions()
            season = season_schedule[day] if day < len(season_schedule) else "pre_diwali"

            result = self.step(policy, weather, season)

            history['time'].append(result['time'])
            history['aqi'].append(result['aqi'])
            history['pm25_conc'].append(result['pm25_concentration'])
            history['emissions'].append(result['emission_flow'])
            history['hospitalizations'].append(result['hospitalizations'])
            history['deaths'].append(result['cumulative_deaths'])
            history['alarm'].append(result['public_alarm'])

        return history


if __name__ == "__main__":
    """Demo: Stubble burning season dynamics"""
    print("=== Delhi System Dynamics Demo ===\n")

    sd = DelhiSystemDynamics(dt=1.0)

    num_days = 30

    # Scenario: Burning season, policy response
    policy_schedule = []
    weather_schedule = []
    season_schedule = []

    for day in range(num_days):
        # Policy: Gradual response
        if day < 10:
            policy = PolicyAction()  # No action
        elif day < 20:
            policy = PolicyAction(
                vehicle_restriction=0.3,
                construction_ban=0.5,
                stubble_subsidy=0.3
            )
        else:
            # Strong response
            policy = PolicyAction(
                vehicle_restriction=0.8,
                construction_ban=1.0,
                industry_compliance=0.7,
                stubble_subsidy=0.6,
                dust_suppression=0.8
            )

        # Weather: Worsens mid-season
        if day < 15:
            weather = WeatherConditions(wind_speed=6, mixing_height=1200)
        else:
            weather = WeatherConditions(
                wind_speed=3,  # Low wind
                mixing_height=500,  # Strong inversion
                temperature=15
            )

        # Season
        if day < 20:
            season = "pre_diwali"
        else:
            season = "post_diwali"

        policy_schedule.append(policy)
        weather_schedule.append(weather)
        season_schedule.append(season)

    results = sd.simulate(num_days, policy_schedule, weather_schedule, season_schedule)

    print(f"Simulation: {num_days} days")
    print(f"\nInitial AQI: {results['aqi'][0]:.0f}")
    print(f"Peak AQI: {max(results['aqi']):.0f} (day {results['aqi'].index(max(results['aqi']))})")
    print(f"Final AQI: {results['aqi'][-1]:.0f}")

    print(f"\nPeak emissions: {max(results['emissions']):.0f} tons/day")
    print(f"Final emissions: {results['emissions'][-1]:.0f} tons/day")

    print(f"\nCumulative deaths: {results['deaths'][-1]:.0f}")
    print(f"Peak hospitalizations: {max(results['hospitalizations']):.0f}")

    print(f"\nPublic alarm: {results['alarm'][0]:.1f}% → {results['alarm'][-1]:.1f}%")

    print("\n=== Simulation Complete ===")
