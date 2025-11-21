#!/usr/bin/env python3
"""
Test Architect Mode End-to-End

Demonstrates the full workflow with mock data:
    1. Document Ingestion
    2. Scenario Compilation
    3. Validation
    4. Save scenario

Run:
    python test_architect.py
"""

import json
import os
from pathlib import Path

from document_ingestion import DocumentIngestion
from scenario_compiler import ScenarioCompiler
from scenario_validator import ScenarioValidator


def test_full_workflow():
    """Test complete workflow with mock data."""

    print("="*70)
    print("ARCHITECT MODE: End-to-End Test")
    print("="*70)

    # Setup
    output_dir = Path("test_output")
    output_dir.mkdir(exist_ok=True)

    # Phase 1: Document Ingestion
    print("\n" + "="*70)
    print("PHASE 1: Document Ingestion")
    print("="*70)

    ingestion = DocumentIngestion()

    # Simulate GM input
    user_prompt = """
    I want to create a scenario about the October 2024 Delhi air pollution crisis.

    Key stakeholders:
    - Delhi Chief Minister (controls Delhi budget, wants re-election)
    - Punjab Farmer Representative (needs to clear fields, deadline Nov 15)
    - Central Environment Minister (interstate coordination, limited budget)
    - Industry Association Head (minimize disruption, lobbying power)
    - Health Activist (demand clean air, no formal authority)

    Main tension: Farmers need to burn stubble to plant wheat on time, but Delhi
    faces severe AQI spike. Government can subsidize alternatives (Happy Seeder)
    but budget is limited. Industry also contributes but gets less attention.

    Key events:
    - Round 2: Peak stubble burning season
    - Round 3: Diwali firecracker spike
    - Conditional: Supreme Court hearing if AQI > 400 for 2 days

    I want 5 rounds, medium difficulty. The scenario should teach:
    - Multi-stakeholder coordination challenges
    - Trade-offs between economy and environment
    - Temporal constraints and deadline pressures
    """

    # Use mock extraction (no actual documents needed for test)
    extraction = ingestion.process_documents(
        file_paths=[],  # Empty, will use mock data
        user_prompt=user_prompt,
        domain="air_pollution"
    )

    extraction_file = output_dir / "extracted.json"
    ingestion.save_extraction(extraction, str(extraction_file))

    print(f"\n✅ Phase 1 Complete")
    print(f"   Stakeholders extracted: {len(extraction['stakeholders'])}")
    print(f"   Events extracted: {len(extraction['events'])}")
    print(f"   Parameters extracted: {len(extraction['key_parameters'].keys())}")

    # Phase 2: Scenario Compilation
    print("\n" + "="*70)
    print("PHASE 2: Scenario Compilation")
    print("="*70)

    compiler = ScenarioCompiler()

    gm_config = {
        "scenario_id": "test_october_crisis",
        "name": "Test: October Crisis 2024",
        "description": "Navigate Delhi's air pollution crisis with multiple stakeholders",
        "author": "Test Suite",
        "target_audience": "policy_students",
        "difficulty": "medium",
        "rounds": 5,
        "minutes_per_round": 8,
        "tags": ["air_pollution", "delhi", "coordination", "test"],
        "learning_objectives": [
            "Understand multi-stakeholder coordination challenges",
            "Experience policy trade-offs between economy and environment",
            "Navigate temporal and resource constraints"
        ]
    }

    scenario = compiler.compile(extraction, gm_config)

    compiled_file = output_dir / "compiled.json"
    compiler.save_scenario(scenario, str(compiled_file))

    print(f"\n✅ Phase 2 Complete")
    print(f"   Scenario name: {scenario['metadata']['name']}")
    print(f"   Difficulty: {scenario['metadata']['difficulty']}")
    print(f"   Rounds: {scenario['metadata']['duration']['rounds']}")
    print(f"   Estimated duration: {scenario['metadata']['duration']['estimated_total_minutes']} minutes")

    # Phase 3: Validation
    print("\n" + "="*70)
    print("PHASE 3: Validation")
    print("="*70)

    validator = ScenarioValidator()

    report = validator.validate(
        scenario,
        num_simulations=5,  # Reduced for faster testing
        verbose=True
    )

    validation_file = output_dir / "validation_report.json"
    validator.save_report(report, str(validation_file))

    # Add report to scenario
    scenario["validation_report"] = report

    final_file = output_dir / "final_scenario.json"
    with open(final_file, 'w', encoding='utf-8') as f:
        json.dump(scenario, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Phase 3 Complete")

    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)

    print(f"\nScenario Details:")
    print(f"  Name: {scenario['metadata']['name']}")
    print(f"  Stakeholders: {len(scenario['stakeholders'])}")
    for s in scenario['stakeholders']:
        print(f"    - {s['name']}")

    print(f"\n  Events: {len(scenario['events'])}")
    for e in scenario['events']:
        print(f"    - {e['name']} ({e['type']})")

    print(f"\n  Initial State:")
    for key, value in list(scenario['initial_state'].items())[:5]:
        print(f"    {key}: {value}")

    print(f"\nValidation Results:")
    print(f"  All checks passed: {report['all_checks_passed']}")
    print(f"  Win rate: {report['balance_checks']['win_rate']:.0%}")
    print(f"  Avg final AQI: {report['balance_checks']['avg_final_aqi']:.0f}")
    print(f"  Issues: {len(report['issues'])}")
    print(f"  Warnings: {len(report['warnings'])}")

    if report['issues']:
        print("\n  Issues:")
        for issue in report['issues']:
            print(f"    - {issue}")

    if report['warnings']:
        print("\n  Warnings:")
        for warning in report['warnings']:
            print(f"    - {warning}")

    print(f"\nOutput Files:")
    print(f"  1. {extraction_file}")
    print(f"  2. {compiled_file}")
    print(f"  3. {validation_file}")
    print(f"  4. {final_file} ← READY FOR GAME ENGINE")

    # File sizes
    size_kb = final_file.stat().st_size / 1024
    print(f"\nFinal scenario size: {size_kb:.1f} KB")

    # Success
    if report['all_checks_passed']:
        print("\n" + "="*70)
        print("✅ SUCCESS: Scenario is valid and ready for deployment!")
        print("="*70)
    else:
        print("\n" + "="*70)
        print("⚠️  WARNING: Validation found issues, review before deployment")
        print("="*70)

    return scenario, report


def test_individual_components():
    """Test each component separately."""

    print("\n" + "="*70)
    print("COMPONENT TESTS")
    print("="*70)

    # Test 1: Document Ingestion
    print("\n[Test 1] Document Ingestion")
    ingestion = DocumentIngestion()
    extraction = ingestion.process_documents([], "Test scenario", "air_pollution")
    assert "stakeholders" in extraction
    assert len(extraction["stakeholders"]) > 0
    print("  ✅ Document ingestion working")

    # Test 2: Scenario Compilation
    print("\n[Test 2] Scenario Compilation")
    compiler = ScenarioCompiler()
    config = {"difficulty": "medium", "rounds": 5}
    scenario = compiler.compile(extraction, config)
    assert scenario["schema_version"] == "1.0"
    assert "metadata" in scenario
    assert "stakeholders" in scenario
    print("  ✅ Scenario compilation working")

    # Test 3: Validation
    print("\n[Test 3] Validation")
    validator = ScenarioValidator()
    report = validator.validate(scenario, num_simulations=2, verbose=False)
    assert "consistency_checks" in report
    assert "balance_checks" in report
    assert "playability_checks" in report
    print("  ✅ Validation working")

    print("\n" + "="*70)
    print("✅ All component tests passed")
    print("="*70)


if __name__ == "__main__":
    import sys

    # Run component tests first
    test_individual_components()

    print("\n\n")

    # Run full workflow
    scenario, report = test_full_workflow()

    # Exit code based on validation
    if report["all_checks_passed"]:
        sys.exit(0)
    else:
        sys.exit(1)
