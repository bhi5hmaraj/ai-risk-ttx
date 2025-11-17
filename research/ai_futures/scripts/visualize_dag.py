#!/usr/bin/env python3
"""
Visualize the AI2027 Causal DAG.

Creates multiple views:
1. Mermaid diagram for the full state machine
2. Epistemic confidence heatmap
3. Assumption weakness report
"""

import json
from typing import Dict, List, Any


def load_dag(path: str) -> Dict:
    with open(path) as f:
        return json.load(f)


def generate_mermaid_diagram(dag: Dict) -> str:
    """Generate Mermaid flowchart of the DAG"""

    lines = ["```mermaid", "graph TD"]

    # Add nodes
    for node_id, node in dag['nodes'].items():
        prob = node.get('probability', 0.0)
        prob_str = f"<br/>P={prob:.1f}" if prob else ""
        time_str = f"<br/>{node.get('estimated_time', '')}" if node.get('estimated_time') else ""
        label = f"{node['name']}{time_str}{prob_str}"
        lines.append(f"    {node_id}[\"{label}\"]")

    lines.append("")

    # Add links with labels
    for link_id, link in dag['links'].items():
        confidence = link.get('epistemic_confidence', 0.0)
        color = "green" if confidence > 0.6 else ("orange" if confidence > 0.3 else "red")

        # Shorter trigger description
        trigger = link['trigger_event'][:50] + "..." if len(link['trigger_event']) > 50 else link['trigger_event']

        lines.append(
            f"    {link['from_state']} -->|{trigger}<br/>conf:{confidence:.2f}| {link['to_state']}"
        )

        # Add styling for contested links
        if link.get('contested'):
            lines.append(f"    linkStyle {link_id} stroke:#ff0000,stroke-width:2px")

    lines.append("```")

    return "\n".join(lines)


def generate_assumption_report(dag: Dict) -> str:
    """Generate markdown report of all assumptions with scores"""

    lines = ["# Assumption Analysis Report\n"]

    # Collect all assumptions
    all_assumptions = []
    for link_id, link in dag['links'].items():
        for assumption in link.get('assumptions', []):
            all_assumptions.append({
                'link': link_id,
                'trigger': link['trigger_event'],
                'assumption': assumption
            })

    # Sort by epistemic score (weakest first)
    all_assumptions.sort(key=lambda x: x['assumption']['epistemic_score'])

    lines.append("## Weakest Assumptions (Most Questionable)\n")

    for item in all_assumptions[:10]:  # Top 10 weakest
        assumption = item['assumption']
        score = assumption['epistemic_score']
        emoji = "🔴" if score < 0 else ("🟡" if score < 0.5 else "🟢")

        lines.append(f"### {emoji} {assumption['description']}")
        lines.append(f"**Link:** {item['trigger']}")
        lines.append(f"**Epistemic Score:** {score:.2f}")
        lines.append(f"**Rationale:** {assumption['rationale']}")

        if assumption.get('citations'):
            lines.append("\n**Citations:**")
            for citation in assumption['citations']:
                lines.append(f"- {citation['source']}: \"{citation['snippet']}\"")

        if assumption.get('contested_by'):
            lines.append("\n**Contested by:**")
            for counter in assumption['contested_by']:
                lines.append(f"- {counter}")

        lines.append("")

    return "\n".join(lines)


def generate_link_summary(dag: Dict) -> str:
    """Generate summary table of all causal links"""

    lines = ["# Causal Links Summary\n"]
    lines.append("| From State | To State | Trigger | Confidence | Contested |")
    lines.append("|------------|----------|---------|------------|-----------|")

    for link_id, link in dag['links'].items():
        from_state = dag['nodes'][link['from_state']]['name'][:20]
        to_state = dag['nodes'][link['to_state']]['name'][:20]
        trigger = link['trigger_event'][:40]
        conf = link['epistemic_confidence']
        contested = "⚠️" if link.get('contested') else "✓"

        lines.append(f"| {from_state} | {to_state} | {trigger} | {conf:.2f} | {contested} |")

    return "\n".join(lines)


def generate_state_machine_summary(dag: Dict) -> str:
    """Generate high-level state machine summary"""

    lines = ["# State Machine Summary\n"]

    # Topological ordering (simple version - just by estimated time)
    states_by_time = []
    for node_id, node in dag['nodes'].items():
        states_by_time.append((node.get('estimated_time', 'unknown'), node_id, node))

    states_by_time.sort()

    for time, node_id, node in states_by_time:
        prob = node.get('probability', 'unknown')
        lines.append(f"## {node['name']} ({time}, P={prob})")
        lines.append(f"\n{node['description']}\n")

        # Key variables
        lines.append("**Key Variables:**")
        for var_name, var in list(node.get('variables', {}).items())[:5]:  # Top 5
            if hasattr(var, 'get'):
                current = var.get('current_value', 'N/A')
                lines.append(f"- {var.get('name', var_name)}: {current}")

        # Outgoing transitions
        outgoing = node.get('outgoing_links', [])
        if outgoing:
            lines.append("\n**Possible Transitions:**")
            for link_id in outgoing:
                link = dag['links'].get(link_id)
                if link:
                    to_node = dag['nodes'][link['to_state']]['name']
                    trigger = link['trigger_event'][:60]
                    lines.append(f"- → {to_node}: \"{trigger}\"")

        lines.append("")

    return "\n".join(lines)


def generate_dag_table_view(dag: Dict) -> str:
    """Generate comprehensive table view of the entire DAG"""

    lines = ["# AI2027 DAG: Complete Table View\n"]

    # States table
    lines.append("## States\n")
    lines.append("| State | Time | Probability | Description | Key Variables |")
    lines.append("|-------|------|-------------|-------------|---------------|")

    # Sort by time
    states_by_time = []
    for node_id, node in dag['nodes'].items():
        states_by_time.append((node.get('estimated_time', 'unknown'), node_id, node))
    states_by_time.sort()

    for time, node_id, node in states_by_time:
        name = node['name']
        prob = f"{node.get('probability', 0.0):.1f}"
        desc = node['description'][:60] + "..." if len(node['description']) > 60 else node['description']

        # Get top 2 key variables
        vars_list = []
        for var_name, var in list(node.get('variables', {}).items())[:2]:
            if hasattr(var, 'get'):
                vars_list.append(f"{var.get('name', var_name)}")
        key_vars = ", ".join(vars_list) if vars_list else "—"

        lines.append(f"| {name} | {time} | {prob} | {desc} | {key_vars} |")

    lines.append("")

    # Transitions table
    lines.append("## Transitions (Causal Links)\n")
    lines.append("| From → To | Trigger Event | Mechanism | Confidence | Status |")
    lines.append("|-----------|---------------|-----------|------------|--------|")

    # Sort by confidence (strongest first)
    sorted_links = sorted(dag['links'].items(),
                         key=lambda x: x[1]['epistemic_confidence'],
                         reverse=True)

    for link_id, link in sorted_links:
        from_name = dag['nodes'][link['from_state']]['name']
        to_name = dag['nodes'][link['to_state']]['name']
        transition = f"{from_name[:20]}... → {to_name[:20]}..."

        trigger = link['trigger_event'][:35] + "..." if len(link['trigger_event']) > 35 else link['trigger_event']
        mechanism = link['mechanism'][:35] + "..." if len(link['mechanism']) > 35 else link['mechanism']
        conf = link['epistemic_confidence']

        # Color coding
        if conf > 0.6:
            status = "🟢 Strong"
        elif conf > 0.3:
            status = "🟡 Moderate"
        elif conf > 0:
            status = "🟠 Weak"
        else:
            status = "🔴 Contested"

        if link.get('contested'):
            status += " ⚠️"

        lines.append(f"| {transition} | {trigger} | {mechanism} | {conf:.2f} | {status} |")

    lines.append("")

    # Key assumptions table
    lines.append("## Key Assumptions (Sorted by Epistemic Score)\n")
    lines.append("| Assumption | Score | Link | Evidence Type |")
    lines.append("|------------|-------|------|---------------|")

    # Collect all assumptions
    all_assumptions = []
    for link_id, link in dag['links'].items():
        for assumption in link.get('assumptions', []):
            all_assumptions.append({
                'link_id': link_id,
                'link_name': f"{dag['nodes'][link['from_state']]['name'][:15]} → {dag['nodes'][link['to_state']]['name'][:15]}",
                'assumption': assumption
            })

    # Sort by score (weakest first for table)
    all_assumptions.sort(key=lambda x: x['assumption']['epistemic_score'])

    for item in all_assumptions[:12]:  # Show all 12
        assump = item['assumption']
        desc = assump['description'][:50] + "..." if len(assump['description']) > 50 else assump['description']
        score = assump['epistemic_score']
        link = item['link_name']

        # Determine evidence type from citations
        evidence_type = "Theoretical"
        if assump.get('citations'):
            first_citation = assump['citations'][0]['source']
            if 'Epoch' in first_citation or 'Scaling' in first_citation:
                evidence_type = "Empirical"
            elif 'AI2027' in first_citation or 'Situational' in first_citation:
                evidence_type = "Forecast"

        lines.append(f"| {desc} | {score:.2f} | {link} | {evidence_type} |")

    lines.append("")

    # Summary stats
    lines.append("## Summary Statistics\n")
    confidences = [link['epistemic_confidence'] for link in dag['links'].values()]
    avg_conf = sum(confidences) / len(confidences)
    contested_count = sum(1 for l in dag['links'].values() if l.get('contested'))

    lines.append(f"- **Total States:** {len(dag['nodes'])}")
    lines.append(f"- **Total Transitions:** {len(dag['links'])}")
    lines.append(f"- **Average Epistemic Confidence:** {avg_conf:.2f}")
    lines.append(f"- **Contested Links:** {contested_count}/{len(dag['links'])} ({100*contested_count/len(dag['links']):.0f}%)")
    lines.append(f"- **Strong Links (>0.6):** {sum(1 for c in confidences if c > 0.6)}")
    lines.append(f"- **Moderate Links (0.3-0.6):** {sum(1 for c in confidences if 0.3 <= c <= 0.6)}")
    lines.append(f"- **Weak Links (<0.3):** {sum(1 for c in confidences if c < 0.3)}")

    return "\n".join(lines)


def generate_epistemic_confidence_report(dag: Dict) -> str:
    """Report on overall epistemic confidence"""

    lines = ["# Epistemic Confidence Analysis\n"]

    # Calculate average confidence by link
    confidences = [link['epistemic_confidence'] for link in dag['links'].values()]
    avg_confidence = sum(confidences) / len(confidences)

    lines.append(f"**Overall Average Confidence:** {avg_confidence:.2f}")
    lines.append(f"**Number of Contested Links:** {sum(1 for l in dag['links'].values() if l.get('contested'))}")
    lines.append("")

    # Histogram
    lines.append("## Confidence Distribution\n")
    strong = sum(1 for c in confidences if c > 0.6)
    moderate = sum(1 for c in confidences if 0.3 <= c <= 0.6)
    weak = sum(1 for c in confidences if c < 0.3)

    lines.append(f"- Strong (>0.6): {strong} links")
    lines.append(f"- Moderate (0.3-0.6): {moderate} links")
    lines.append(f"- Weak (<0.3): {weak} links")
    lines.append("")

    # Weakest links
    lines.append("## Weakest Causal Links (Most Speculative)\n")
    sorted_links = sorted(dag['links'].items(), key=lambda x: x[1]['epistemic_confidence'])

    for link_id, link in sorted_links[:5]:
        from_node = dag['nodes'][link['from_state']]['name']
        to_node = dag['nodes'][link['to_state']]['name']
        conf = link['epistemic_confidence']

        lines.append(f"### {from_node} → {to_node} (confidence: {conf:.2f})")
        lines.append(f"**Mechanism:** {link['mechanism']}")
        lines.append(f"**Claimed by:** {', '.join(link['claimed_by'])}")

        if link.get('contested'):
            lines.append("**Status:** ⚠️ CONTESTED")

        lines.append("")

    return "\n".join(lines)


def main():
    print("Loading DAG...")
    dag = load_dag("research/ai_futures/analysis/ai2027_causal_dag.json")

    print(f"Loaded {len(dag['nodes'])} nodes, {len(dag['links'])} links")

    # Generate Mermaid diagram
    print("\n1. Generating Mermaid diagram...")
    mermaid = generate_mermaid_diagram(dag)
    with open("research/ai_futures/analysis/dag_diagram.md", "w") as f:
        f.write("# AI2027 Causal DAG Visualization\n\n")
        f.write(mermaid)
    print("   ✅ Saved to dag_diagram.md")

    # Generate assumption report
    print("\n2. Generating assumption analysis...")
    assumptions = generate_assumption_report(dag)
    with open("research/ai_futures/analysis/assumptions_report.md", "w") as f:
        f.write(assumptions)
    print("   ✅ Saved to assumptions_report.md")

    # Generate link summary
    print("\n3. Generating link summary...")
    link_summary = generate_link_summary(dag)
    with open("research/ai_futures/analysis/links_summary.md", "w") as f:
        f.write(link_summary)
    print("   ✅ Saved to links_summary.md")

    # Generate state machine summary
    print("\n4. Generating state machine summary...")
    state_summary = generate_state_machine_summary(dag)
    with open("research/ai_futures/analysis/state_machine_summary.md", "w") as f:
        f.write(state_summary)
    print("   ✅ Saved to state_machine_summary.md")

    # Generate epistemic confidence report
    print("\n5. Generating epistemic confidence report...")
    epistemic = generate_epistemic_confidence_report(dag)
    with open("research/ai_futures/analysis/epistemic_confidence.md", "w") as f:
        f.write(epistemic)
    print("   ✅ Saved to epistemic_confidence.md")

    # Generate table view
    print("\n6. Generating comprehensive table view...")
    table_view = generate_dag_table_view(dag)
    with open("research/ai_futures/analysis/dag_table_view.md", "w") as f:
        f.write(table_view)
    print("   ✅ Saved to dag_table_view.md")

    print("\n✅ All visualizations generated!")
    print("\nKey findings:")

    # Quick stats
    confidences = [link['epistemic_confidence'] for link in dag['links'].values()]
    avg_conf = sum(confidences) / len(confidences)
    contested_count = sum(1 for l in dag['links'].values() if l.get('contested'))

    print(f"  - Average epistemic confidence: {avg_conf:.2f}")
    print(f"  - Contested links: {contested_count}/{len(dag['links'])}")

    # Find critical assumptions
    all_assump = []
    for link in dag['links'].values():
        all_assump.extend(link.get('assumptions', []))

    weak_assump = [a for a in all_assump if a['epistemic_score'] < 0.2]
    print(f"  - Weak assumptions (<0.2 score): {len(weak_assump)}/{len(all_assump)}")

    print("\nReview the markdown files in research/ai_futures/analysis/")


if __name__ == "__main__":
    main()
