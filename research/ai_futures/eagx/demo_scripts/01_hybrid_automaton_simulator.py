#!/usr/bin/env python3
"""
AI2027 Hybrid Automaton Simulator

Demonstrates discrete governance regimes + continuous dynamics (compute, alignment, trust, security)
using scipy ODE integration.

This is a minimal, runnable demo for EAGX presentation.
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint
from dataclasses import dataclass
from typing import List, Tuple, Callable
from enum import Enum


class Mode(Enum):
    """Discrete governance regimes"""
    BASELINE = "baseline"
    RACE = "race"
    SLOWDOWN = "slowdown"
    ESPIONAGE = "espionage"
    CATASTROPHE = "catastrophe"
    ALIGNED = "aligned"


@dataclass
class ContinuousState:
    """Continuous variables"""
    compute: float  # Log10(FLOP) [24-28]
    alignment: float  # [0-1]
    trust: float  # [0-1]
    security: float  # [0-1]

    def to_array(self) -> np.ndarray:
        return np.array([self.compute, self.alignment, self.trust, self.security])

    @staticmethod
    def from_array(arr: np.ndarray) -> 'ContinuousState':
        return ContinuousState(*arr)


class HybridAutomaton:
    """AI2027 as Hybrid Automaton"""

    def __init__(self):
        self.mode = Mode.BASELINE
        self.time = 0.0  # Months since 2024
        self.state = ContinuousState(
            compute=25.0,  # ~1e25 FLOP (GPT-4 level)
            alignment=0.15,  # Low initial alignment capacity
            trust=0.70,  # Moderate public trust
            security=0.50  # Moderate security
        )
        self.history = []

    def flow(self, state_arr: np.ndarray, t: float, mode: Mode) -> np.ndarray:
        """ODE flow function for each mode"""
        s = ContinuousState.from_array(state_arr)

        if mode == Mode.BASELINE:
            # Slow progress, moderate safety work
            dcompute = 0.8 * (s.compute - 24)  # Gradual scaling
            dalignment = 0.1 * (1 - s.alignment)
            dtrust = 0.02 * (1 - s.trust)
            dsecurity = 0.05 * (1 - s.security)

        elif mode == Mode.RACE:
            # Aggressive scaling, minimal safety
            dcompute = 1.5 * (s.compute - 24)  # Exponential push
            dalignment = 0.05 * (1 - s.alignment)  # Neglected
            dtrust = -0.05 * s.trust  # Erodes
            dsecurity = -0.1 * (s.compute - 26)  # Harder to secure as compute grows

        elif mode == Mode.SLOWDOWN:
            # Pause scaling, focus on safety
            dcompute = 0.3 * (s.compute - 24)  # Slow growth
            dalignment = 0.3 * (1 - s.alignment)  # Major investment
            dtrust = 0.1 * (1 - s.trust)  # Rebuilds
            dsecurity = 0.2 * (1 - s.security)  # Security investment

        elif mode == Mode.ESPIONAGE:
            # China caught up, race intensifies
            dcompute = 2.0 * (s.compute - 24)  # Even faster
            dalignment = 0.02 * (1 - s.alignment)  # Abandoned
            dtrust = -0.1 * s.trust
            dsecurity = -0.2 * (s.compute - 26)

        else:
            # Terminal states (catastrophe, aligned)
            dcompute = 0
            dalignment = 0
            dtrust = 0
            dsecurity = 0

        return np.array([dcompute, dalignment, dtrust, dsecurity])

    def check_guards(self) -> Mode:
        """Check if any transition guards are satisfied"""
        s = self.state

        # Baseline → Race: compute threshold + evidence
        if self.mode == Mode.BASELINE and s.compute >= 26.5:
            print(f"  ⚡ TRANSITION: {self.mode.value} → race (compute threshold)")
            return Mode.RACE

        # Race → Espionage: security failure (probabilistic, simplified as threshold)
        if self.mode == Mode.RACE and s.security < 0.3:
            print(f"  ⚡ TRANSITION: {self.mode.value} → espionage (security breach)")
            return Mode.ESPIONAGE

        # Race → Slowdown: trust collapse + political will (simplified)
        if self.mode == Mode.RACE and s.trust < 0.4 and self.time > 12:
            print(f"  ⚡ TRANSITION: {self.mode.value} → slowdown (trust collapse)")
            return Mode.SLOWDOWN

        # Race/Espionage → Catastrophe: alignment gap too large
        if self.mode in [Mode.RACE, Mode.ESPIONAGE]:
            alignment_gap = (s.compute - 24) - 10 * s.alignment
            if alignment_gap > 8.0 and s.compute >= 27.5:
                print(f"  💀 TRANSITION: {self.mode.value} → CATASTROPHE (alignment gap: {alignment_gap:.2f})")
                return Mode.CATASTROPHE

        # Slowdown → Aligned: sufficient alignment capacity
        if self.mode == Mode.SLOWDOWN and s.alignment >= 0.85:
            print(f"  ✅ TRANSITION: {self.mode.value} → aligned (sufficient safety)")
            return Mode.ALIGNED

        return self.mode  # No transition

    def step(self, dt: float = 1.0):
        """Advance simulation by dt months"""
        # Evolve continuous state via ODE
        t_span = [0, dt]
        sol = odeint(self.flow, self.state.to_array(), t_span, args=(self.mode,))
        self.state = ContinuousState.from_array(sol[-1])
        self.time += dt

        # Check for discrete transition
        new_mode = self.check_guards()
        if new_mode != self.mode:
            self.mode = new_mode

        # Record history
        self.history.append({
            'time': self.time,
            'mode': self.mode.value,
            'compute': self.state.compute,
            'alignment': self.state.alignment,
            'trust': self.state.trust,
            'security': self.state.security
        })

    def simulate(self, duration: float = 36.0, dt: float = 0.5):
        """Run full simulation for duration months"""
        print(f"\n🚀 Starting AI2027 Hybrid Automaton Simulation")
        print(f"Duration: {duration} months ({duration/12:.1f} years)")
        print(f"Initial state: {self.mode.value}")
        print(f"  compute={self.state.compute:.2f}, alignment={self.state.alignment:.2f}")
        print()

        while self.time < duration and self.mode not in [Mode.CATASTROPHE, Mode.ALIGNED]:
            self.step(dt)

        print(f"\n📊 Simulation complete!")
        print(f"Final time: {self.time:.1f} months ({self.time/12:.1f} years)")
        print(f"Final mode: {self.mode.value}")
        print(f"Final state:")
        print(f"  compute={self.state.compute:.2f} (10^{self.state.compute:.1f} FLOP)")
        print(f"  alignment={self.state.alignment:.2f}")
        print(f"  trust={self.state.trust:.2f}")
        print(f"  security={self.state.security:.2f}")

        # Alignment gap
        alignment_gap = (self.state.compute - 24) - 10 * self.state.alignment
        print(f"  alignment_gap={alignment_gap:.2f}")

        return self.history

    def plot(self):
        """Visualize trajectory"""
        if not self.history:
            print("No history to plot!")
            return

        import pandas as pd

        df = pd.DataFrame(self.history)

        fig, axes = plt.subplots(3, 1, figsize=(12, 10))

        # Plot 1: Continuous variables
        ax = axes[0]
        ax.plot(df['time'], df['compute'], label='Compute (log10 FLOP)', linewidth=2)
        ax.plot(df['time'], 24 + 10*df['alignment'], label='10×Alignment + 24 (scaled)', linewidth=2, linestyle='--')
        ax.axhline(y=27.5, color='red', linestyle=':', alpha=0.5, label='ASI threshold (~27.5)')
        ax.set_ylabel('Compute / Scaled Alignment')
        ax.set_title('AI2027 Hybrid Automaton Trajectory')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # Plot 2: Trust and Security
        ax = axes[1]
        ax.plot(df['time'], df['trust'], label='Public Trust', linewidth=2, color='blue')
        ax.plot(df['time'], df['security'], label='Security', linewidth=2, color='purple')
        ax.axhline(y=0.4, color='orange', linestyle=':', alpha=0.5, label='Trust collapse threshold')
        ax.axhline(y=0.3, color='red', linestyle=':', alpha=0.5, label='Security breach threshold')
        ax.set_ylabel('Level [0-1]')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # Plot 3: Mode timeline
        ax = axes[2]
        mode_colors = {
            'baseline': 'green',
            'race': 'orange',
            'slowdown': 'blue',
            'espionage': 'purple',
            'catastrophe': 'red',
            'aligned': 'lightgreen'
        }

        for mode_name, color in mode_colors.items():
            mode_mask = df['mode'] == mode_name
            if mode_mask.any():
                ax.fill_between(df['time'], 0, 1, where=mode_mask, color=color, alpha=0.5, label=mode_name)

        ax.set_xlabel('Time (months since 2024)')
        ax.set_ylabel('Governance Mode')
        ax.set_ylim([0, 1])
        ax.set_yticks([])
        ax.legend(loc='upper left')
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig('research/ai_futures/eagx/ai2027_trajectory.png', dpi=150)
        print("\n📈 Plot saved to: research/ai_futures/eagx/ai2027_trajectory.png")
        plt.show()


def main():
    """Run demo simulation"""
    ha = HybridAutomaton()
    history = ha.simulate(duration=36.0, dt=0.5)
    ha.plot()

    print("\n" + "="*60)
    print("INTERPRETATION")
    print("="*60)

    if ha.mode == Mode.CATASTROPHE:
        print("❌ CATASTROPHE: Alignment gap grew too large before sufficient safety work.")
        print("   Policy implication: Need earlier slowdown or more alignment investment.")
    elif ha.mode == Mode.ALIGNED:
        print("✅ ALIGNED: Successfully built safe ASI through slowdown and alignment research.")
        print("   Policy implication: Pause and safety investment work!")
    else:
        print(f"⏸️  Simulation ended in mode: {ha.mode.value}")

    print("\nKey metrics:")
    print(f"  - Compute reached: 10^{ha.state.compute:.1f} FLOP")
    print(f"  - Alignment capacity: {ha.state.alignment:.2f}")
    print(f"  - Public trust: {ha.state.trust:.2f}")
    print(f"  - Security level: {ha.state.security:.2f}")


if __name__ == "__main__":
    main()
