"""
Architect Mode: Game Master Scenario Creation Workflow

Enables policy experts to create custom TTX scenarios from domain documents.

Three-phase workflow:
    Phase 1: Document Ingestion (extract from PDFs/presentations)
    Phase 2: Scenario Compilation (configure and assemble)
    Phase 3: Validation (balance and playability checks)

Usage:
    from architect import DocumentIngestion, ScenarioCompiler, ScenarioValidator

    # Phase 1
    ingestion = DocumentIngestion()
    extraction = ingestion.process_documents(files, prompt, domain)

    # Phase 2
    compiler = ScenarioCompiler()
    scenario = compiler.compile(extraction, config)

    # Phase 3
    validator = ScenarioValidator()
    report = validator.validate(scenario, num_simulations=10)

Or use the CLI:
    python architect_cli.py create --docs *.pdf --prompt "..." --output scenario.json
"""

from .document_ingestion import DocumentIngestion
from .scenario_compiler import ScenarioCompiler
from .scenario_validator import ScenarioValidator

__version__ = "1.0.0"
__all__ = ["DocumentIngestion", "ScenarioCompiler", "ScenarioValidator"]
