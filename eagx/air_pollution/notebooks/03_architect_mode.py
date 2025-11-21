# %% [markdown]
# # Architect Mode: Creating Custom Scenarios
#
# This notebook demonstrates how Game Masters (policy experts) can create custom TTX scenarios using the Architect Mode workflow.
#
# **Three-phase workflow:**
# 1. **Document Ingestion**: Extract scenario blocks from PDFs/notes
# 2. **Scenario Compilation**: Configure and assemble
# 3. **Validation**: Check balance and playability

# %%
import sys
sys.path.append('../architect')

from document_ingestion import DocumentIngestion
from scenario_compiler import ScenarioCompiler
from scenario_validator import ScenarioValidator

import json
import matplotlib.pyplot as plt
from datetime import datetime
import os

# %% [markdown]
# ## Phase 1: Document Ingestion
#
# Extract scenario building blocks from domain documents. For this demo, we'll use mock data (real system would parse PDFs).

# %%
# Initialize ingestion system
ingestion = DocumentIngestion()

# GM's scenario description
user_prompt = """
I want to create a scenario about the October 2024 Delhi air pollution crisis.

Key stakeholders:
- Delhi Chief Minister (controls Delhi budget, wants re-election)
- Punjab Farmer Representative (needs to clear fields by Nov 15)
- Central Environment Minister (interstate coordination power)
- Industry Association (minimize economic disruption)
- Health Activist (demand clean air, no formal authority)

The crisis peaks around Diwali (round 3) with firecracker spike.
Supreme Court may intervene if AQI exceeds 400.

Learning objectives:
- Understand multi-stakeholder coordination challenges
- Experience policy trade-offs
- Navigate temporal constraints
"""

# Extract (uses mock data for now)
print("Extracting scenario blocks...")
extraction = ingestion.process_documents(
    file_paths=[],  # Would include PDFs in real usage
    user_prompt=user_prompt,
    domain="air_pollution"
)

print("\n✅ Extraction complete!")
print(f"   Stakeholders: {len(extraction['stakeholders'])}")
print(f"   Events: {len(extraction['events'])}")
print(f"   Parameters: {len(extraction['key_parameters'])} groups")

# %%
# Examine extracted stakeholders
print("Extracted Stakeholders:")
print("="*70)

for i, stakeholder in enumerate(extraction['stakeholders'], 1):
    print(f"\n{i}. {stakeholder['name']}")
    print(f"   ID: {stakeholder['id']}")
    print(f"   Public objective: {stakeholder['public_objective'][:60]}...")
    print(f"   Potential hidden objectives:")
    for obj in stakeholder.get('potential_hidden_objectives', [])[:2]:
        print(f"     • {obj}")
    print(f"   Budget: ₹{stakeholder.get('resources', {}).get('budget', 0)} crores")

# %%
# Examine extracted events
print("\nExtracted Events:")
print("="*70)

for i, event in enumerate(extraction['events'], 1):
    print(f"\n{i}. {event['name']} ({event['type'].upper()})")
    print(f"   Trigger: {event['trigger']}")
    print(f"   Effects: {event['effects']}")
    print(f"   Confidence: {event.get('confidence', 'unknown')}")

# %% [markdown]
# ## Phase 2: Scenario Compilation
#
# Configure the extracted blocks and compile into executable scenario.

# %%
# Initialize compiler
compiler = ScenarioCompiler()

# GM configuration
gm_config = {
    "scenario_id": "demo_october_crisis",
    "name": "October Crisis 2024 - Demo",
    "description": "Navigate Delhi's air pollution crisis with multiple stakeholders",
    "author": "Demo User",
    "target_audience": "graduate_students",

    # Difficulty settings
    "difficulty": "medium",  # Options: easy, medium, hard

    # Game length
    "rounds": 5,
    "minutes_per_round": 8,

    # Tags
    "tags": ["air_pollution", "delhi", "coordination", "demo"],

    # Learning objectives
    "learning_objectives": [
        "Understand multi-stakeholder coordination challenges",
        "Experience policy trade-offs between economy and environment",
        "Navigate temporal and resource constraints"
    ]
}

print("Compiling scenario...")
scenario = compiler.compile(extraction, gm_config)

print("\n✅ Compilation complete!")
print(f"   Scenario: {scenario['metadata']['name']}")
print(f"   Difficulty: {scenario['metadata']['difficulty']}")
print(f"   Duration: {scenario['metadata']['duration']['rounds']} rounds")
print(f"   Estimated time: {scenario['metadata']['duration']['estimated_total_minutes']} minutes")

# %%
# Examine compiled scenario structure
print("Compiled Scenario Structure:")
print("="*70)

print(f"\n1. Metadata:")
print(f"   Schema version: {scenario['schema_version']}")
print(f"   Created: {scenario['metadata']['created_at']}")
print(f"   Version: {scenario['metadata']['version']}")

print(f"\n2. Initial State:")
for key, value in list(scenario['initial_state'].items())[:8]:
    print(f"   {key}: {value}")

print(f"\n3. Stakeholders: {len(scenario['stakeholders'])}")
for s in scenario['stakeholders']:
    print(f"   • {s['name']} ({s['id']})")

print(f"\n4. Events: {len(scenario['events'])}")
for e in scenario['events']:
    print(f"   • {e['name']} ({e['type']})")

print(f"\n5. Win Conditions:")
public_goal = scenario['win_conditions']['public_goal']
print(f"   Public goal: {public_goal['description']}")
print(f"   Failure conditions: {len(scenario['win_conditions']['failure_conditions'])}")

# %% [markdown]
# ## Phase 3: Validation
#
# Validate the scenario through simulated games to check balance and playability.

# %%
# Initialize validator
validator = ScenarioValidator()

print("Running validation...")
print("(This simulates 10 games with different AI strategies)\n")

# Validate with 10 simulations
report = validator.validate(
    scenario,
    num_simulations=10,
    verbose=False  # Set to True to see detailed progress
)

print("\n✅ Validation complete!")

# %%
# Display validation results
print("Validation Report:")
print("="*70)

print(f"\n🎯 Overall Status: {'✅ PASSED' if report['all_checks_passed'] else '❌ FAILED'}")

print(f"\n1. Consistency Checks:")
consistency = report['consistency_checks']
print(f"   All passed: {consistency['all_passed']}")
for check in consistency['checks']:
    status = '✅' if check['passed'] else '❌'
    print(f"   {status} {check['name']}")
    if not check['passed']:
        print(f"      Reason: {check.get('reason', 'Unknown')}")

print(f"\n2. Balance Checks:")
balance = report['balance_checks']
print(f"   Simulations run: {balance['simulation_runs']}")
print(f"   Win rate: {balance['win_rate']:.0%}")
print(f"   Avg final AQI: {balance['avg_final_aqi']:.0f}")
print(f"   Dominant strategy detected: {balance['dominant_strategy_detected']}")

# Win rate interpretation
win_rate = balance['win_rate']
if win_rate < 0.2:
    print("   ⚠️  Too hard (win rate < 20%)")
elif win_rate < 0.4:
    print("   ⚡ Challenging (win rate 20-40%)")
elif win_rate <= 0.6:
    print("   ✅ Balanced (win rate 40-60%)")
elif win_rate <= 0.8:
    print("   😊 Easy (win rate 60-80%)")
else:
    print("   ⚠️  Too easy (win rate > 80%)")

print(f"\n3. Playability Checks:")
playability = report['playability_checks']
print(f"   Avg meaningful choices/round: {playability['avg_meaningful_choices_per_round']:.1f}")
if playability['round_budget_warnings']:
    print(f"   Budget warnings: {len(playability['round_budget_warnings'])}")

# %%
# Display issues and warnings
if report['issues']:
    print("\n⚠️  Issues:")
    for issue in report['issues']:
        print(f"   • {issue}")
else:
    print("\n✅ No issues found")

if report['warnings']:
    print("\n⚡ Warnings:")
    for warning in report['warnings']:
        print(f"   • {warning}")
else:
    print("\n✅ No warnings")

# %% [markdown]
# ## Difficulty Comparison
#
# Let's compare how different difficulty settings affect the scenario.

# %%
# Compile scenarios with different difficulties
difficulties = ['easy', 'medium', 'hard']
difficulty_results = {}

for diff in difficulties:
    print(f"\nCompiling {diff.upper()} scenario...")

    config = gm_config.copy()
    config['difficulty'] = diff
    config['scenario_id'] = f"demo_{diff}"

    scenario_diff = compiler.compile(extraction, config)

    # Quick validation (3 simulations)
    report_diff = validator.validate(scenario_diff, num_simulations=3, verbose=False)

    difficulty_results[diff] = {
        'win_rate': report_diff['balance_checks']['win_rate'],
        'avg_aqi': report_diff['balance_checks']['avg_final_aqi'],
        'budget': scenario_diff['initial_state']['budget_delhi']
    }

    print(f"  Win rate: {report_diff['balance_checks']['win_rate']:.0%}")
    print(f"  Avg final AQI: {report_diff['balance_checks']['avg_final_aqi']:.0f}")
    print(f"  Delhi budget: ₹{scenario_diff['initial_state']['budget_delhi']:.0f} crores")

# %%
# Visualize difficulty comparison
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Win rates
win_rates = [difficulty_results[d]['win_rate'] for d in difficulties]
colors = ['lightgreen', 'gold', 'lightcoral']

ax1.bar(difficulties, win_rates, color=colors, edgecolor='black', alpha=0.7)
ax1.axhline(y=0.5, color='blue', linestyle='--', alpha=0.5, label='Target (50%)')
ax1.set_ylabel('Win Rate')
ax1.set_title('Win Rate by Difficulty')
ax1.set_ylim(0, 1)
ax1.legend()
ax1.grid(alpha=0.3, axis='y')

# Add percentage labels
for i, (d, rate) in enumerate(zip(difficulties, win_rates)):
    ax1.text(i, rate + 0.02, f"{rate:.0%}", ha='center', va='bottom', fontweight='bold')

# Starting budgets
budgets = [difficulty_results[d]['budget'] for d in difficulties]

ax2.bar(difficulties, budgets, color=colors, edgecolor='black', alpha=0.7)
ax2.set_ylabel('Budget (₹ crores)')
ax2.set_title('Starting Budget by Difficulty')
ax2.grid(alpha=0.3, axis='y')

# Add budget labels
for i, (d, budget) in enumerate(zip(difficulties, budgets)):
    ax2.text(i, budget + 20, f"₹{budget:.0f}", ha='center', va='bottom', fontweight='bold')

plt.tight_layout()
plt.show()

print("\nDifficulty Settings Summary:")
print("  EASY: 1.5x budget, 1.3x action effectiveness, 0.7x event severity")
print("  MEDIUM: 1.0x (baseline)")
print("  HARD: 0.7x budget, 0.8x action effectiveness, 1.3x event severity")

# %% [markdown]
# ## Saving the Scenario
#
# Once validated, save the scenario as JSON for loading into the game engine.

# %%
# Add validation report to scenario
scenario['validation_report'] = report

# Save to file
output_file = "demo_october_crisis.json"

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(scenario, f, indent=2, ensure_ascii=False)

# Check file size
size_kb = os.path.getsize(output_file) / 1024

print(f"\n✅ Scenario saved: {output_file}")
print(f"   File size: {size_kb:.1f} KB")
print(f"   Ready to load in game engine!")

print(f"\nTo load this scenario in the game:")
print(f"   from scenario_loader import ScenarioLoader")
print(f"   scenario = ScenarioLoader.load('{output_file}')")
print(f"   game = TTXGame(scenario)")

# %% [markdown]
# ## Summary
#
# **Architect Mode workflow:**
# 1. ✅ **Extract** scenario blocks from documents (or create from scratch)
# 2. ✅ **Configure** difficulty, stakeholders, events
# 3. ✅ **Validate** through simulated games
# 4. ✅ **Deploy** as JSON file
#
# **GM Control Tiers:**
# - **MUST control**: Roles, objectives, win conditions, major events
# - **CAN control**: Parameters, difficulty, action permissions
# - **Auto-generated**: Low-level math, narratives, dynamic states
#
# Next notebook: `04_game_theory.py` - Analyzing strategic interactions
