#!/usr/bin/env python3
"""
Architect Mode CLI - Unified Interface

Combines all three phases of scenario creation:
    Phase 1: Document Ingestion (extract from PDFs)
    Phase 2: Scenario Compilation (GM configuration)
    Phase 3: Validation (balance and playability checks)

Usage:
    # Full workflow
    python architect_cli.py create \\
        --docs SAFAR_report.pdf workshop_notes.txt \\
        --prompt "I want to create an October 2024 crisis scenario..." \\
        --name "October Crisis 2024" \\
        --difficulty medium \\
        --rounds 5 \\
        --output october_crisis_2024.json

    # Step by step
    python architect_cli.py extract --docs *.pdf --prompt "..." --output extracted.json
    python architect_cli.py compile --input extracted.json --output compiled.json
    python architect_cli.py validate --scenario compiled.json
"""

import argparse
import json
import sys
from pathlib import Path

from document_ingestion import DocumentIngestion
from scenario_compiler import ScenarioCompiler
from scenario_validator import ScenarioValidator


class ArchitectCLI:
    """Main CLI orchestrator for Architect Mode."""

    def __init__(self):
        self.ingestion = DocumentIngestion()
        self.compiler = ScenarioCompiler()
        self.validator = ScenarioValidator()

    def create_full_workflow(
        self,
        doc_files: list,
        user_prompt: str,
        scenario_name: str,
        difficulty: str = "medium",
        rounds: int = 5,
        output_file: str = "scenario.json",
        validate: bool = True,
        num_simulations: int = 10
    ):
        """
        Run full workflow: Extract → Compile → Validate → Save.

        This is the main entry point for GMs who want to create a scenario
        in one command.
        """
        print("="*60)
        print("ARCHITECT MODE: Full Scenario Creation Workflow")
        print("="*60)

        # Phase 1: Document Ingestion
        print("\n[Phase 1/3] Document Ingestion")
        print("-" * 60)

        extraction = self.ingestion.process_documents(
            doc_files,
            user_prompt,
            domain="air_pollution"
        )

        print(f"✓ Extracted {len(extraction.get('stakeholders', []))} stakeholders")
        print(f"✓ Extracted {len(extraction.get('events', []))} events")
        print(f"✓ Extracted {len(extraction.get('key_parameters', {}))} parameter groups")

        # Phase 2: Scenario Compilation
        print("\n[Phase 2/3] Scenario Compilation")
        print("-" * 60)

        gm_config = {
            "scenario_id": scenario_name.lower().replace(" ", "_"),
            "name": scenario_name,
            "difficulty": difficulty,
            "rounds": rounds,
            "author": "Game Master"
        }

        scenario = self.compiler.compile(extraction, gm_config)

        print(f"✓ Compiled scenario: {scenario['metadata']['name']}")
        print(f"✓ Difficulty: {scenario['metadata']['difficulty']}")
        print(f"✓ Duration: {scenario['metadata']['duration']['rounds']} rounds")

        # Phase 3: Validation (optional)
        if validate:
            print("\n[Phase 3/3] Validation")
            print("-" * 60)

            report = self.validator.validate(
                scenario,
                num_simulations=num_simulations,
                verbose=True
            )

            # Add report to scenario
            scenario["validation_report"] = report

            if not report["all_checks_passed"]:
                print("\n⚠️  Validation found issues:")
                for issue in report["issues"]:
                    print(f"   - {issue}")

                print("\nProceed with deployment? (y/n): ", end="")
                response = input().strip().lower()

                if response != "y":
                    print("Scenario creation cancelled.")
                    return None

        # Save
        print(f"\n[Final] Saving Scenario")
        print("-" * 60)

        self.compiler.save_scenario(scenario, output_file)

        print("\n" + "="*60)
        print("✅ Scenario creation complete!")
        print("="*60)
        print(f"\nScenario file: {output_file}")
        print(f"Ready to load in game engine.\n")

        return scenario

    def extract_only(
        self,
        doc_files: list,
        user_prompt: str,
        output_file: str = "extracted.json"
    ):
        """Phase 1 only: Extract scenario blocks from documents."""
        print("Running Phase 1: Document Ingestion...")

        extraction = self.ingestion.process_documents(
            doc_files,
            user_prompt,
            domain="air_pollution"
        )

        self.ingestion.save_extraction(extraction, output_file)

        return extraction

    def compile_only(
        self,
        extraction_file: str,
        config: dict,
        output_file: str = "compiled.json"
    ):
        """Phase 2 only: Compile extracted blocks into scenario."""
        print("Running Phase 2: Scenario Compilation...")

        with open(extraction_file) as f:
            extraction = json.load(f)

        scenario = self.compiler.compile(extraction, config)
        self.compiler.save_scenario(scenario, output_file)

        return scenario

    def validate_only(
        self,
        scenario_file: str,
        num_simulations: int = 10,
        output_file: str = None
    ):
        """Phase 3 only: Validate compiled scenario."""
        print("Running Phase 3: Validation...")

        with open(scenario_file) as f:
            scenario = json.load(f)

        report = self.validator.validate(
            scenario,
            num_simulations=num_simulations,
            verbose=True
        )

        if output_file:
            self.validator.save_report(report, output_file)

        return report


def main():
    parser = argparse.ArgumentParser(
        description="Architect Mode: Create TTX scenarios from documents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:

  # Full workflow (recommended)
  python architect_cli.py create \\
      --docs SAFAR_report.pdf workshop_notes.txt \\
      --prompt "Create October 2024 crisis scenario" \\
      --name "October Crisis" \\
      --output scenario.json

  # Step by step
  python architect_cli.py extract --docs *.pdf --prompt "..." -o extracted.json
  python architect_cli.py compile -i extracted.json -o compiled.json
  python architect_cli.py validate --scenario compiled.json
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # CREATE command (full workflow)
    create_parser = subparsers.add_parser("create", help="Full workflow: extract → compile → validate")
    create_parser.add_argument("--docs", nargs="+", help="Document files (PDFs, .txt)")
    create_parser.add_argument("--prompt", required=True, help="GM's scenario description")
    create_parser.add_argument("--name", required=True, help="Scenario name")
    create_parser.add_argument("--difficulty", choices=["easy", "medium", "hard"], default="medium")
    create_parser.add_argument("--rounds", type=int, default=5)
    create_parser.add_argument("--output", "-o", default="scenario.json")
    create_parser.add_argument("--no-validate", action="store_true", help="Skip validation")
    create_parser.add_argument("--simulations", type=int, default=10, help="Number of validation simulations")

    # EXTRACT command (phase 1)
    extract_parser = subparsers.add_parser("extract", help="Phase 1: Extract from documents")
    extract_parser.add_argument("--docs", nargs="+", help="Document files")
    extract_parser.add_argument("--prompt", required=True, help="GM's scenario description")
    extract_parser.add_argument("--output", "-o", default="extracted.json")

    # COMPILE command (phase 2)
    compile_parser = subparsers.add_parser("compile", help="Phase 2: Compile scenario")
    compile_parser.add_argument("--input", "-i", required=True, help="Extracted scenario JSON")
    compile_parser.add_argument("--name", help="Scenario name")
    compile_parser.add_argument("--difficulty", choices=["easy", "medium", "hard"], default="medium")
    compile_parser.add_argument("--rounds", type=int, default=5)
    compile_parser.add_argument("--output", "-o", default="compiled.json")

    # VALIDATE command (phase 3)
    validate_parser = subparsers.add_parser("validate", help="Phase 3: Validate scenario")
    validate_parser.add_argument("--scenario", required=True, help="Compiled scenario JSON")
    validate_parser.add_argument("--simulations", type=int, default=10)
    validate_parser.add_argument("--output", "-o", help="Save validation report")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    cli = ArchitectCLI()

    try:
        if args.command == "create":
            cli.create_full_workflow(
                doc_files=args.docs or [],
                user_prompt=args.prompt,
                scenario_name=args.name,
                difficulty=args.difficulty,
                rounds=args.rounds,
                output_file=args.output,
                validate=not args.no_validate,
                num_simulations=args.simulations
            )

        elif args.command == "extract":
            cli.extract_only(
                doc_files=args.docs or [],
                user_prompt=args.prompt,
                output_file=args.output
            )

        elif args.command == "compile":
            config = {
                "difficulty": args.difficulty,
                "rounds": args.rounds
            }
            if args.name:
                config["name"] = args.name

            cli.compile_only(
                extraction_file=args.input,
                config=config,
                output_file=args.output
            )

        elif args.command == "validate":
            cli.validate_only(
                scenario_file=args.scenario,
                num_simulations=args.simulations,
                output_file=args.output
            )

    except FileNotFoundError as e:
        print(f"\n❌ Error: File not found - {e}")
        sys.exit(1)

    except json.JSONDecodeError as e:
        print(f"\n❌ Error: Invalid JSON - {e}")
        sys.exit(1)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
