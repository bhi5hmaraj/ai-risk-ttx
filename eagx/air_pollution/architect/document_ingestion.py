"""
Document Ingestion Pipeline for Architect Mode

Phase 1 of the Architect workflow: Extract scenario building blocks from domain documents.

Usage:
    ingestion = DocumentIngestion()

    # Process documents
    extracted = ingestion.process_documents([
        "path/to/SAFAR_report.pdf",
        "path/to/workshop_notes.txt"
    ], user_prompt="I want to create a scenario about...")

    # Save structured output
    ingestion.save_extraction(extracted, "extracted_scenario.json")
"""

import json
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
import re


class DocumentIngestion:
    """
    Extracts scenario building blocks from PDFs, text files, and user prompts.

    Architecture:
        Documents → Text Extraction → LLM Analysis → Structured JSON
    """

    def __init__(self, llm_service: Optional[Any] = None):
        """
        Args:
            llm_service: Optional LLM service (OpenAI/Gemini). If None, uses mock.
        """
        self.llm = llm_service
        self.extraction_template = self._load_extraction_template()

    def process_documents(
        self,
        file_paths: List[str],
        user_prompt: str,
        domain: str = "air_pollution"
    ) -> Dict[str, Any]:
        """
        Main pipeline: Documents → Extracted scenario blocks.

        Args:
            file_paths: Paths to PDFs, .txt, .docx files
            user_prompt: GM's description of what scenario they want
            domain: Domain context (air_pollution, pandemic, etc.)

        Returns:
            Structured extraction matching SCENARIO_SCHEMA building blocks
        """
        # Step 1: Extract text from all documents
        combined_text = self._extract_text_from_documents(file_paths)

        # Step 2: LLM analysis
        extraction = self._extract_scenario_blocks(
            combined_text,
            user_prompt,
            domain
        )

        # Step 3: Gap filling
        extraction = self._fill_gaps(extraction, user_prompt)

        return extraction

    def _extract_text_from_documents(self, file_paths: List[str]) -> str:
        """
        Extract text from PDFs, .txt, .docx files.

        Currently supports:
        - .txt files (direct read)
        - .pdf files (requires pypdf or similar)
        - .docx files (requires python-docx)
        """
        combined_text = []

        for file_path in file_paths:
            path = Path(file_path)

            if not path.exists():
                print(f"Warning: {file_path} not found, skipping")
                continue

            if path.suffix == ".txt":
                with open(path, 'r', encoding='utf-8') as f:
                    combined_text.append(f"=== {path.name} ===\n{f.read()}\n")

            elif path.suffix == ".pdf":
                # TODO: Implement PDF parsing (requires pypdf2 or pymupdf)
                combined_text.append(f"=== {path.name} ===\n[PDF parsing not yet implemented]\n")

            elif path.suffix == ".docx":
                # TODO: Implement DOCX parsing (requires python-docx)
                combined_text.append(f"=== {path.name} ===\n[DOCX parsing not yet implemented]\n")

            else:
                print(f"Warning: Unsupported file type {path.suffix}, skipping")

        return "\n\n".join(combined_text)

    def _extract_scenario_blocks(
        self,
        document_text: str,
        user_prompt: str,
        domain: str
    ) -> Dict[str, Any]:
        """
        LLM extraction: Identify stakeholders, parameters, events, etc.

        Uses structured prompt to extract:
        - Stakeholders (who plays)
        - Resources (budgets, capacities)
        - Parameters (calibrated values from literature)
        - Events (triggers and consequences)
        - Constraints (political, temporal, jurisdictional)
        """
        if self.llm is None:
            # Mock extraction for testing
            return self._mock_extraction(domain)

        # Build extraction prompt
        prompt = self._build_extraction_prompt(document_text, user_prompt, domain)

        # Call LLM with structured output
        # TODO: Integrate with actual LLM service
        response = self._call_llm_structured(prompt, schema=self.extraction_template)

        return response

    def _build_extraction_prompt(
        self,
        document_text: str,
        user_prompt: str,
        domain: str
    ) -> str:
        """Build the LLM extraction prompt."""
        return f"""You are a scenario extraction assistant for a tabletop exercise (TTX) game.

Domain: {domain}

User's Goal:
{user_prompt}

Documents Provided:
{document_text[:10000]}  # Truncate to first 10k chars for now

Extract the following scenario building blocks:

1. STAKEHOLDERS: Identify key actors/roles
   - Name and description
   - Objectives (public and potential hidden)
   - Constraints (budget, authority, timeline)
   - Resources they control

2. KEY PARAMETERS: Extract calibrated values from documents
   - Emission rates, effectiveness of interventions
   - Source citations (which document, page/section)
   - Confidence level (high/medium/low)

3. EVENTS: Potential triggers and consequences
   - Scheduled events (happen at specific times)
   - Conditional events (triggered by state changes)
   - Historical precedents mentioned in documents

4. INITIAL CONDITIONS: Starting state of the system
   - Environmental metrics (AQI, PM2.5, etc.)
   - Economic state (budgets)
   - Social state (public approval, compliance rates)

5. CONSTRAINTS: Political, temporal, jurisdictional limits
   - Who can/cannot do what
   - Timeline pressures
   - Regulatory frameworks

Format your response as structured JSON matching the schema provided.
"""

    def _call_llm_structured(self, prompt: str, schema: Dict) -> Dict[str, Any]:
        """
        Call LLM with structured output schema.

        TODO: Integrate with OpenAI/Gemini structured output
        """
        # Placeholder - return mock data
        return self._mock_extraction("air_pollution")

    def _fill_gaps(self, extraction: Dict[str, Any], user_prompt: str) -> Dict[str, Any]:
        """
        Identify missing parameters and suggest defaults or ask for clarification.

        Returns updated extraction with:
        - Filled defaults where appropriate
        - Flags for values that need GM input
        """
        # Check for required fields
        required_fields = [
            "stakeholders",
            "key_parameters",
            "initial_conditions",
            "events"
        ]

        gaps = []
        for field in required_fields:
            if field not in extraction or not extraction[field]:
                gaps.append(field)

        if gaps:
            extraction["_gaps"] = gaps
            extraction["_gap_suggestions"] = self._suggest_gap_fills(gaps, extraction)

        return extraction

    def _suggest_gap_fills(self, gaps: List[str], extraction: Dict) -> Dict[str, str]:
        """Suggest how to fill identified gaps."""
        suggestions = {}

        if "stakeholders" in gaps:
            suggestions["stakeholders"] = "Need to define at least 3 stakeholder roles. Common roles for air pollution: government officials, farmers, industry, health advocates, citizens."

        if "key_parameters" in gaps:
            suggestions["key_parameters"] = "Need calibrated parameters (emission rates, subsidy effectiveness). Use literature defaults or GM can specify custom values."

        if "initial_conditions" in gaps:
            suggestions["initial_conditions"] = "Need starting state (AQI, budgets, approval ratings). Use typical crisis scenario values?"

        if "events" in gaps:
            suggestions["events"] = "No events detected. Should include at least 2-3 events (scheduled or conditional) to drive narrative tension."

        return suggestions

    def _mock_extraction(self, domain: str) -> Dict[str, Any]:
        """
        Mock extraction for testing (returns pre-built structure).
        """
        if domain == "air_pollution":
            return {
                "stakeholders": [
                    {
                        "id": "delhi_cm",
                        "name": "Delhi Chief Minister",
                        "description": "Elected official managing Delhi government",
                        "public_objective": "Keep AQI below 300 throughout pollution season",
                        "potential_hidden_objectives": [
                            "Maintain public approval >60%",
                            "Win re-election in 18 months",
                            "Avoid blame from neighboring states"
                        ],
                        "constraints": [
                            "Cannot force Punjab/Haryana actions",
                            "Budget: ₹800 crores",
                            "Supreme Court oversight"
                        ],
                        "resources": {
                            "budget": 800,
                            "political_capital": 100
                        }
                    },
                    {
                        "id": "punjab_farmer",
                        "name": "Punjab Farmer Representative",
                        "description": "Represents 5 million farmers needing to clear fields before wheat planting",
                        "public_objective": "Protect farmer livelihoods and ensure timely wheat planting",
                        "potential_hidden_objectives": [
                            "Minimize farmer costs (<₹500/acre)",
                            "Maintain independence from government control",
                            "Secure subsidies >₹200cr"
                        ],
                        "constraints": [
                            "Wheat planting deadline: Nov 15",
                            "Happy Seeder cost: ₹1500/acre",
                            "Limited time for training"
                        ],
                        "resources": {
                            "acreage": 5000000,
                            "collective_influence": 80
                        }
                    },
                    {
                        "id": "central_minister",
                        "name": "Central Environment Minister",
                        "description": "Federal-level authority with interstate coordination power",
                        "public_objective": "Coordinate multi-state response to pollution crisis",
                        "potential_hidden_objectives": [
                            "Avoid political fallout from state conflicts",
                            "Position for national leadership role",
                            "Balance economy vs environment"
                        ],
                        "constraints": [
                            "Limited federal budget: ₹500 crores",
                            "Must negotiate with states",
                            "Election year politics"
                        ],
                        "resources": {
                            "budget": 500,
                            "regulatory_authority": 90
                        }
                    },
                    {
                        "id": "industry_leader",
                        "name": "Industry Association Head",
                        "description": "Represents construction, manufacturing, and power sectors",
                        "public_objective": "Minimize economic disruption from pollution controls",
                        "potential_hidden_objectives": [
                            "Avoid mandatory shutdowns",
                            "Shift blame to stubble burning",
                            "Secure subsidies for cleaner tech"
                        ],
                        "constraints": [
                            "Economic losses from shutdowns: ₹200cr/day",
                            "Technology upgrade costs high",
                            "Labor union pressures"
                        ],
                        "resources": {
                            "lobbying_power": 70,
                            "media_access": 60
                        }
                    },
                    {
                        "id": "health_activist",
                        "name": "Public Health Advocate",
                        "description": "Leads civil society coalition for clean air rights",
                        "public_objective": "Achieve AQI <100 and protect right to clean air",
                        "potential_hidden_objectives": [
                            "Force Supreme Court intervention",
                            "Build mass movement (>10,000 protesters)",
                            "Expose government inaction"
                        ],
                        "constraints": [
                            "No budget or formal authority",
                            "Depends on media coverage",
                            "Limited technical expertise"
                        ],
                        "resources": {
                            "public_support": 75,
                            "legal_expertise": 50
                        }
                    }
                ],

                "key_parameters": {
                    "emission_model": {
                        "stubble_burning_baseline": {
                            "value": 3000,
                            "unit": "tons_pm25_per_day",
                            "source": "SAFAR 2023, Table 4.2",
                            "confidence": "high"
                        },
                        "sector_shares": {
                            "vehicles": 0.28,
                            "industry": 0.20,
                            "construction": 0.17,
                            "stubble_burning": 0.26,
                            "residential": 0.09
                        },
                        "source": "SAFAR Delhi Emission Inventory 2023"
                    },
                    "behavioral_model": {
                        "subsidy_elasticity": {
                            "value": -0.60,
                            "description": "60% reduction in burning at 75% subsidy coverage",
                            "source": "IIT Delhi Stubble Study, p.42",
                            "confidence": "medium"
                        },
                        "enforcement_compliance": {
                            "value": 0.80,
                            "description": "Compliance rate with active enforcement",
                            "source": "Literature review",
                            "confidence": "medium"
                        }
                    },
                    "dispersion_model": {
                        "wind_dispersion_coeff": 0.40,
                        "rain_removal_rate": 0.85,
                        "inversion_trapping_factor": 0.70
                    }
                },

                "initial_conditions": {
                    "aqi": 150,
                    "pm25": 80,
                    "pm10": 160,
                    "season": "pre_diwali",
                    "budget_delhi": 800,
                    "budget_central": 500,
                    "public_approval": 65,
                    "public_alarm": 40,
                    "farmers_compliance": 0.30,
                    "industry_compliance": 0.50,
                    "enforcement_capacity": 0.50,
                    "round": 0,
                    "current_date": "2024-10-15"
                },

                "events": [
                    {
                        "id": "diwali_spike",
                        "name": "Diwali Firecracker Spike",
                        "type": "scheduled",
                        "trigger": {"round": 3},
                        "effects": {
                            "aqi": "+100",
                            "public_alarm": "+20",
                            "media_attention": "+30"
                        },
                        "narrative_template": "Despite bans, firecrackers lit across Delhi through the night. By morning, a thick, acrid haze blankets the city.",
                        "source": "Historical pattern (2019-2023)",
                        "confidence": "very_high"
                    },
                    {
                        "id": "supreme_court_hearing",
                        "name": "Supreme Court Summons Government",
                        "type": "conditional",
                        "trigger": {
                            "condition": "(aqi > 400) AND (days_in_severe >= 2)"
                        },
                        "effects": {
                            "government_accountability": "+50",
                            "public_alarm": "+30",
                            "political_pressure": "+40"
                        },
                        "narrative_template": "The Supreme Court issues notice demanding immediate action plan. 'The right to breathe clean air is a fundamental right,' the bench declares.",
                        "source": "MC Mehta vs Union of India (1998)",
                        "confidence": "high"
                    },
                    {
                        "id": "stubble_burning_peak",
                        "name": "Peak Stubble Burning Season",
                        "type": "scheduled",
                        "trigger": {"round": 2},
                        "effects": {
                            "stubble_emissions": "*2.5",
                            "aqi": "+80",
                            "farmer_pressure": "+40"
                        },
                        "narrative_template": "Satellite imagery shows 3,500 active fire spots across Punjab and Haryana. Smoke plumes visible from space drift toward Delhi.",
                        "source": "NASA FIRMS data 2019-2023",
                        "confidence": "very_high"
                    },
                    {
                        "id": "cold_wave_inversion",
                        "name": "Temperature Inversion Layer Forms",
                        "type": "conditional",
                        "trigger": {
                            "condition": "temperature_drop > 5 AND round >= 4"
                        },
                        "effects": {
                            "dispersion_rate": "*0.3",
                            "aqi": "+60",
                            "visibility": "-50%"
                        },
                        "narrative_template": "A sudden cold wave traps pollutants under a dense inversion layer. Meteorologists warn the smog could persist for days.",
                        "source": "IMD historical data",
                        "confidence": "high"
                    }
                ],

                "constraints": {
                    "delhi_cm": [
                        "Cannot force actions in Punjab/Haryana (jurisdictional)",
                        "Budget cannot exceed ₹800cr (fiscal)",
                        "Must comply with Supreme Court directives (legal)",
                        "Re-election in 18 months (temporal)"
                    ],
                    "punjab_farmer": [
                        "Wheat planting deadline Nov 15 (temporal)",
                        "Limited access to Happy Seeder machines (resource)",
                        "High upfront costs for alternatives (economic)"
                    ],
                    "central_minister": [
                        "Requires state cooperation (political)",
                        "Election year constraints (temporal)",
                        "Federal budget ₹500cr (fiscal)"
                    ]
                },

                "_metadata": {
                    "extraction_timestamp": "2025-01-15T10:30:00Z",
                    "extraction_method": "mock_data_v1",
                    "domain": "air_pollution",
                    "completeness": 0.85,
                    "requires_gm_input": [
                        "Select final stakeholder hidden objectives",
                        "Set difficulty level",
                        "Configure win/lose conditions"
                    ]
                }
            }
        else:
            return {"error": f"Mock extraction not available for domain: {domain}"}

    def save_extraction(self, extraction: Dict[str, Any], output_path: str):
        """Save extraction to JSON file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(extraction, f, indent=2, ensure_ascii=False)
        print(f"Saved extraction to {output_path}")

    def _load_extraction_template(self) -> Dict[str, Any]:
        """
        Load JSON schema template for LLM structured output.

        This defines the exact structure expected from LLM extraction.
        """
        return {
            "type": "object",
            "properties": {
                "stakeholders": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "public_objective": {"type": "string"},
                            "potential_hidden_objectives": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "constraints": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "resources": {"type": "object"}
                        },
                        "required": ["id", "name", "public_objective"]
                    }
                },
                "key_parameters": {"type": "object"},
                "initial_conditions": {"type": "object"},
                "events": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "type": {"enum": ["scheduled", "conditional"]},
                            "trigger": {"type": "object"},
                            "effects": {"type": "object"}
                        }
                    }
                },
                "constraints": {"type": "object"}
            },
            "required": ["stakeholders", "key_parameters", "initial_conditions"]
        }


# CLI interface for testing
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extract scenario blocks from documents")
    parser.add_argument("--files", nargs="+", help="Document files to process")
    parser.add_argument("--prompt", required=True, help="GM's scenario description")
    parser.add_argument("--output", default="extracted_scenario.json", help="Output JSON file")
    parser.add_argument("--domain", default="air_pollution", help="Domain context")

    args = parser.parse_args()

    ingestion = DocumentIngestion()

    file_paths = args.files or []
    extraction = ingestion.process_documents(file_paths, args.prompt, args.domain)

    ingestion.save_extraction(extraction, args.output)

    print(f"\nExtraction complete!")
    print(f"Stakeholders: {len(extraction.get('stakeholders', []))}")
    print(f"Events: {len(extraction.get('events', []))}")
    print(f"Parameters: {len(extraction.get('key_parameters', {}).keys())}")

    if "_gaps" in extraction:
        print(f"\n⚠️  Gaps detected: {', '.join(extraction['_gaps'])}")
        print("See _gap_suggestions in output for recommendations")
