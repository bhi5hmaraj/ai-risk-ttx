#!/usr/bin/env python3
"""
Beads Issue Tracker Visualization Tool

Generates Mermaid diagrams from beads .jsonl files.
Can be used as a pre-commit hook to auto-update README with current issue status.

Usage:
    python scripts/beads_viz.py .beads/issues.jsonl                    # Print diagram
    python scripts/beads_viz.py .beads/issues.jsonl --output graph.md  # Save to file
    python scripts/beads_viz.py .beads/issues.jsonl --filter open      # Only open issues
    python scripts/beads_viz.py .beads/issues.jsonl --stats            # Print statistics
"""
import json
import argparse
import sys
from typing import Dict, Any, List, Set
from collections import defaultdict

# Mapping from beads dependency type to Mermaid line style
DEP_STYLE_MAP = {
    "blocks": "-->",
    "parent-child": "-.->",
    "related": "-.->",
    "discovered-from": "-. discovered .->"
}

# Color scheme for different priorities and statuses
PRIORITY_COLORS = {
    0: "#ff6b6b",  # P0 - Red (highest priority)
    1: "#ffa500",  # P1 - Orange
    2: "#4ecdc4",  # P2 - Teal
    3: "#95e1d3",  # P3 - Light teal
    4: "#c8d6e5",  # P4 - Light blue
}

STATUS_STYLES = {
    "open": "fill:#fff3cd,stroke:#856404,stroke-width:2px",
    "in_progress": "fill:#cfe2ff,stroke:#084298,stroke-width:3px",
    "closed": "fill:#d1e7dd,stroke:#0a3622,stroke-dasharray: 5 5",
    "blocked": "fill:#f8d7da,stroke:#842029,stroke-width:2px",
}

TYPE_ICONS = {
    "epic": "📦",
    "feature": "✨",
    "task": "📋",
    "bug": "🐛",
}


def load_issues(issues_file_path: str) -> Dict[str, Any]:
    """Load issues from JSONL file."""
    issues: Dict[str, Any] = {}

    try:
        with open(issues_file_path, 'r') as f:
            for line in f:
                if line.strip():
                    issue = json.loads(line)
                    issues[issue['id']] = issue
    except FileNotFoundError:
        print(f"Error: File not found at {issues_file_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in file: {e}", file=sys.stderr)
        sys.exit(1)

    return issues


def filter_issues(issues: Dict[str, Any], status_filter: str = None,
                 priority_filter: int = None, type_filter: str = None) -> Dict[str, Any]:
    """Filter issues based on criteria."""
    filtered = {}

    for issue_id, issue in issues.items():
        # Apply filters
        if status_filter and issue.get('status') != status_filter:
            continue
        if priority_filter is not None and issue.get('priority') != priority_filter:
            continue
        if type_filter and issue.get('type') != type_filter:
            continue

        filtered[issue_id] = issue

    return filtered


def generate_statistics(issues: Dict[str, Any]) -> str:
    """Generate summary statistics about issues."""
    stats = defaultdict(lambda: defaultdict(int))

    for issue in issues.values():
        status = issue.get('status', 'unknown')
        priority = issue.get('priority', 'N/A')
        issue_type = issue.get('type', 'unknown')

        stats['status'][status] += 1
        stats['priority'][f'P{priority}'] += 1
        stats['type'][issue_type] += 1

    output = ["## Beads Issue Statistics\n"]
    output.append(f"**Total Issues:** {len(issues)}\n")

    output.append("\n### By Status")
    for status, count in sorted(stats['status'].items()):
        output.append(f"- {status}: {count}")

    output.append("\n### By Priority")
    for priority, count in sorted(stats['priority'].items()):
        output.append(f"- {priority}: {count}")

    output.append("\n### By Type")
    for issue_type, count in sorted(stats['type'].items()):
        output.append(f"- {issue_type}: {count}")

    return "\n".join(output)


def get_relevant_dependencies(issues: Dict[str, Any], filtered_ids: Set[str]) -> List[Dict]:
    """Get dependencies where both ends are in the filtered set."""
    deps = []

    for issue_id in filtered_ids:
        issue = issues[issue_id]
        if 'dependencies' in issue and issue['dependencies']:
            for dep in issue['dependencies']:
                from_node = dep['issue_id']
                to_node = dep['depends_on_id']

                # Only include if both nodes are in filtered set
                if from_node in filtered_ids and to_node in filtered_ids:
                    deps.append(dep)

    return deps


def sanitize_for_mermaid(text: str) -> str:
    """Sanitize text for Mermaid diagram."""
    return text.replace('"', "'").replace('\n', ' ').replace('[', '(').replace(']', ')')


def generate_mermaid_diagram(issues: Dict[str, Any],
                            include_closed: bool = True,
                            max_title_length: int = 50) -> str:
    """Generate a Mermaid graph diagram from issues."""

    if not issues:
        return "```mermaid\ngraph TD;\n    A[No issues found];\n```"

    # Filter issues if needed
    display_issues = issues
    if not include_closed:
        display_issues = {k: v for k, v in issues.items() if v.get('status') != 'closed'}

    if not display_issues:
        return "```mermaid\ngraph TD;\n    A[All issues are closed];\n```"

    mermaid_lines = ["```mermaid", "graph TD;"]

    # --- Generate Node Definitions ---
    for issue_id, issue in display_issues.items():
        title = issue.get('title', 'Untitled')
        # Truncate long titles
        if len(title) > max_title_length:
            title = title[:max_title_length-3] + "..."

        title = sanitize_for_mermaid(title)
        priority = issue.get('priority', 'N/A')
        issue_type = issue.get('type', 'task')
        status = issue.get('status', 'open')

        # Add icon based on type
        icon = TYPE_ICONS.get(issue_type, "")

        # Create node text
        node_text = f'{issue_id}["{icon} {issue_id}<br/>{title}<br/>P{priority}"]'
        mermaid_lines.append(f"    {node_text}")

        # Style nodes based on status
        style = STATUS_STYLES.get(status, "fill:#f0f0f0,stroke:#333")
        mermaid_lines.append(f"    style {issue_id} {style}")

    mermaid_lines.append("")  # Spacer for readability

    # --- Generate Edges from Dependencies ---
    relevant_deps = get_relevant_dependencies(issues, set(display_issues.keys()))

    for dep in relevant_deps:
        from_node = dep['issue_id']
        to_node = dep['depends_on_id']
        dep_type = dep.get('type', 'blocks')

        style = DEP_STYLE_MAP.get(dep_type, "-->")
        mermaid_lines.append(f"    {from_node} {style} {to_node}")

    mermaid_lines.append("```")

    return "\n".join(mermaid_lines)


def generate_ready_issues_list(issues: Dict[str, Any]) -> str:
    """Generate a markdown list of ready-to-work issues."""
    ready_issues = []

    for issue_id, issue in issues.items():
        if issue.get('status') != 'open':
            continue

        # Check if blocked by dependencies
        is_blocked = False
        if 'dependencies' in issue and issue['dependencies']:
            for dep in issue['dependencies']:
                if dep.get('type') == 'blocks':
                    depends_on_id = dep['depends_on_id']
                    if depends_on_id in issues:
                        dep_issue = issues[depends_on_id]
                        if dep_issue.get('status') != 'closed':
                            is_blocked = True
                            break

        if not is_blocked:
            priority = issue.get('priority', 99)
            issue_type = issue.get('type', 'task')
            title = issue.get('title', 'Untitled')
            ready_issues.append((priority, issue_id, issue_type, title))

    if not ready_issues:
        return "**No issues ready to work on**\n"

    # Sort by priority
    ready_issues.sort()

    output = ["## Ready to Work\n"]
    output.append("Issues with no blocking dependencies:\n")

    for priority, issue_id, issue_type, title in ready_issues[:10]:  # Show top 10
        icon = TYPE_ICONS.get(issue_type, "")
        output.append(f"- {icon} **{issue_id}** (P{priority}): {title}")

    if len(ready_issues) > 10:
        output.append(f"\n*... and {len(ready_issues) - 10} more*")

    return "\n".join(output)


def main():
    parser = argparse.ArgumentParser(
        description="Generate Mermaid diagrams and statistics from beads .jsonl files.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("issues_file", help="Path to the .beads/issues.jsonl file")
    parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    parser.add_argument("-f", "--filter", choices=['open', 'closed', 'in_progress'],
                       help="Filter by status")
    parser.add_argument("-p", "--priority", type=int, help="Filter by priority (0-4)")
    parser.add_argument("-t", "--type", choices=['epic', 'feature', 'task', 'bug'],
                       help="Filter by issue type")
    parser.add_argument("--stats", action="store_true", help="Show statistics instead of diagram")
    parser.add_argument("--ready", action="store_true", help="Show ready-to-work issues")
    parser.add_argument("--include-closed", action="store_true",
                       help="Include closed issues in diagram (default: exclude)")
    parser.add_argument("--max-title-length", type=int, default=50,
                       help="Maximum title length in diagram (default: 50)")

    args = parser.parse_args()

    # Load issues
    all_issues = load_issues(args.issues_file)

    # Apply filters
    filtered_issues = filter_issues(
        all_issues,
        status_filter=args.filter,
        priority_filter=args.priority,
        type_filter=args.type
    )

    # Generate output based on mode
    if args.stats:
        output = generate_statistics(filtered_issues)
    elif args.ready:
        output = generate_ready_issues_list(filtered_issues)
    else:
        output = generate_mermaid_diagram(
            filtered_issues,
            include_closed=args.include_closed,
            max_title_length=args.max_title_length
        )

    # Write output
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        print(f"Output written to {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
