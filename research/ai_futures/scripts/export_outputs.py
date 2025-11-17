#!/usr/bin/env python3
"""
Export AI-2027 State Machine to various formats (no external dependencies)

Generates text-based outputs from state_machine_preliminary.json:
- Mermaid diagram
- Markdown assumptions table
- ASCII art DAG
- Text summary
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any

def load_state_machine(json_path: Path) -> Dict[str, Any]:
    """Load state machine from JSON"""
    with open(json_path, 'r') as f:
        return json.load(f)

def export_to_mermaid(data: Dict[str, Any], output_path: Path):
    """Export state machine to Mermaid diagram format"""
    lines = ["```mermaid", "graph TD"]

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

    # Add transitions with epistemic scores
    for trans in data['transitions']:
        event = trans['event'].replace('"', "'")[:40]
        assumptions = trans.get('assumptions', [])
        if assumptions:
            avg_score = sum(a['epistemic_score'] for a in assumptions) / len(assumptions)
            lines.append(f'    {trans["from"]} -->|"{event}<br/>ε={avg_score:.2f}"| {trans["to"]}')
        else:
            lines.append(f'    {trans["from"]} -->|"{event}"| {trans["to"]}')

    # Add styling
    lines.extend([
        "",
        "    classDef endpoint fill:#f9f,stroke:#333,stroke-width:4px;",
        "    classDef high_confidence fill:#44cc44,stroke:#333;",
        "    classDef low_confidence fill:#ff4444,stroke:#333;",
        "```"
    ])

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"✓ Saved Mermaid diagram to {output_path}")

def export_assumptions_table(data: Dict[str, Any], output_path: Path):
    """Export assumptions as markdown table"""
    lines = [
        "# AI-2027 Key Assumptions Analysis",
        "",
        "**Status:** Preliminary - Based on secondary sources",
        "**Primary sources blocked:** All main websites returned 403 errors",
        "",
        "## Assumptions Catalog",
        "",
        "| ID | Category | Description | Epistemic | NLI | Rationale |",
        "|---|---|---|:---:|:---:|---|"
    ]

    for assumption in data['key_assumptions']:
        lines.append(
            f"| {assumption['id']} | "
            f"{assumption['category']} | "
            f"{assumption['description']} | "
            f"{assumption['epistemic_score']:.2f} | "
            f"{assumption['nli_consistency']:.2f} | "
            f"{assumption['rationale'][:100]}... |"
        )

    lines.extend([
        "",
        "## Score Legends",
        "",
        "### Epistemic Confidence Score",
        "- **0.8-1.0**: Very high - widely observable, well-established",
        "- **0.6-0.8**: High - strong evidence, few counterexamples",
        "- **0.4-0.6**: Medium - unclear, competing evidence",
        "- **0.2-0.4**: Low - speculative, weak evidence",
        "- **0.0-0.2**: Very low - highly speculative, no precedent",
        "",
        "### NLI (Natural Language Inference) Consistency Score",
        "- **0.8-1.0**: Highly consistent - follows logically from other assumptions",
        "- **0.6-0.8**: Mostly consistent - some tension but resolvable",
        "- **0.4-0.6**: Partially consistent - notable tensions exist",
        "- **0.2-0.4**: Inconsistent - contradicts other parts of scenario",
        "- **0.0-0.2**: Highly inconsistent - major logical conflicts",
        "",
        "## Transition Assumptions",
        ""
    ])

    # Add detailed transition assumptions
    for trans in data['transitions']:
        if 'assumptions' not in trans or not trans['assumptions']:
            continue

        lines.append(f"### {trans['from']} → {trans['to']}: {trans['event']}")
        lines.append("")

        for assumption in trans['assumptions']:
            lines.extend([
                f"**[{assumption['id']}]** {assumption['description']}",
                f"- **Epistemic Score:** {assumption['epistemic_score']:.2f}",
                f"- **NLI Consistency:** {assumption['nli_consistency']:.2f}",
                f"- **Rationale:** {assumption['rationale']}",
                f"- **Source:** {assumption['source']}",
                ""
            ])

    lines.extend([
        "## Critiques",
        ""
    ])

    for critique in data['critiques']:
        lines.append(f"### {critique['author']} - {critique['source']}")
        lines.append("")
        for point in critique['main_points']:
            lines.append(f"- {point}")
        lines.append("")

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"✓ Saved assumptions table to {output_path}")

def export_ascii_dag(data: Dict[str, Any], output_path: Path):
    """Export ASCII art visualization of the DAG"""
    lines = [
        "AI-2027 STATE MACHINE - ASCII VISUALIZATION",
        "=" * 80,
        "",
        "Timeline: 2024 Q4 → 2027 Q4",
        "",
        "Legend:",
        "  [ε=X.XX] = Average epistemic confidence score for that state/transition",
        "  Colors not available in ASCII - see Mermaid diagram for visual",
        "",
        "=" * 80,
        "",
    ]

    # Build ASCII timeline
    timeline = [
        "                     2025              2026              2027",
        "    ├────────────────┼────────────────┼────────────────┼───────────────>",
        ""
    ]

    # Simple linear representation
    ascii_graph = [
        "    [S0: Current]",
        "         │",
        "         │ Scaling + Unhobbling",
        "         ▼",
        "    [S1: Unreliable Agents] [ε=0.30]",
        "         │",
        "         │ AI Research Acceleration",
        "         ▼",
        "    [S2: Agent-1 (50% boost)] [ε=0.27]",
        "         │",
        "         │ Commoditization",
        "         ▼",
        "    [S3: Agent-1-mini (10x cheaper)] [ε=0.40]",
        "         │",
        "         │ Online Learning",
        "         ▼",
        "    [S4: Agent-2 (Continuous Learning)] [ε=0.25]",
        "         │",
        "         │ Architectural Breakthroughs",
        "         ▼",
        "    [S5: Neuralese + IDA] [ε=0.17]",
        "         │",
        "         ├───────────────┬───────────────┐",
        "         │               │               │",
        "         │               │               │",
        "    Successful      Alignment       Alignment",
        "    Alignment       Uncertain       Failure",
        "         │               │               │",
        "         ▼               ▼               ▼",
        "    [S6a: Utopia]   [????]      [S6b: Takeover]",
        "    [ε=0.10]                        [ε=0.25]",
        "",
    ]

    lines.extend(timeline)
    lines.extend(ascii_graph)

    # Add state details
    lines.extend([
        "",
        "=" * 80,
        "STATE DETAILS",
        "=" * 80,
        ""
    ])

    for state in data['states']:
        lines.append(f"[{state['id']}] {state['name']}")
        lines.append(f"    {state['description'][:120]}...")

        if state.get('evidence'):
            avg_score = sum(e['epistemic_score'] for e in state['evidence']) / len(state['evidence'])
            lines.append(f"    Average Epistemic Score: {avg_score:.2f}")

        lines.append("")

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"✓ Saved ASCII DAG to {output_path}")

def export_summary(data: Dict[str, Any], output_path: Path):
    """Export comprehensive text summary"""
    lines = [
        "=" * 80,
        "AI-2027 STATE MACHINE ANALYSIS SUMMARY",
        "=" * 80,
        "",
        "## Metadata",
        f"  Title: {data['metadata']['title']}",
        f"  Authors: {', '.join(data['metadata']['authors'])}",
        f"  Organization: {data['metadata']['organization']}",
        f"  Created: {data['metadata']['created']}",
        f"  Confidence: {data['metadata']['confidence']}",
        f"  Limitation: {data['metadata']['limitation']}",
        "",
        "=" * 80,
        "STATES OVERVIEW",
        "=" * 80,
        "",
        f"Total States: {len(data['states'])}",
        ""
    ]

    for state in data['states']:
        lines.extend([
            f"## [{state['id']}] {state['name']}",
            "",
            f"**Description:** {state['description']}",
            "",
            "**Capabilities:**"
        ])

        if 'capabilities' in state:
            for key, value in state['capabilities'].items():
                lines.append(f"  - {key.replace('_', ' ').title()}: {value}")

        lines.extend([
            "",
            f"**Economic Impact:** {state.get('economic_impact', 'N/A')}",
            "",
            f"**Incoming:** {', '.join(state.get('from_nodes', [])) or 'START'}",
            f"**Outgoing:** {', '.join(state.get('to_nodes', [])) or 'END'}",
            ""
        ])

        if state.get('evidence'):
            lines.append("**Evidence:**")
            for ev in state['evidence']:
                lines.extend([
                    f"  - {ev['claim']}",
                    f"    Epistemic: {ev['epistemic_score']:.2f}",
                    f"    Rationale: {ev['rationale']}",
                    ""
                ])

        lines.append("")

    lines.extend([
        "=" * 80,
        "TRANSITIONS",
        "=" * 80,
        "",
        f"Total Transitions: {len(data['transitions'])}",
        ""
    ])

    for trans in data['transitions']:
        lines.extend([
            f"## {trans['from']} → {trans['to']}: {trans['event']}",
            "",
            f"**Description:** {trans['description']}",
            "",
            f"**Evidence:** {trans.get('evidence', 'N/A')}",
            ""
        ])

        if trans.get('assumptions'):
            lines.append(f"**Assumptions ({len(trans['assumptions'])}):**")
            lines.append("")
            for assumption in trans['assumptions']:
                lines.extend([
                    f"  [{assumption['id']}] {assumption['description']}",
                    f"  - Epistemic: {assumption['epistemic_score']:.2f}",
                    f"  - NLI: {assumption['nli_consistency']:.2f}",
                    f"  - Rationale: {assumption['rationale']}",
                    ""
                ])

        lines.append("")

    lines.extend([
        "=" * 80,
        "KEY ASSUMPTIONS SUMMARY",
        "=" * 80,
        ""
    ])

    for assumption in data['key_assumptions']:
        lines.extend([
            f"## [{assumption['id']}] {assumption['category']}: {assumption['description']}",
            "",
            f"**Epistemic Score:** {assumption['epistemic_score']:.2f}",
            f"**NLI Consistency:** {assumption['nli_consistency']:.2f}",
            f"**Source:** {assumption['source']}",
            "",
            f"**Rationale:** {assumption['rationale']}",
            ""
        ])

    lines.extend([
        "=" * 80,
        "CRITIQUES",
        "=" * 80,
        ""
    ])

    for critique in data['critiques']:
        lines.extend([
            f"## {critique['author']} - {critique['source']}",
            ""
        ])
        for point in critique['main_points']:
            lines.append(f"- {point}")
        lines.append("")

    lines.extend([
        "=" * 80,
        "NOTES",
        "=" * 80,
        ""
    ])

    for note in data.get('notes', []):
        lines.append(f"- {note}")

    lines.append("")
    lines.append("=" * 80)

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"✓ Saved summary to {output_path}")

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

    print("\nGenerating outputs...")

    # Generate all outputs
    export_to_mermaid(data, output_dir / 'state_machine.mmd')
    export_assumptions_table(data, output_dir / 'assumptions_table.md')
    export_ascii_dag(data, output_dir / 'ascii_dag.txt')
    export_summary(data, output_dir / 'summary.txt')

    print(f"\n✓ All outputs saved to {output_dir}/")
    print("\nFiles generated:")
    print("  - state_machine.mmd (Mermaid diagram - paste into mermaid.live)")
    print("  - assumptions_table.md (Markdown table of all assumptions)")
    print("  - ascii_dag.txt (Text-based DAG visualization)")
    print("  - summary.txt (Complete text summary)")
    print("\nTo generate PNG visualization (requires matplotlib):")
    print("  pip install -r ../requirements.txt")
    print("  python visualize_dag.py")

if __name__ == '__main__':
    main()
