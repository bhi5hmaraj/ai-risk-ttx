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

    scores = FORMALISM_SCORES[formalism_name]
    scores += scores[:1]  # Close the polygon

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
        scores = FORMALISM_SCORES[formalism]
        scores += scores[:1]  # Close the polygon

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


def print_scores_table():
    """Print ASCII table of all scores"""
    print("\n" + "="*100)
    print(f"{'Formalism':<20} | Express | Tract | Learn | Verify | Cont | Stoch | Modul | Tools | Total")
    print("="*100)

    for formalism, scores in FORMALISM_SCORES.items():
        total = sum(scores)
        scores_str = " | ".join(f"{s:5}" for s in scores)
        print(f"{formalism:<20} | {scores_str} | {total:5}")

    print("="*100)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate spider graphs for formalism comparison")
    parser.add_argument("--individual", action="store_true", help="Generate individual graphs")
    parser.add_argument("--comparisons", action="store_true", help="Generate comparison graphs")
    parser.add_argument("--table", action="store_true", help="Print scores table")
    parser.add_argument("--all", action="store_true", help="Generate all outputs")
    parser.add_argument("--output", default="diagrams", help="Output directory")

    args = parser.parse_args()

    if args.table or args.all:
        print_scores_table()

    if args.individual or args.all:
        print("\nGenerating individual spider graphs...")
        plot_all_individual(args.output)

    if args.comparisons or args.all:
        print("\nGenerating comparison spider graphs...")
        plot_use_case_comparisons(args.output)

    if not any([args.individual, args.comparisons, args.table, args.all]):
        # Default: show example comparison
        print("No arguments provided. Showing example comparison...")
        print("Use --help to see all options")
        print_scores_table()
        plot_comparison(["System Dynamics", "Hybrid Automaton", "Kripke"])
