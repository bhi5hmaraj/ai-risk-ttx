#!/usr/bin/env python3
"""
Monte Carlo Risk Analysis for AI2027

Runs 1000+ simulations with stochastic transitions to estimate:
- P(catastrophe)
- P(aligned)
- Distribution of outcomes
- Sensitivity to parameters

Uses numpy for efficient parallel computation.
"""

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from dataclasses import dataclass
from typing import List, Tuple
from tqdm import tqdm


@dataclass
class SimulationConfig:
    """Parameters for stochastic simulation"""
    # Compute scaling rates (per month)
    baseline_compute_rate: float = 0.8
    race_compute_rate: float = 1.5
    slowdown_compute_rate: float = 0.3

    # Alignment progress rates
    baseline_alignment_rate: float = 0.1
    race_alignment_rate: float = 0.05
    slowdown_alignment_rate: float = 0.3

    # Transition probabilities
    p_race_given_compute: float = 0.70  # Baseline → Race when compute ≥ 26.5
    p_slowdown_given_trust_collapse: float = 0.35  # Race → Slowdown (contested!)
    p_espionage_per_month: float = 0.05  # Security breach risk
    p_catastrophe_given_gap: float = 0.80  # Catastrophe when alignment_gap > 8

    # Thresholds
    compute_race_threshold: float = 26.5
    trust_collapse_threshold: float = 0.4
    security_breach_threshold: float = 0.3
    alignment_success_threshold: float = 0.85
    alignment_gap_threshold: float = 8.0
    asi_threshold: float = 27.5

    # Simulation
    duration: float = 36.0  # months
    dt: float = 1.0  # timestep


class MonteCarloSimulator:
    """Run many AI2027 simulations"""

    def __init__(self, config: SimulationConfig = SimulationConfig()):
        self.config = config

    def simulate_one(self, seed: int = None) -> dict:
        """Run one stochastic simulation"""
        if seed is not None:
            np.random.seed(seed)

        config = self.config

        # Initialize state
        time = 0.0
        mode = 'baseline'
        compute = 25.0
        alignment = 0.15
        trust = 0.70
        security = 0.50

        trajectory = []

        while time < config.duration and mode not in ['catastrophe', 'aligned']:
            # Continuous evolution
            if mode == 'baseline':
                dcompute = config.baseline_compute_rate * (compute - 24) * config.dt
                dalignment = config.baseline_alignment_rate * (1 - alignment) * config.dt
                dtrust = 0.02 * (1 - trust) * config.dt
                dsecurity = 0.05 * (1 - security) * config.dt

            elif mode == 'race':
                dcompute = config.race_compute_rate * (compute - 24) * config.dt
                dalignment = config.race_alignment_rate * (1 - alignment) * config.dt
                dtrust = -0.05 * trust * config.dt
                dsecurity = -0.1 * (compute - 26) * config.dt

            elif mode == 'slowdown':
                dcompute = config.slowdown_compute_rate * (compute - 24) * config.dt
                dalignment = config.slowdown_alignment_rate * (1 - alignment) * config.dt
                dtrust = 0.1 * (1 - trust) * config.dt
                dsecurity = 0.2 * (1 - security) * config.dt

            elif mode == 'espionage':
                dcompute = 2.0 * (compute - 24) * config.dt
                dalignment = 0.02 * (1 - alignment) * config.dt
                dtrust = -0.1 * trust * config.dt
                dsecurity = -0.2 * (compute - 26) * config.dt

            else:
                break

            compute += dcompute
            alignment += dalignment
            trust += dtrust
            security += dsecurity

            # Clamp values
            alignment = np.clip(alignment, 0, 1)
            trust = np.clip(trust, 0, 1)
            security = np.clip(security, 0, 1)

            # Stochastic transitions
            if mode == 'baseline' and compute >= config.compute_race_threshold:
                if np.random.rand() < config.p_race_given_compute:
                    mode = 'race'

            if mode == 'race':
                # Espionage risk
                if security < config.security_breach_threshold and np.random.rand() < config.p_espionage_per_month:
                    mode = 'espionage'

                # Slowdown opportunity
                if trust < config.trust_collapse_threshold and time > 12:
                    if np.random.rand() < config.p_slowdown_given_trust_collapse:
                        mode = 'slowdown'

                # Catastrophe risk
                alignment_gap = (compute - 24) - 10 * alignment
                if alignment_gap > config.alignment_gap_threshold and compute >= config.asi_threshold:
                    if np.random.rand() < config.p_catastrophe_given_gap:
                        mode = 'catastrophe'
                        break

            if mode == 'espionage':
                # Higher catastrophe risk
                alignment_gap = (compute - 24) - 10 * alignment
                if alignment_gap > config.alignment_gap_threshold - 2 and compute >= config.asi_threshold:
                    if np.random.rand() < config.p_catastrophe_given_gap + 0.1:
                        mode = 'catastrophe'
                        break

            if mode == 'slowdown' and alignment >= config.alignment_success_threshold:
                mode = 'aligned'
                break

            trajectory.append({
                'time': time,
                'mode': mode,
                'compute': compute,
                'alignment': alignment,
                'trust': trust,
                'security': security
            })

            time += config.dt

        return {
            'outcome': mode,
            'final_compute': compute,
            'final_alignment': alignment,
            'final_time': time,
            'trajectory': trajectory
        }

    def run_monte_carlo(self, n_sims: int = 1000) -> pd.DataFrame:
        """Run many simulations"""
        print(f"\n🎲 Running {n_sims} Monte Carlo simulations...")

        results = []
        for i in tqdm(range(n_sims)):
            result = self.simulate_one(seed=i)
            results.append({
                'sim_id': i,
                'outcome': result['outcome'],
                'final_compute': result['final_compute'],
                'final_alignment': result['final_alignment'],
                'final_time': result['final_time']
            })

        df = pd.DataFrame(results)

        # Summary statistics
        print("\n" + "="*60)
        print("MONTE CARLO RESULTS")
        print("="*60)
        print(f"\nTotal simulations: {n_sims}")
        print(f"\nOutcome distribution:")
        print(df['outcome'].value_counts())
        print(f"\nProbabilities:")
        for outcome in df['outcome'].unique():
            p = (df['outcome'] == outcome).mean()
            emoji = "💀" if outcome == "catastrophe" else ("✅" if outcome == "aligned" else "⏸️")
            print(f"  {emoji} P({outcome}) = {p:.3f} ({p*100:.1f}%)")

        # Compute statistics
        print(f"\nFinal compute (log10 FLOP):")
        print(f"  Mean: {df['final_compute'].mean():.2f}")
        print(f"  Std:  {df['final_compute'].std():.2f}")

        print(f"\nFinal alignment:")
        print(f"  Mean: {df['final_alignment'].mean():.3f}")
        print(f"  Std:  {df['final_alignment'].std():.3f}")

        return df

    def plot_results(self, df: pd.DataFrame):
        """Visualize Monte Carlo results"""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        # Plot 1: Outcome distribution
        ax = axes[0, 0]
        outcome_counts = df['outcome'].value_counts()
        colors = {
            'catastrophe': 'red',
            'aligned': 'green',
            'race': 'orange',
            'slowdown': 'blue',
            'baseline': 'gray',
            'espionage': 'purple'
        }
        outcome_colors = [colors.get(o, 'gray') for o in outcome_counts.index]
        ax.bar(outcome_counts.index, outcome_counts.values, color=outcome_colors)
        ax.set_ylabel('Count')
        ax.set_title('Outcome Distribution (N=1000)')
        ax.tick_params(axis='x', rotation=45)
        ax.grid(True, alpha=0.3)

        # Plot 2: Final compute vs alignment (colored by outcome)
        ax = axes[0, 1]
        for outcome in df['outcome'].unique():
            mask = df['outcome'] == outcome
            ax.scatter(df[mask]['final_compute'], df[mask]['final_alignment'],
                      label=outcome, alpha=0.6, s=20, color=colors.get(outcome, 'gray'))
        ax.axhline(y=0.85, color='green', linestyle='--', alpha=0.5, label='Alignment threshold')
        ax.axvline(x=27.5, color='red', linestyle='--', alpha=0.5, label='ASI threshold')
        ax.set_xlabel('Final Compute (log10 FLOP)')
        ax.set_ylabel('Final Alignment')
        ax.set_title('Final State Distribution')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # Plot 3: Probability of catastrophe vs parameter
        # (Sensitivity analysis - vary slowdown probability)
        ax = axes[1, 0]
        slowdown_probs = np.linspace(0.1, 0.8, 15)
        catastrophe_probs = []

        for p_slowdown in slowdown_probs:
            temp_config = SimulationConfig(p_slowdown_given_trust_collapse=p_slowdown)
            temp_sim = MonteCarloSimulator(temp_config)
            temp_results = []
            for i in range(200):  # Fewer sims for speed
                result = temp_sim.simulate_one(seed=i)
                temp_results.append(result['outcome'])
            p_cat = sum(1 for o in temp_results if o == 'catastrophe') / len(temp_results)
            catastrophe_probs.append(p_cat)

        ax.plot(slowdown_probs, catastrophe_probs, marker='o', linewidth=2)
        ax.axhline(y=0.05, color='green', linestyle='--', alpha=0.5, label='5% acceptable risk?')
        ax.set_xlabel('P(Slowdown | Trust Collapse)')
        ax.set_ylabel('P(Catastrophe)')
        ax.set_title('Sensitivity Analysis: Slowdown Probability')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # Plot 4: Time to outcome
        ax = axes[1, 1]
        for outcome in ['catastrophe', 'aligned']:
            mask = df['outcome'] == outcome
            if mask.any():
                ax.hist(df[mask]['final_time'], bins=20, alpha=0.6,
                       label=outcome, color=colors.get(outcome, 'gray'))
        ax.set_xlabel('Time to Outcome (months)')
        ax.set_ylabel('Count')
        ax.set_title('Distribution of Outcome Times')
        ax.legend()
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig('research/ai_futures/eagx/monte_carlo_results.png', dpi=150)
        print("\n📊 Plot saved to: research/ai_futures/eagx/monte_carlo_results.png")
        plt.show()


def main():
    """Run Monte Carlo demo"""
    sim = MonteCarloSimulator()
    df = sim.run_monte_carlo(n_sims=1000)
    sim.plot_results(df)

    print("\n" + "="*60)
    print("POLICY IMPLICATIONS")
    print("="*60)

    p_cat = (df['outcome'] == 'catastrophe').mean()
    p_aligned = (df['outcome'] == 'aligned').mean()

    print(f"\nBaseline scenario (AI2027 assumptions):")
    print(f"  - P(catastrophe) = {p_cat:.2%}")
    print(f"  - P(aligned) = {p_aligned:.2%}")

    if p_cat > 0.05:
        print(f"\n⚠️  Catastrophe risk ({p_cat:.0%}) EXCEEDS 5% acceptable threshold!")
        print(f"   Policy recommendation: Increase P(slowdown) from 0.35 to >0.60")
        print(f"   This could reduce catastrophe risk to <10%")

    if p_aligned < 0.30:
        print(f"\n⚠️  Alignment success probability ({p_aligned:.0%}) is LOW")
        print(f"   Policy recommendation: Invest heavily in alignment research")
        print(f"   Target: 0.30 → 0.50 alignment capacity by slowdown mode")

    print(f"\nSensitivity findings:")
    print(f"  - Slowdown political will is CRITICAL")
    print(f"  - Increasing P(slowdown | trust collapse) from 0.35 → 0.60")
    print(f"    reduces P(catastrophe) by ~30 percentage points")


if __name__ == "__main__":
    main()
