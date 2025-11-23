#!/usr/bin/env python3
"""
Spider Graph Generator for Formalism Comparison

Generates radar charts comparing formal modeling approaches across 8 dimensions.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, RegularPolygon
from matplotlib.path import Path
from matplotlib.projections.polar import PolarAxes
from matplotlib.projections import register_projection
from matplotlib.spines import Spine
from matplotlib.transforms import Affine2D

# Formalism scores [Express, Tract, Learn, Verify, Cont/Disc, Stoch, Modul, Tools]
FORMALISM_SCORES = {
    "System Dynamics": [2, 5, 5, 1, 5, 1, 4, 5],
    "Agent-Based Model": [5, 2, 4, 0, 0, 2, 2, 4],
    "Hybrid Automaton": [4, 3, 3, 2, 3, 0, 3, 2],
    "Stochastic HA": [5, 2, 2, 2, 3, 3, 3, 1],
    "MDP": [3, 3, 3, 4, 0, 2, 3, 4],
    "Kripke": [2, 4, 3, 5, 0, 0, 4, 4],
    "Timed Automata": [3, 4, 3, 4, 2, 0, 4, 4],
}

DIMENSION_LABELS = [
    "Expressiveness",
    "Tractability",
    "Learnability",
    "Verification",
    "Continuous",
    "Stochasticity",
    "Modularity",
    "Tools"
]

COLORS = {
    "System Dynamics": "#2E86AB",  # Blue
    "Agent-Based Model": "#A23B72",  # Purple
    "Hybrid Automaton": "#F18F01",  # Orange
    "Stochastic HA": "#C73E1D",  # Red
    "MDP": "#6A994E",  # Green
    "Kripke": "#BC4B51",  # Dark red
    "Timed Automata": "#8ECAE6",  # Light blue
}

# GM Profiles: Different weight vectors for different user priorities
# Each profile maps dimension indices to weights (higher = more important)
GM_PROFILES = {
    "research": {
        "name": "Research Prototyper",
        "description": "Explore scenarios quickly, iterate rapidly",
        "weights": [3, 8, 10, 3, 5, 4, 3, 7],  # High: Learnability, Tractability, Tools
    },
    "safety": {
        "name": "Safety-Critical Engineer",
        "description": "Prove system safety, pass certification",
        "weights": [2, 6, 2, 10, 5, 3, 5, 4],  # High: Verification, Tractability
    },
    "policy": {
        "name": "Policy Analyst",
        "description": "Quantify risks, communicate to decision-makers",
        "weights": [5, 9, 7, 4, 6, 10, 4, 6],  # High: Stochasticity, Tractability
    },
    "team": {
        "name": "Multidisciplinary Team",
        "description": "Complex system with domain experts (not all technical)",
        "weights": [10, 4, 8, 2, 5, 4, 8, 7],  # High: Expressiveness, Modularity, Learnability
    },
    "balanced": {
        "name": "Balanced (Equal Weights)",
        "description": "All dimensions equally important",
        "weights": [1, 1, 1, 1, 1, 1, 1, 1],
    },
}


def radar_factory(num_vars, frame='circle'):
    """
    Create a radar chart with num_vars axes.

    This function creates a RadarAxes projection and registers it.

    Args:
        num_vars (int): Number of variables (dimensions)
        frame (str): Shape of frame (circle or polygon)

    Returns:
        theta: Angles for each dimension
    """
    theta = np.linspace(0, 2 * np.pi, num_vars, endpoint=False)

    class RadarAxes(PolarAxes):
        name = 'radar'
        RESOLUTION = 1

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.set_theta_zero_location('N')

        def fill(self, *args, closed=True, **kwargs):
            """Override fill so that line is closed by default"""
            return super().fill(closed=closed, *args, **kwargs)

        def plot(self, *args, **kwargs):
            """Override plot so that line is closed by default"""
            lines = super().plot(*args, **kwargs)
            for line in lines:
                self._close_line(line)
            return lines

        def _close_line(self, line):
            x, y = line.get_data()
            if x[0] != x[-1]:
                x = np.append(x, x[0])
                y = np.append(y, y[0])
                line.set_data(x, y)

        def set_varlabels(self, labels):
            self.set_thetagrids(np.degrees(theta), labels)

        def _gen_axes_patch(self):
            if frame == 'circle':
                return Circle((0.5, 0.5), 0.5)
            elif frame == 'polygon':
                return RegularPolygon((0.5, 0.5), num_vars,
                                       radius=0.5, edgecolor="k")
            else:
                raise ValueError("Unknown value for 'frame': %s" % frame)

        def _gen_axes_spines(self):
            if frame == 'circle':
                return super()._gen_axes_spines()
            elif frame == 'polygon':
                spine = Spine(axes=self,
                              spine_type='circle',
                              path=Path.unit_regular_polygon(num_vars))
                spine.set_transform(Affine2D().scale(.5).translate(.5, .5)
                                     + self.transAxes)
                return {'polar': spine}
            else:
                raise ValueError("Unknown value for 'frame': %s" % frame)

    register_projection(RadarAxes)
    return theta


def calculate_weighted_score(scores, weights):
    """
    Calculate weighted score for a formalism

    Args:
        scores (list): Dimension scores [0-5]
        weights (list): Dimension weights (higher = more important)

    Returns:
        float: Weighted average score (0-5 scale)
    """
    if len(scores) != len(weights):
        raise ValueError(f"Scores and weights must have same length: {len(scores)} vs {len(weights)}")

    weighted_sum = sum(s * w for s, w in zip(scores, weights))
    weight_sum = sum(weights)

    return weighted_sum / weight_sum if weight_sum > 0 else 0.0


def get_weighted_rankings(weights, top_n=None):
    """
    Rank all formalisms by weighted score

    Args:
        weights (list): Dimension weights
        top_n (int): Optional limit to top N results

    Returns:
        list: Tuples of (formalism_name, weighted_score) sorted by score
    """
    rankings = []
    for formalism, scores in FORMALISM_SCORES.items():
        weighted_score = calculate_weighted_score(scores, weights)
        rankings.append((formalism, weighted_score))

    rankings.sort(key=lambda x: x[1], reverse=True)

    return rankings[:top_n] if top_n else rankings


def plot_single_formalism(formalism_name, save_path=None):
    """
    Plot spider graph for a single formalism

    Args:
        formalism_name (str): Name of formalism
        save_path (str): Optional path to save figure
    """
    theta = radar_factory(8, frame='polygon')

    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(projection='radar'))
    fig.subplots_adjust(wspace=0.25, hspace=0.20, top=0.85, bottom=0.05)

    scores = FORMALISM_SCORES[formalism_name].copy()  # Copy to avoid mutation

    ax.plot(theta, scores, color=COLORS[formalism_name], linewidth=2)
    ax.fill(theta, scores, alpha=0.25, color=COLORS[formalism_name])
    ax.set_varlabels(DIMENSION_LABELS)
    ax.set_ylim(0, 5)
    ax.set_yticks([1, 2, 3, 4, 5])
    ax.grid(True)

    plt.title(f"{formalism_name}\nScore Profile",
              weight='bold', size=14, position=(0.5, 1.1),
              horizontalalignment='center', verticalalignment='center')

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Saved: {save_path}")
    else:
        plt.show()

    plt.close()


def plot_comparison(formalism_list, save_path=None):
    """
    Plot comparison spider graph for multiple formalisms

    Args:
        formalism_list (list): List of formalism names to compare
        save_path (str): Optional path to save figure
    """
    theta = radar_factory(8, frame='polygon')

    fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(projection='radar'))
    fig.subplots_adjust(wspace=0.25, hspace=0.20, top=0.85, bottom=0.05)

    for formalism in formalism_list:
        scores = FORMALISM_SCORES[formalism].copy()  # Copy to avoid mutation

        ax.plot(theta, scores, color=COLORS[formalism], linewidth=2, label=formalism)
        ax.fill(theta, scores, alpha=0.15, color=COLORS[formalism])

    ax.set_varlabels(DIMENSION_LABELS)
    ax.set_ylim(0, 5)
    ax.set_yticks([1, 2, 3, 4, 5])
    ax.grid(True)

    plt.title("Formalism Comparison",
              weight='bold', size=16, position=(0.5, 1.1),
              horizontalalignment='center', verticalalignment='center')

    ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1))

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Saved: {save_path}")
    else:
        plt.show()

    plt.close()


def plot_weighted_comparison(formalism_list, weights, profile_name="Custom", save_path=None):
    """
    Plot comparison spider graph with weighted scores displayed

    Args:
        formalism_list (list): List of formalism names to compare
        weights (list): Dimension weights
        profile_name (str): Name of GM profile
        save_path (str): Optional path to save figure
    """
    theta = radar_factory(8, frame='polygon')

    fig, ax = plt.subplots(figsize=(12, 10), subplot_kw=dict(projection='radar'))
    fig.subplots_adjust(wspace=0.25, hspace=0.20, top=0.85, bottom=0.15)

    # Calculate weighted scores for ranking
    weighted_scores = []
    for formalism in formalism_list:
        scores = FORMALISM_SCORES[formalism].copy()
        weighted_score = calculate_weighted_score(scores, weights)
        weighted_scores.append((formalism, weighted_score))

        ax.plot(theta, scores, color=COLORS[formalism], linewidth=2, label=formalism)
        ax.fill(theta, scores, alpha=0.15, color=COLORS[formalism])

    # Sort by weighted score for legend
    weighted_scores.sort(key=lambda x: x[1], reverse=True)

    ax.set_varlabels(DIMENSION_LABELS)
    ax.set_ylim(0, 5)
    ax.set_yticks([1, 2, 3, 4, 5])
    ax.grid(True)

    plt.title(f"Formalism Comparison: {profile_name} Profile\nWeighted Scoring",
              weight='bold', size=16, position=(0.5, 1.1),
              horizontalalignment='center', verticalalignment='center')

    # Create legend with weighted scores
    legend_labels = [f"{name}: {score:.2f}/5.0" for name, score in weighted_scores]
    ax.legend(legend_labels, loc='upper right', bbox_to_anchor=(1.35, 1.1), title="Weighted Scores")

    # Add weight visualization below chart
    weight_text = "Dimension Weights:\n"
    for i, (dim, weight) in enumerate(zip(DIMENSION_LABELS, weights)):
        weight_text += f"{dim}: {weight}  "
        if (i + 1) % 3 == 0:  # Line break every 3 dimensions
            weight_text += "\n"

    fig.text(0.5, 0.05, weight_text, ha='center', va='top', fontsize=10,
             bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Saved: {save_path}")
    else:
        plt.show()

    plt.close()

    return weighted_scores


def plot_all_individual(output_dir="diagrams"):
    """Generate individual spider graphs for all formalisms"""
    import os
    os.makedirs(output_dir, exist_ok=True)

    for formalism in FORMALISM_SCORES.keys():
        filename = formalism.lower().replace(" ", "_").replace("-", "")
        save_path = os.path.join(output_dir, f"spider_{filename}.png")
        plot_single_formalism(formalism, save_path)


def plot_use_case_comparisons(output_dir="diagrams"):
    """Generate comparison graphs for common use cases"""
    import os
    os.makedirs(output_dir, exist_ok=True)

    # Comparison 1: Continuous vs Discrete
    plot_comparison(
        ["System Dynamics", "Kripke", "Hybrid Automaton"],
        save_path=os.path.join(output_dir, "comparison_continuous_discrete.png")
    )

    # Comparison 2: Verification-Capable
    plot_comparison(
        ["Kripke", "Timed Automata", "MDP"],
        save_path=os.path.join(output_dir, "comparison_verification.png")
    )

    # Comparison 3: Hybrid Approaches
    plot_comparison(
        ["Hybrid Automaton", "Stochastic HA", "Timed Automata"],
        save_path=os.path.join(output_dir, "comparison_hybrid.png")
    )

    # Comparison 4: Simulation-Focused
    plot_comparison(
        ["System Dynamics", "Agent-Based Model", "Hybrid Automaton"],
        save_path=os.path.join(output_dir, "comparison_simulation.png")
    )

    # Comparison 5: All (overview)
    plot_comparison(
        list(FORMALISM_SCORES.keys()),
        save_path=os.path.join(output_dir, "comparison_all.png")
    )


def plot_all_weighted_profiles(output_dir="diagrams"):
    """Generate weighted comparison graphs for all GM profiles"""
    import os
    os.makedirs(output_dir, exist_ok=True)

    for profile_key, profile_data in GM_PROFILES.items():
        save_path = os.path.join(output_dir, f"weighted_{profile_key}_profile.png")
        plot_weighted_comparison(
            list(FORMALISM_SCORES.keys()),
            weights=profile_data["weights"],
            profile_name=profile_data["name"],
            save_path=save_path
        )


def print_scores_table(weights=None, profile_name=None):
    """
    Print ASCII table of all scores

    Args:
        weights (list): Optional dimension weights for weighted scoring
        profile_name (str): Optional name of profile for display
    """
    if weights:
        print(f"\n{'='*100}")
        print(f"Weighted Scores: {profile_name or 'Custom Profile'}")
        print(f"{'='*100}")
        print(f"Weights: {weights}")
        print(f"{'='*100}")
        print(f"{'Formalism':<20} | Weighted Score (0-5)")
        print(f"{'='*100}")

        rankings = get_weighted_rankings(weights)
        for i, (formalism, score) in enumerate(rankings, 1):
            print(f"{i}. {formalism:<18} | {score:.3f}")

        print(f"{'='*100}\n")
    else:
        print("\n" + "="*100)
        print(f"{'Formalism':<20} | Express | Tract | Learn | Verify | Cont | Stoch | Modul | Tools | Total")
        print("="*100)

        for formalism, scores in FORMALISM_SCORES.items():
            total = sum(scores)
            scores_str = " | ".join(f"{s:5}" for s in scores)
            print(f"{formalism:<20} | {scores_str} | {total:5}")

        print("="*100)


def print_all_profiles():
    """Print rankings for all GM profiles"""
    print("\n" + "="*120)
    print("GM PROFILE RECOMMENDATIONS")
    print("="*120)

    for profile_key, profile_data in GM_PROFILES.items():
        print(f"\n{profile_data['name'].upper()}")
        print(f"Description: {profile_data['description']}")
        print("-" * 100)

        rankings = get_weighted_rankings(profile_data["weights"], top_n=3)
        print("Top 3 Recommended Formalisms:")
        for i, (formalism, score) in enumerate(rankings, 1):
            print(f"  {i}. {formalism:<25} (score: {score:.3f}/5.0)")

    print("\n" + "="*120)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate spider graphs for formalism comparison",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate all unweighted graphs
  python spider_graphs.py --all

  # Show weighted rankings for safety-critical profile
  python spider_graphs.py --profile safety --table

  # Generate weighted graphs for all profiles
  python spider_graphs.py --weighted

  # Show all profile recommendations
  python spider_graphs.py --profiles

  # Custom weights (comma-separated, 8 values)
  python spider_graphs.py --custom-weights 1,2,3,10,5,4,3,2 --table
        """
    )
    parser.add_argument("--individual", action="store_true", help="Generate individual graphs")
    parser.add_argument("--comparisons", action="store_true", help="Generate comparison graphs")
    parser.add_argument("--table", action="store_true", help="Print scores table")
    parser.add_argument("--all", action="store_true", help="Generate all outputs (unweighted)")
    parser.add_argument("--weighted", action="store_true", help="Generate weighted graphs for all GM profiles")
    parser.add_argument("--profiles", action="store_true", help="Print recommendations for all GM profiles")
    parser.add_argument("--profile", choices=list(GM_PROFILES.keys()),
                        help="Use specific GM profile for weighted scoring")
    parser.add_argument("--custom-weights", type=str,
                        help="Custom weights (comma-separated, 8 values)")
    parser.add_argument("--output", default="diagrams", help="Output directory")

    args = parser.parse_args()

    # Parse custom weights if provided
    weights = None
    profile_name = None

    if args.custom_weights:
        try:
            weights = [float(w.strip()) for w in args.custom_weights.split(",")]
            if len(weights) != 8:
                print(f"Error: Expected 8 weights, got {len(weights)}")
                exit(1)
            profile_name = "Custom Weights"
        except ValueError as e:
            print(f"Error parsing weights: {e}")
            exit(1)
    elif args.profile:
        weights = GM_PROFILES[args.profile]["weights"]
        profile_name = GM_PROFILES[args.profile]["name"]

    # Print profiles overview
    if args.profiles:
        print_all_profiles()

    # Print table (weighted or unweighted)
    if args.table or args.all:
        if weights:
            print_scores_table(weights, profile_name)
        else:
            print_scores_table()

    # Generate graphs
    if args.individual or args.all:
        print("\nGenerating individual spider graphs...")
        plot_all_individual(args.output)

    if args.comparisons or args.all:
        print("\nGenerating comparison spider graphs...")
        plot_use_case_comparisons(args.output)

    if args.weighted:
        print("\nGenerating weighted spider graphs for all GM profiles...")
        plot_all_weighted_profiles(args.output)

    # Default behavior if no args provided
    if not any([args.individual, args.comparisons, args.table, args.all,
                args.weighted, args.profiles, args.profile, args.custom_weights]):
        print("No arguments provided. Showing example comparison...")
        print("Use --help to see all options\n")
        print_scores_table()
        print("\nExample GM profile (Safety-Critical):")
        safety_weights = GM_PROFILES["safety"]["weights"]
        print_scores_table(safety_weights, GM_PROFILES["safety"]["name"])
