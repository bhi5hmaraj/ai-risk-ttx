#!/usr/bin/env bash
# Generate SVGs from Mermaid diagrams
#
# Prerequisites:
#   npm install -g @mermaid-js/mermaid-cli
#   OR: use Docker: docker pull minlag/mermaid-cli
#
# Usage:
#   ./generate_svgs.sh
#   OR with Docker: ./generate_svgs.sh --docker

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

USE_DOCKER=false
if [[ "$1" == "--docker" ]]; then
    USE_DOCKER=true
fi

echo "======================================"
echo "Generating SVGs from Mermaid diagrams"
echo "======================================"
echo

# Function to generate SVG
generate_svg() {
    local mmd_file="$1"
    local svg_file="${mmd_file%.mmd}.svg"

    echo "Processing: $mmd_file → $svg_file"

    if [[ "$USE_DOCKER" == "true" ]]; then
        docker run --rm -v "$SCRIPT_DIR:/data" minlag/mermaid-cli \
            -i "/data/$mmd_file" \
            -o "/data/$svg_file" \
            -t neutral \
            -b transparent
    else
        if ! command -v mmdc &> /dev/null; then
            echo "Error: mermaid-cli not found"
            echo "Install with: npm install -g @mermaid-js/mermaid-cli"
            echo "Or use: ./generate_svgs.sh --docker"
            exit 1
        fi

        mmdc -i "$mmd_file" -o "$svg_file" -t neutral -b transparent
    fi

    if [[ -f "$svg_file" ]]; then
        echo "  ✓ Generated: $svg_file"
    else
        echo "  ✗ Failed: $svg_file"
        return 1
    fi
}

# Find all .mmd files and generate SVGs
found_files=false
for mmd_file in *.mmd; do
    if [[ -f "$mmd_file" ]]; then
        found_files=true
        generate_svg "$mmd_file" || echo "  Warning: Failed to generate $mmd_file"
    fi
done

if [[ "$found_files" == "false" ]]; then
    echo "No .mmd files found in $SCRIPT_DIR"
    echo
    echo "Mermaid diagrams are currently embedded in markdown files."
    echo "To extract them to .mmd files, run:"
    echo "  ./extract_mermaid.sh"
    exit 0
fi

echo
echo "======================================"
echo "SVG generation complete!"
echo "======================================"
echo
echo "Generated SVGs:"
ls -lh *.svg 2>/dev/null || echo "No SVG files found"
echo
echo "To use in markdown, replace mermaid blocks with:"
echo '  ![Diagram](diagrams/filename.svg)'
