#!/usr/bin/env bash
# Validate Mermaid diagrams in markdown files
#
# This script validates mermaid diagrams using @a24z/mermaid-parser
# (lightweight, no Puppeteer/Chrome dependency)
#
# Prerequisites:
#   npm install @a24z/mermaid-parser
#
# Usage:
#   ./validate_diagrams.sh [file.md ...]
#   ./validate_diagrams.sh  # validates all markdown files in parent dir

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

# Determine files to validate
if [[ $# -gt 0 ]]; then
    # Validate specified files
    files=("$@")
else
    # Find all markdown files in parent directory
    mapfile -t files < <(find "$PARENT_DIR" -maxdepth 1 -name "*.md" -type f)
fi

if [[ ${#files[@]} -eq 0 ]]; then
    echo "No markdown files found"
    exit 0
fi

# Run the Node.js validator
exec node "$SCRIPT_DIR/validate_mermaid.js" "${files[@]}"
