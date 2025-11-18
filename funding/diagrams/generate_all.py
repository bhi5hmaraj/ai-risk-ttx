"""
Master script to generate all funding proposal visualizations
Run this to create all diagrams at once
"""

import subprocess
import sys

scripts = [
    'player_journey.py',
    'success_timeline.py',
    'impact_dimensions.py',
    'partnership_value.py',
    'mda_framework.py'
]

print("=" * 60)
print("Generating all funding proposal visualizations")
print("=" * 60)

for script in scripts:
    print(f"\nRunning {script}...")
    try:
        result = subprocess.run([sys.executable, f'funding/diagrams/{script}'],
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ {script} completed successfully")
            if result.stdout:
                print(result.stdout)
        else:
            print(f"✗ {script} failed:")
            print(result.stderr)
    except Exception as e:
        print(f"✗ Error running {script}: {e}")

print("\n" + "=" * 60)
print("All diagrams generated!")
print("Output location: funding/diagrams/")
print("=" * 60)
print("\nGenerated files:")
print("- player_journey.png")
print("- progression_pathway.png")
print("- success_timeline.png")
print("- impact_dimensions.png")
print("- impact_over_time.png")
print("- partnership_value.png")
print("- risk_mitigation.png")
print("- mda_framework.png")
print("- mda_development.png")
