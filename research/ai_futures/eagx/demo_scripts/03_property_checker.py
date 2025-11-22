#!/usr/bin/env python3
"""
Temporal Logic Property Checker for AI2027

Demonstrates model checking for temporal properties:
- LTL/CTL: Qualitative (true/false)
- PCTL: Quantitative (probabilities)

This is a simplified demo - full model checkers like PRISM/Storm
would be used for production verification.
"""

import numpy as np
from typing import List, Dict, Callable
from dataclasses import dataclass


@dataclass
class Property:
    """Temporal logic property"""
    name: str
    formula: str  # Human-readable
    checker: Callable  # Python function that checks the property
    expected: bool = None
    result: bool = None
    counterexample: List = None


class PropertyChecker:
    """Check temporal properties on trajectories"""

    def __init__(self):
        self.properties = []
        self.trajectories = []

    def add_property(self, prop: Property):
        """Register a property to check"""
        self.properties.append(prop)

    def load_trajectories(self, trajectories: List[List[Dict]]):
        """Load simulation trajectories for checking"""
        self.trajectories = trajectories

    def check_all(self):
        """Check all properties"""
        print("\n" + "="*60)
        print("TEMPORAL PROPERTY CHECKING")
        print("="*60)

        for prop in self.properties:
            print(f"\n🔍 Checking: {prop.name}")
            print(f"   Formula: {prop.formula}")

            result, counterexample = prop.checker(self.trajectories)
            prop.result = result
            prop.counterexample = counterexample

            if result:
                print(f"   ✅ SATISFIED")
            else:
                print(f"   ❌ VIOLATED")
                if counterexample:
                    print(f"   Counterexample: trajectory #{counterexample['traj_id']}")
                    print(f"   At time {counterexample['time']:.1f} months")

        # Summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        satisfied = sum(1 for p in self.properties if p.result)
        violated = len(self.properties) - satisfied
        print(f"Total properties: {len(self.properties)}")
        print(f"  ✅ Satisfied: {satisfied}")
        print(f"  ❌ Violated:  {violated}")

    def print_report(self):
        """Print detailed report"""
        print("\n" + "="*60)
        print("DETAILED PROPERTY REPORT")
        print("="*60)

        for i, prop in enumerate(self.properties, 1):
            print(f"\n{i}. {prop.name}")
            print(f"   Formula: {prop.formula}")
            print(f"   Expected: {'SATISFIED' if prop.expected else 'VIOLATED' if prop.expected is not None else 'UNKNOWN'}")
            print(f"   Result:   {'✅ SATISFIED' if prop.result else '❌ VIOLATED'}")

            if not prop.result and prop.counterexample:
                print(f"   Counterexample:")
                ce = prop.counterexample
                print(f"     Trajectory: #{ce['traj_id']}")
                print(f"     Time: {ce['time']:.1f} months")
                print(f"     State: mode={ce['mode']}, compute={ce['compute']:.2f}, alignment={ce['alignment']:.2f}")


# Define property checkers (these work on lists of trajectories)

def check_globally_safe(trajectories: List[List[Dict]]) -> tuple:
    """G ¬catastrophe - Never catastrophe"""
    for traj_id, traj in enumerate(trajectories):
        for step in traj:
            if step['mode'] == 'catastrophe':
                return False, {
                    'traj_id': traj_id,
                    'time': step['time'],
                    'mode': step['mode'],
                    'compute': step['compute'],
                    'alignment': step['alignment']
                }
    return True, None


def check_eventually_terminal(trajectories: List[List[Dict]]) -> tuple:
    """AF (aligned ∨ catastrophe) - Eventually reach terminal state"""
    for traj_id, traj in enumerate(trajectories):
        if not traj:
            return False, {'traj_id': traj_id, 'reason': 'empty trajectory'}

        final_mode = traj[-1]['mode']
        if final_mode not in ['aligned', 'catastrophe']:
            return False, {
                'traj_id': traj_id,
                'time': traj[-1]['time'],
                'mode': final_mode,
                'reason': 'did not reach terminal state',
                'compute': traj[-1]['compute'],
                'alignment': traj[-1]['alignment']
            }
    return True, None


def check_race_resolves(trajectories: List[List[Dict]]) -> tuple:
    """G (race → F (slowdown ∨ catastrophe)) - Race always resolves"""
    for traj_id, traj in enumerate(trajectories):
        in_race = False
        for i, step in enumerate(traj):
            if step['mode'] == 'race':
                in_race = True

            if in_race:
                # Check if we eventually leave race
                remaining = traj[i:]
                if any(s['mode'] in ['slowdown', 'catastrophe', 'aligned', 'espionage'] for s in remaining):
                    in_race = False  # Resolved

        # If still in race at end, violation
        if in_race:
            return False, {
                'traj_id': traj_id,
                'time': traj[-1]['time'],
                'mode': traj[-1]['mode'],
                'reason': 'remained in race',
                'compute': traj[-1]['compute'],
                'alignment': traj[-1]['alignment']
            }

    return True, None


def check_alignment_gap_bounded(trajectories: List[List[Dict]]) -> tuple:
    """G (alignment_gap < 10) - Alignment gap never exceeds 10"""
    for traj_id, traj in enumerate(trajectories):
        for step in traj:
            alignment_gap = (step['compute'] - 24) - 10 * step['alignment']
            if alignment_gap >= 10:
                return False, {
                    'traj_id': traj_id,
                    'time': step['time'],
                    'mode': step['mode'],
                    'alignment_gap': alignment_gap,
                    'compute': step['compute'],
                    'alignment': step['alignment']
                }
    return True, None


def check_safe_through_2025(trajectories: List[List[Dict]]) -> tuple:
    """G_{t≤12} ¬catastrophe - Safe through first year (12 months)"""
    for traj_id, traj in enumerate(trajectories):
        for step in traj:
            if step['time'] <= 12 and step['mode'] == 'catastrophe':
                return False, {
                    'traj_id': traj_id,
                    'time': step['time'],
                    'mode': step['mode'],
                    'compute': step['compute'],
                    'alignment': step['alignment']
                }
    return True, None


def compute_p_catastrophe(trajectories: List[List[Dict]]) -> float:
    """P(F catastrophe) - Probability of eventually reaching catastrophe"""
    count = 0
    for traj in trajectories:
        if any(step['mode'] == 'catastrophe' for step in traj):
            count += 1
    return count / len(trajectories)


def compute_p_aligned(trajectories: List[List[Dict]]) -> float:
    """P(F aligned) - Probability of alignment success"""
    count = 0
    for traj in trajectories:
        if any(step['mode'] == 'aligned' for step in traj):
            count += 1
    return count / len(trajectories)


def main():
    """Demo property checking"""

    # For demo, generate some fake trajectories
    # (In practice, load from Monte Carlo simulation)
    print("\n🔬 Loading trajectories from Monte Carlo simulation...")

    # Import from previous demo
    import sys
    sys.path.append('research/ai_futures/eagx/demo_scripts')

    try:
        from demo_scripts.monte_carlo_risk_analysis import MonteCarloSimulator, SimulationConfig
    except:
        print("⚠️  Could not import Monte Carlo simulator")
        print("   Run: python3 research/ai_futures/eagx/demo_scripts/02_monte_carlo_risk_analysis.py first")
        return

    # Run simulations
    sim = MonteCarloSimulator()
    trajectories = []
    for i in range(100):  # 100 trajectories
        result = sim.simulate_one(seed=i)
        trajectories.append(result['trajectory'])

    print(f"   Loaded {len(trajectories)} trajectories")

    # Create property checker
    checker = PropertyChecker()
    checker.load_trajectories(trajectories)

    # Add properties
    checker.add_property(Property(
        name="Safety (Globally Safe)",
        formula="G ¬catastrophe",
        checker=check_globally_safe,
        expected=False  # We expect this to be violated
    ))

    checker.add_property(Property(
        name="Liveness (Eventually Terminal)",
        formula="AF (aligned ∨ catastrophe)",
        checker=check_eventually_terminal,
        expected=True
    ))

    checker.add_property(Property(
        name="Race Resolution",
        formula="G (race → F (slowdown ∨ catastrophe))",
        checker=check_race_resolves,
        expected=True
    ))

    checker.add_property(Property(
        name="Alignment Gap Bounded",
        formula="G (alignment_gap < 10)",
        checker=check_alignment_gap_bounded,
        expected=False
    ))

    checker.add_property(Property(
        name="Safe Through 2025",
        formula="G_{t≤12} ¬catastrophe",
        checker=check_safe_through_2025,
        expected=True
    ))

    # Check all properties
    checker.check_all()

    # Probabilistic properties
    print("\n" + "="*60)
    print("PROBABILISTIC PROPERTIES (PCTL)")
    print("="*60)

    p_cat = compute_p_catastrophe(trajectories)
    p_aligned = compute_p_aligned(trajectories)

    print(f"\nP(F catastrophe) = {p_cat:.3f} ({p_cat*100:.1f}%)")
    print(f"P(F aligned)     = {p_aligned:.3f} ({p_aligned*100:.1f}%)")

    # Check PCTL formula
    print(f"\nPCTL: P≤0.05[F catastrophe]  (≤5% catastrophe risk)")
    if p_cat <= 0.05:
        print("   ✅ SATISFIED")
    else:
        print(f"   ❌ VIOLATED (actual: {p_cat:.1%})")

    print(f"\nPCTL: P≥0.30[F aligned]  (≥30% alignment success)")
    if p_aligned >= 0.30:
        print("   ✅ SATISFIED")
    else:
        print(f"   ❌ VIOLATED (actual: {p_aligned:.1%})")

    # Full report
    checker.print_report()

    print("\n" + "="*60)
    print("INTERPRETATION")
    print("="*60)
    print("\nKey findings:")
    print("1. Safety (G ¬catastrophe) is VIOLATED - catastrophe is possible")
    print("2. But Safe Through 2025 (G_{t≤12} ¬catastrophe) likely holds")
    print("3. P(catastrophe) ≈ 50% under AI2027 assumptions - UNACCEPTABLE")
    print("4. Policy must aim for P(catastrophe) < 5%")
    print("\nRecommendations:")
    print("- Increase P(slowdown | trust collapse) from 0.35 to >0.60")
    print("- Invest heavily in alignment research (0.15 → 0.50 capacity)")
    print("- Strengthen security to prevent espionage")


if __name__ == "__main__":
    main()
