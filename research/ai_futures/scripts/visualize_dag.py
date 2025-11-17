#!/usr/bin/env python3
"""
Visualize AI-2027 State Machine as a DAG

Reads state_machine_preliminary.json and generates visualization showing:
- States as nodes
- Transitions as edges
- Assumptions and evidence annotated
- Epistemic scores color-coded
"""

import json
import sys
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import networkx as nx
from typing import Dict, List, Any

# Add color schemes
EPISTEMIC_COLORS = {
    'very_low': '#ff4444',    # Red: 0.0 - 0.2
    'low': '#ff8844',         # Orange: 0.2 - 0.4
    'medium': '#ffcc44',      # Yellow: 0.4 - 0.6
    'high': '#88cc44',        # Light green: 0.6 - 0.8
    'very_high': '#44cc44',   # Green: 0.8 - 1.0
}

def get_epistemic_color(score: float) -> str:
    """Map epistemic score to color"""
    if score < 0.2:
        return EPISTEMIC_COLORS['very_low']
    elif score < 0.4:
        return EPISTEMIC_COLORS['low']
    elif score < 0.6:
        return EPISTEMIC_COLORS['medium']
    elif score < 0.8:
        return EPISTEMIC_COLORS['high']
    else:
        return EPISTEMIC_COLORS['very_high']

def load_state_machine(json_path: Path) -> Dict[str, Any]:
    """Load state machine from JSON"""
    with open(json_path, 'r') as f:
        return json.load(f)

def create_dag(data: Dict[str, Any]) -> nx.DiGraph:
    """Create NetworkX directed graph from state machine data"""
    G = nx.DiGraph()

    # Add nodes (states)
    for state in data['states']:
        # Calculate average epistemic score for this state's evidence
        avg_score = 0
        if 'evidence' in state and state['evidence']:
            scores = [e['epistemic_score'] for e in state['evidence']]
            avg_score = sum(scores) / len(scores)

        G.add_node(
            state['id'],
            label=state['name'],
            description=state['description'][:100] + '...',
            epistemic_score=avg_score,
            color=get_epistemic_color(avg_score)
        )

    # Add edges (transitions)
    for transition in data['transitions']:
        # Calculate average epistemic score for transition assumptions
        avg_score = 0
        if 'assumptions' in transition and transition['assumptions']:
            scores = [a['epistemic_score'] for a in transition['assumptions']]
            avg_score = sum(scores) / len(scores)

        G.add_edge(
            transition['from'],
            transition['to'],
            event=transition['event'],
            description=transition['description'][:100] + '...',
            epistemic_score=avg_score,
            color=get_epistemic_color(avg_score),
            width=2 + avg_score * 3  # Thicker edges for higher confidence
        )

    return G

def visualize_dag(G: nx.DiGraph, output_path: Path):
    """Create visualization of the DAG"""
    fig, ax = plt.subplots(figsize=(20, 16))

    # Create hierarchical layout (timeline-based)
    # Manual positioning for better clarity
    pos = {
        'S0': (0, 5),
        'S1': (2, 5),
        'S2': (4, 5),
        'S3': (6, 5),
        'S4': (8, 5),
        'S5': (10, 5),
        'S6a': (12, 6),  # Utopia branch higher
        'S6b': (12, 4),  # Doom branch lower
    }

    # Draw edges with color-coded confidence
    for (u, v, data) in G.edges(data=True):
        ax.annotate(
            '',
            xy=pos[v], xycoords='data',
            xytext=pos[u], textcoords='data',
            arrowprops=dict(
                arrowstyle='->',
                color=data['color'],
                lw=data['width'],
                connectionstyle="arc3,rad=0.1"
            )
        )

        # Add edge labels (event name)
        mid_x = (pos[u][0] + pos[v][0]) / 2
        mid_y = (pos[u][1] + pos[v][1]) / 2 + 0.3
        ax.text(
            mid_x, mid_y,
            data['event'],
            fontsize=8,
            ha='center',
            va='bottom',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8, edgecolor='gray')
        )

    # Draw nodes with color-coded confidence
    for node, (x, y) in pos.items():
        node_data = G.nodes[node]

        # Draw node box
        box = FancyBboxPatch(
            (x - 0.8, y - 0.4), 1.6, 0.8,
            boxstyle="round,pad=0.1",
            facecolor=node_data['color'],
            edgecolor='black',
            linewidth=2,
            alpha=0.7
        )
        ax.add_patch(box)

        # Draw node label
        ax.text(
            x, y,
            node_data['label'],
            fontsize=10,
            ha='center',
            va='center',
            weight='bold',
            wrap=True
        )

        # Add epistemic score annotation
        ax.text(
            x, y - 0.5,
            f"ε={node_data['epistemic_score']:.2f}",
            fontsize=7,
            ha='center',
            va='top',
            style='italic',
            color='darkgray'
        )

    # Add legend for epistemic scores
    legend_elements = [
        mpatches.Patch(color=EPISTEMIC_COLORS['very_high'], label='Very High (0.8-1.0)'),
        mpatches.Patch(color=EPISTEMIC_COLORS['high'], label='High (0.6-0.8)'),
        mpatches.Patch(color=EPISTEMIC_COLORS['medium'], label='Medium (0.4-0.6)'),
        mpatches.Patch(color=EPISTEMIC_COLORS['low'], label='Low (0.2-0.4)'),
        mpatches.Patch(color=EPISTEMIC_COLORS['very_low'], label='Very Low (0.0-0.2)'),
    ]
    ax.legend(
        handles=legend_elements,
        loc='upper left',
        title='Epistemic Confidence',
        fontsize=9
    )

    # Add title and metadata
    ax.set_title(
        'AI-2027 State Machine: Timeline and Epistemic Confidence\n' +
        '(Preliminary Analysis - Based on Secondary Sources)',
        fontsize=16,
        weight='bold',
        pad=20
    )

    # Add timeline axis
    ax.set_xlabel('Timeline →', fontsize=12, weight='bold')
    timeline_labels = ['2024-Q4', '2025-H1', '2026-H1', '2026-H2', '2027-Q1', '2027-Q2', '2027-Q4']
    ax.set_xticks([0, 2, 4, 6, 8, 10, 12])
    ax.set_xticklabels(timeline_labels, fontsize=10)

    # Remove y-axis
    ax.set_yticks([])
    ax.spines['left'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['top'].set_visible(False)

    # Set axis limits
    ax.set_xlim(-1, 14)
    ax.set_ylim(2, 8)

    # Add watermark
    ax.text(
        0.99, 0.01,
        'Generated from preliminary analysis - verification needed',
        transform=ax.transAxes,
        fontsize=8,
        ha='right',
        va='bottom',
        style='italic',
        color='gray',
        alpha=0.5
    )

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"✓ Saved visualization to {output_path}")

def print_summary(data: Dict[str, Any]):
    """Print text summary of the state machine"""
    print("\n" + "="*80)
    print("AI-2027 STATE MACHINE SUMMARY")
    print("="*80)

    print(f"\nMetadata:")
    print(f"  Title: {data['metadata']['title']}")
    print(f"  Authors: {', '.join(data['metadata']['authors'])}")
    print(f"  Confidence: {data['metadata']['confidence']}")
    print(f"  Limitation: {data['metadata']['limitation']}")

    print(f"\nStates: {len(data['states'])}")
    for state in data['states']:
        print(f"\n  [{state['id']}] {state['name']}")
        print(f"      {state['description'][:120]}...")
        if 'from_nodes' in state:
            print(f"      From: {', '.join(state['from_nodes']) if state['from_nodes'] else 'START'}")
            print(f"      To: {', '.join(state['to_nodes']) if state['to_nodes'] else 'END'}")

    print(f"\n\nTransitions: {len(data['transitions'])}")
    for trans in data['transitions']:
        print(f"\n  {trans['from']} → {trans['to']}")
        print(f"      Event: {trans['event']}")
        print(f"      Assumptions: {len(trans.get('assumptions', []))}")
        avg_score = sum(a['epistemic_score'] for a in trans.get('assumptions', [])) / max(len(trans.get('assumptions', [])), 1)
        print(f"      Avg Epistemic Score: {avg_score:.2f}")

    print(f"\n\nKey Assumptions: {len(data['key_assumptions'])}")
    for assumption in data['key_assumptions']:
        print(f"\n  [{assumption['id']}] {assumption['category']}: {assumption['description']}")
        print(f"      Epistemic: {assumption['epistemic_score']:.2f} | NLI: {assumption['nli_consistency']:.2f}")
        print(f"      Rationale: {assumption['rationale'][:100]}...")

    print(f"\n\nCritiques: {len(data['critiques'])}")
    for critique in data['critiques']:
        print(f"\n  {critique['author']} ({critique['source']})")
        for point in critique['main_points']:
            print(f"    • {point}")

    print("\n" + "="*80)

def export_to_mermaid(data: Dict[str, Any], output_path: Path):
    """Export state machine to Mermaid diagram format"""
    lines = ["```mermaid", "graph LR"]

    # Add states
    for state in data['states']:
        # Escape special characters and truncate
        label = state['name'].replace('"', "'")[:50]

        # Style based on node type
        if state['id'] in ['S6a', 'S6b']:
            shape = f'{state["id"]}["{label}"]:::endpoint'
        else:
            shape = f'{state["id"]}["{label}"]'

        lines.append(f"    {shape}")

    # Add transitions
    for trans in data['transitions']:
        event = trans['event'].replace('"', "'")[:40]
        avg_score = sum(a['epistemic_score'] for a in trans.get('assumptions', [])) / max(len(trans.get('assumptions', [])), 1)
        lines.append(f'    {trans["from"]} -->|"{event}<br/>ε={avg_score:.2f}"| {trans["to"]}')

    # Add styling
    lines.extend([
        "",
        "    classDef endpoint fill:#f9f,stroke:#333,stroke-width:4px;",
        "```"
    ])

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"✓ Saved Mermaid diagram to {output_path}")

def export_assumptions_table(data: Dict[str, Any], output_path: Path):
    """Export assumptions as markdown table"""
    lines = [
        "# AI-2027 Key Assumptions",
        "",
        "| ID | Category | Description | Epistemic Score | NLI Score | Rationale |",
        "|---|---|---|:---:|:---:|---|"
    ]

    for assumption in data['key_assumptions']:
        lines.append(
            f"| {assumption['id']} | "
            f"{assumption['category']} | "
            f"{assumption['description']} | "
            f"{assumption['epistemic_score']:.2f} | "
            f"{assumption['nli_consistency']:.2f} | "
            f"{assumption['rationale'][:80]}... |"
        )

    lines.extend([
        "",
        "## Epistemic Score Legend",
        "- **0.8-1.0**: Very high confidence - widely observable, well-established",
        "- **0.6-0.8**: High confidence - strong evidence, few counterexamples",
        "- **0.4-0.6**: Medium confidence - unclear, competing evidence",
        "- **0.2-0.4**: Low confidence - speculative, weak evidence",
        "- **0.0-0.2**: Very low confidence - highly speculative, no precedent",
        "",
        "## NLI Score Legend",
        "- **0.8-1.0**: Highly consistent - follows logically from other assumptions",
        "- **0.6-0.8**: Mostly consistent - some tension but resolvable",
        "- **0.4-0.6**: Partially consistent - notable tensions exist",
        "- **0.2-0.4**: Inconsistent - contradicts other parts of scenario",
        "- **0.0-0.2**: Highly inconsistent - major logical conflicts",
    ])

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"✓ Saved assumptions table to {output_path}")

def main():
    # Paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    analysis_dir = project_root / 'analysis'
    output_dir = project_root / 'output'
    output_dir.mkdir(exist_ok=True)

    # Load data
    json_path = analysis_dir / 'state_machine_preliminary.json'
    if not json_path.exists():
        print(f"❌ Error: {json_path} not found")
        sys.exit(1)

    print(f"Loading state machine from {json_path}...")
    data = load_state_machine(json_path)

    # Print summary
    print_summary(data)

    # Create visualizations
    print("\nGenerating visualizations...")

    # 1. NetworkX DAG
    G = create_dag(data)
    visualize_dag(G, output_dir / 'state_machine_dag.png')

    # 2. Mermaid diagram
    export_to_mermaid(data, output_dir / 'state_machine.mmd')

    # 3. Assumptions table
    export_assumptions_table(data, output_dir / 'assumptions_table.md')

    print(f"\n✓ All outputs saved to {output_dir}/")
    print("\nFiles generated:")
    print("  - state_machine_dag.png (DAG visualization)")
    print("  - state_machine.mmd (Mermaid diagram)")
    print("  - assumptions_table.md (Assumptions table)")

if __name__ == '__main__':
    main()
