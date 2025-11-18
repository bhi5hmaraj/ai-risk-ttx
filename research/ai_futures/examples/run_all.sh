#!/usr/bin/env bash
# Run all formal model examples

set -e  # Exit on error

echo "======================================"
echo "Running Formal Model Examples"
echo "======================================"
echo

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found"
    exit 1
fi

# Check for required packages
echo "Checking dependencies..."
python3 -c "import transitions" 2>/dev/null || {
    echo "Warning: transitions library not found"
    echo "Install with: pip install transitions"
    echo
}

python3 -c "import pygraphviz" 2>/dev/null || {
    echo "Warning: pygraphviz not found (needed for diagram generation)"
    echo "Install with: pip install pygraphviz"
    echo "Requires graphviz system package: apt-get install graphviz graphviz-dev"
    echo
}

# Run examples
echo "======================================"
echo "Example 1: Simple LTS"
echo "======================================"
python3 01_simple_lts.py
echo

echo "======================================"
echo "Example 2: Time-Indexed Model"
echo "======================================"
python3 02_time_indexed_model.py
echo

echo "======================================"
echo "Example 3: Simple MDP"
echo "======================================"
python3 03_simple_mdp.py
echo

echo "======================================"
echo "All examples completed!"
echo "======================================"
echo
echo "Generated files:"
ls -lh *.png *.svg 2>/dev/null || echo "No diagrams generated (install pygraphviz)"
