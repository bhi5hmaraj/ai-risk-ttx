#!/usr/bin/env python3
"""
Update README with generated Beads issue diagrams and statistics.

This script is called by the pre-commit hook to automatically update
the README.md file with current issue status.

Usage:
    python scripts/update_readme.py
"""
import sys
import re
from pathlib import Path

# Import functions from beads_viz
from beads_viz import (
    load_issues,
    generate_mermaid_diagram,
    generate_ready_issues_list,
    generate_statistics,
    filter_issues
)

# Markers for sections in README
MARKERS = {
    'issues_diagram': ('<!-- BEADS_ISSUES_START -->', '<!-- BEADS_ISSUES_END -->'),
    'ready_issues': ('<!-- BEADS_READY_START -->', '<!-- BEADS_READY_END -->'),
    'issues_stats': ('<!-- BEADS_STATS_START -->', '<!-- BEADS_STATS_END -->'),
}


def update_section(content: str, marker_start: str, marker_end: str, new_content: str) -> str:
    """Update content between markers in README."""
    pattern = re.compile(
        f'{re.escape(marker_start)}.*?{re.escape(marker_end)}',
        re.DOTALL
    )

    replacement = f'{marker_start}\n{new_content}\n{marker_end}'

    if pattern.search(content):
        return pattern.sub(replacement, content)
    else:
        # Markers don't exist, append at end
        return content + f'\n\n{replacement}\n'


def main():
    # Paths
    repo_root = Path(__file__).parent.parent
    readme_path = repo_root / 'README.md'
    issues_path = repo_root / '.beads' / 'issues.jsonl'

    if not issues_path.exists():
        print(f"Issues file not found at {issues_path}", file=sys.stderr)
        sys.exit(1)

    if not readme_path.exists():
        print(f"README not found at {readme_path}", file=sys.stderr)
        sys.exit(1)

    # Load issues
    all_issues = load_issues(str(issues_path))

    # Filter for open issues only
    open_issues = filter_issues(all_issues, status_filter='open')

    # Generate content
    diagram = generate_mermaid_diagram(open_issues, include_closed=False, max_title_length=40)
    ready_list = generate_ready_issues_list(all_issues)
    stats = generate_statistics(all_issues)

    # Read current README
    readme_content = readme_path.read_text()

    # Update sections
    updated_content = readme_content
    updated_content = update_section(
        updated_content,
        MARKERS['issues_diagram'][0],
        MARKERS['issues_diagram'][1],
        f"\n### Open Issues Dependency Graph\n\n{diagram}\n"
    )
    updated_content = update_section(
        updated_content,
        MARKERS['ready_issues'][0],
        MARKERS['ready_issues'][1],
        f"\n{ready_list}\n"
    )
    updated_content = update_section(
        updated_content,
        MARKERS['issues_stats'][0],
        MARKERS['issues_stats'][1],
        f"\n{stats}\n"
    )

    # Write back if changed
    if updated_content != readme_content:
        readme_path.write_text(updated_content)
        print(f"✓ Updated {readme_path}")
        return 0
    else:
        print(f"✓ README is up to date")
        return 0


if __name__ == '__main__':
    sys.exit(main())
