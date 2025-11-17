#!/usr/bin/env python3
"""
Extract causal DAG from AI2027 and Situational Awareness research.

This script builds a state machine representation of AI timeline forecasts,
including:
- State variables and their evolution
- Causal links (A → B transitions)
- Evidence and assumptions for each link
- Epistemic confidence scores
- Internal consistency (NLI) scores
"""

import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EpistemicStrength(Enum):
    """Epistemic confidence levels"""
    STRONG_EVIDENCE = 1.0        # Well-grounded in data, multiple sources
    MODERATE_EVIDENCE = 0.5      # Some data, reasonable assumptions
    WEAK_EVIDENCE = 0.0          # Speculative, limited data
    CONTESTED = -0.5             # Active disagreement in community
    UNFOUNDED = -1.0             # No clear evidence


class NLIScore(Enum):
    """Natural Language Inference consistency scores"""
    ENTAILMENT = 1.0       # Logically follows
    NEUTRAL = 0.0          # Neither supports nor contradicts
    CONTRADICTION = -1.0   # Logically inconsistent


@dataclass
class Citation:
    """Source citation with snippet"""
    source: str
    url: Optional[str]
    snippet: str
    page: Optional[int] = None


@dataclass
class Assumption:
    """Individual assumption underlying a causal link"""
    id: str
    description: str
    epistemic_score: float  # -1 to 1
    rationale: str
    citations: List[Citation]
    contested_by: Optional[List[str]] = None  # List of counter-arguments


@dataclass
class Evidence:
    """Evidence supporting a causal link"""
    type: str  # "empirical", "theoretical", "precedent", "expert_opinion"
    description: str
    strength: float  # 0 to 1
    citations: List[Citation]


@dataclass
class StateVariable:
    """A variable in the state space"""
    name: str
    description: str
    type: str  # "continuous", "discrete", "categorical"
    unit: Optional[str] = None
    current_value: Optional[Any] = None
    uncertainty: Optional[str] = None


@dataclass
class CausalLink:
    """A causal relationship: Event/Condition → State Transition"""
    id: str
    from_state: str
    to_state: str
    trigger_event: str
    mechanism: str  # How the transition happens
    time_scale: str  # "months", "years", "immediate"

    assumptions: List[Assumption]
    evidence: List[Evidence]

    # Scores
    epistemic_confidence: float  # Aggregate of assumption scores
    nli_consistency: float       # Internal logical consistency

    # Metadata
    claimed_by: List[str]  # Who makes this claim
    contested: bool = False
    alternative_paths: Optional[List[str]] = None  # Other possible outcomes


@dataclass
class StateNode:
    """A state in the state machine"""
    id: str
    name: str
    description: str
    variables: Dict[str, StateVariable]

    # Graph connections
    incoming_links: List[str]  # IDs of CausalLinks leading here
    outgoing_links: List[str]  # IDs of CausalLinks from here

    # Temporal info
    estimated_time: Optional[str] = None  # "Q1 2025", "late 2027", etc
    probability: Optional[float] = None    # P(reaching this state)


@dataclass
class CausalDAG:
    """Complete causal directed acyclic graph"""
    nodes: Dict[str, StateNode]
    links: Dict[str, CausalLink]

    # Metadata
    source_documents: List[Citation]
    created_at: str
    version: str


def build_ai2027_dag() -> CausalDAG:
    """
    Build the AI2027 causal DAG based on research summaries.

    Key sources:
    - AI 2027 forecasts (Kokotajlo et al)
    - Situational Awareness (Aschenbrenner)
    - Compute forecasts, algorithmic progress models
    """

    # Define state variables that matter
    state_vars = {
        "compute": StateVariable(
            name="compute",
            description="Leading AI lab's effective compute (FLOP)",
            type="continuous",
            unit="FLOP",
            current_value=1e25,
            uncertainty="±50%"
        ),
        "algorithmic_efficiency": StateVariable(
            name="algorithmic_efficiency",
            description="Algorithmic efficiency relative to 2024 baseline",
            type="continuous",
            unit="relative",
            current_value=1.0,
            uncertainty="±30%"
        ),
        "capability_level": StateVariable(
            name="capability_level",
            description="AI capability benchmark (human-equivalent)",
            type="categorical",
            current_value="GPT-4 level (~smart high schooler)",
            uncertainty="subjective mapping"
        ),
        "espionage_risk": StateVariable(
            name="espionage_risk",
            description="Probability of model weights being stolen",
            type="continuous",
            unit="probability",
            current_value=0.5,
            uncertainty="high uncertainty"
        ),
        "regulatory_stringency": StateVariable(
            name="regulatory_stringency",
            description="Degree of AI regulation (0=none, 1=full pause)",
            type="continuous",
            unit="normalized",
            current_value=0.2,
            uncertainty="varies by jurisdiction"
        ),
        "open_source_proliferation": StateVariable(
            name="open_source_proliferation",
            description="Availability of capable open models",
            type="categorical",
            current_value="mid-level diffusion",
            uncertainty="depends on policy"
        ),
        "us_china_relations": StateVariable(
            name="us_china_relations",
            description="Trust/cooperation level (0=adversarial, 1=allied)",
            type="continuous",
            unit="normalized",
            current_value=0.3,
            uncertainty="geopolitical volatility"
        )
    }

    # Define key states in the progression
    nodes = {}

    # State 1: Current (2024-2025)
    nodes["current_2024"] = StateNode(
        id="current_2024",
        name="Current State (Late 2024)",
        description="GPT-4 level models, ~1e25 FLOP training runs",
        variables=state_vars.copy(),
        incoming_links=[],
        outgoing_links=["compute_scaling", "algo_progress", "espionage_begins"],
        estimated_time="Q4 2024",
        probability=1.0
    )

    # State 2: GPT-5 level (2025-2026)
    nodes["gpt5_level"] = StateNode(
        id="gpt5_level",
        name="GPT-5 Level (~College Graduate)",
        description="Models can do most knowledge work at graduate level",
        variables={
            **state_vars,
            "compute": StateVariable("compute", "~1e26 FLOP", "continuous", "FLOP", 1e26),
            "capability_level": StateVariable("capability_level", "College graduate level", "categorical")
        },
        incoming_links=["compute_scaling", "algo_progress"],
        outgoing_links=["to_agi", "to_race_dynamics"],
        estimated_time="2025-2026",
        probability=0.7
    )

    # State 3: AGI/Superhuman Coder (2027)
    nodes["agi_2027"] = StateNode(
        id="agi_2027",
        name="AGI / Superhuman AI Researcher",
        description="AI systems can automate AI research itself",
        variables={
            **state_vars,
            "compute": StateVariable("compute", "~1e27 FLOP", "continuous", "FLOP", 1e27),
            "capability_level": StateVariable("capability_level", "Superhuman researcher", "categorical")
        },
        incoming_links=["to_agi"],
        outgoing_links=["to_foom", "to_misalignment"],
        estimated_time="Early-Mid 2027",
        probability=0.5
    )

    # State 4: Fast Takeoff / FOOM (Late 2027)
    nodes["superintelligence"] = StateNode(
        id="superintelligence",
        name="Superintelligence (ASI)",
        description="Recursive self-improvement, far beyond human",
        variables={
            **state_vars,
            "capability_level": StateVariable("capability_level", "Vastly superhuman", "categorical")
        },
        incoming_links=["to_foom"],
        outgoing_links=[],
        estimated_time="Late 2027",
        probability=0.3
    )

    # State 5: Race Dynamics (alternative path)
    nodes["race_dynamics"] = StateNode(
        id="race_dynamics",
        name="US-China AI Race",
        description="Competitive dynamics, reduced safety margins",
        variables={
            **state_vars,
            "us_china_relations": StateVariable("us_china_relations", "0.1 (hostile)", "continuous"),
            "regulatory_stringency": StateVariable("regulatory_stringency", "0.1 (minimal)", "continuous")
        },
        incoming_links=["to_race_dynamics", "espionage_revealed"],
        outgoing_links=["race_to_agi"],
        estimated_time="2025-2026",
        probability=0.6
    )

    # Define causal links
    links = {}

    # Link 1: Compute Scaling
    links["compute_scaling"] = CausalLink(
        id="compute_scaling",
        from_state="current_2024",
        to_state="gpt5_level",
        trigger_event="Continued investment in larger training runs",
        mechanism="Exponential scaling: compute doubles every ~6 months",
        time_scale="6-12 months",
        assumptions=[
            Assumption(
                id="assume_compute_1",
                description="Compute will continue to scale exponentially (Moore's law + investment)",
                epistemic_score=0.7,
                rationale="Historical trend 2012-2024, TSMC roadmaps, VC funding levels support this",
                citations=[
                    Citation(
                        source="AI2027 Compute Forecast",
                        url="https://ai-2027.com/research/compute-forecast",
                        snippet="By end of 2027, expect 1000x GPT-4 compute levels"
                    ),
                    Citation(
                        source="Situational Awareness",
                        url="https://situational-awareness.ai",
                        snippet="Compute scaling 0.5 OOMs/year from 2012-2024"
                    )
                ],
                contested_by=["Data center power constraints", "GPU manufacturing bottlenecks"]
            ),
            Assumption(
                id="assume_compute_2",
                description="Scaling laws continue to hold (no diminishing returns)",
                epistemic_score=0.3,
                rationale="Empirically held so far, but theoretical basis weak. Chinchilla scaling suggests continued gains.",
                citations=[
                    Citation(
                        source="Scaling Laws Paper",
                        url=None,
                        snippet="Performance scales as power law of compute, data, parameters"
                    )
                ],
                contested_by=["Data wall concerns", "Sample efficiency limits"]
            )
        ],
        evidence=[
            Evidence(
                type="empirical",
                description="Historical compute growth 2012-2024",
                strength=0.9,
                citations=[
                    Citation("AI and Compute (OpenAI)", None, "Training compute doubled ~every 6 months")
                ]
            ),
            Evidence(
                type="precedent",
                description="TSMC 2nm node on track for 2025",
                strength=0.7,
                citations=[
                    Citation("TSMC Roadmap", None, "2nm fabrication scheduled 2025")
                ]
            )
        ],
        epistemic_confidence=0.6,
        nli_consistency=0.8,
        claimed_by=["AI2027", "Situational Awareness", "Epoch AI"],
        contested=False
    )

    # Link 2: Algorithmic Progress
    links["algo_progress"] = CausalLink(
        id="algo_progress",
        from_state="current_2024",
        to_state="gpt5_level",
        trigger_event="Continued ML research yields efficiency gains",
        mechanism="Algorithmic improvements: ~0.5 OOMs/year effective compute gain",
        time_scale="12-24 months",
        assumptions=[
            Assumption(
                id="assume_algo_1",
                description="Algorithmic progress continues at historical rates (~0.5 OOMs/year)",
                epistemic_score=0.4,
                rationale="Empirical trend 2012-2024, but uncertain if sustainable. Low-hanging fruit may be exhausted.",
                citations=[
                    Citation(
                        source="AI2027 Algorithmic Progress",
                        url=None,
                        snippet="Assume algorithmic progress 50% of total progress in 2024"
                    )
                ],
                contested_by=["Diminishing returns arguments", "Transformer architecture plateau concerns"]
            )
        ],
        evidence=[
            Evidence(
                type="empirical",
                description="Historical algorithmic gains (GPT-2 → GPT-3 → GPT-4)",
                strength=0.6,
                citations=[
                    Citation("Epoch AI", None, "Consistent algorithmic progress observed")
                ]
            )
        ],
        epistemic_confidence=0.4,
        nli_consistency=0.6,
        claimed_by=["AI2027", "Epoch AI"],
        contested=True
    )

    # Link 3: GPT-5 → AGI Transition
    links["to_agi"] = CausalLink(
        id="to_agi",
        from_state="gpt5_level",
        to_state="agi_2027",
        trigger_event="Scaffolding + unhobbling + agentic capabilities emerge",
        mechanism="Models become agents (long-horizon planning, tool use, self-correction)",
        time_scale="12-18 months",
        assumptions=[
            Assumption(
                id="assume_agi_1",
                description="Chatbot → Agent transition happens smoothly via scaffolding",
                epistemic_score=0.2,
                rationale="Speculative. Some evidence from AutoGPT, but reliable agency unproven.",
                citations=[
                    Citation(
                        source="Situational Awareness",
                        url=None,
                        snippet="By 2027, models will be agents like coworkers, not chatbots"
                    )
                ],
                contested_by=["Reliability concerns", "Long-horizon planning difficulties"]
            ),
            Assumption(
                id="assume_agi_2",
                description="AGI can automate AI research (ML engineering, theory, debugging)",
                epistemic_score=0.1,
                rationale="Highly speculative. Depends on breadth of capabilities.",
                citations=[
                    Citation(
                        source="AI2027",
                        url=None,
                        snippet="Hundreds of millions of AGIs automate AI research"
                    )
                ],
                contested_by=["Creative research requirements", "Reliability at scale"]
            )
        ],
        evidence=[
            Evidence(
                type="theoretical",
                description="If models can do ML tasks at human level, can likely automate research",
                strength=0.3,
                citations=[]
            )
        ],
        epistemic_confidence=0.15,
        nli_consistency=0.4,
        claimed_by=["AI2027", "Situational Awareness"],
        contested=True
    )

    # Link 4: AGI → Superintelligence (FOOM)
    links["to_foom"] = CausalLink(
        id="to_foom",
        from_state="agi_2027",
        to_state="superintelligence",
        trigger_event="AGI systems recursively self-improve",
        mechanism="Automated AI research compresses decades into months/weeks",
        time_scale="weeks to months",
        assumptions=[
            Assumption(
                id="assume_foom_1",
                description="Recursive self-improvement is possible and fast",
                epistemic_score=-0.3,
                rationale="Highly speculative. No empirical evidence. Depends on 'low-hanging fruit' in AI research.",
                citations=[
                    Citation(
                        source="AI2027",
                        url=None,
                        snippet="Compress decade of algorithmic progress into ≤1 year"
                    )
                ],
                contested_by=["Most AI researchers", "Diminishing returns arguments"]
            ),
            Assumption(
                id="assume_foom_2",
                description="Hardware can support massive parallelization",
                epistemic_score=0.5,
                rationale="Plausible if compute is available. Depends on parallelization efficiency.",
                citations=[
                    Citation(
                        source="AI2027",
                        url=None,
                        snippet="Deploy 1M copies at 50x human speed using 6% of compute"
                    )
                ]
            )
        ],
        evidence=[
            Evidence(
                type="theoretical",
                description="If research can be automated, parallelization enables speedup",
                strength=0.4,
                citations=[]
            )
        ],
        epistemic_confidence=-0.1,
        nli_consistency=0.2,
        claimed_by=["AI2027"],
        contested=True
    )

    # Link 5: Espionage Begins
    links["espionage_begins"] = CausalLink(
        id="espionage_begins",
        from_state="current_2024",
        to_state="race_dynamics",
        trigger_event="China recognizes strategic importance of AGI",
        mechanism="Full espionage apparatus targets US AI labs",
        time_scale="ongoing, intensifies by 2025",
        assumptions=[
            Assumption(
                id="assume_espionage_1",
                description="China will pursue espionage aggressively once AGI importance is clear",
                epistemic_score=0.6,
                rationale="Historical precedent (nuclear weapons, other strategic tech). CCP strategic culture.",
                citations=[
                    Citation(
                        source="Situational Awareness",
                        url=None,
                        snippet="Billions invested, extreme measures to infiltrate AGI efforts"
                    ),
                    Citation(
                        source="Historical precedent",
                        url=None,
                        snippet="Soviet nuclear espionage, Huawei industrial espionage"
                    )
                ]
            ),
            Assumption(
                id="assume_espionage_2",
                description="AI labs have weak security (insufficient to resist nation-state espionage)",
                epistemic_score=0.7,
                rationale="Labs are private companies, not military installations. Limited security budgets/culture.",
                citations=[
                    Citation(
                        source="Situational Awareness",
                        url=None,
                        snippet="Private AI efforts delivering superintelligence to CCP"
                    )
                ]
            )
        ],
        evidence=[
            Evidence(
                type="precedent",
                description="Historical espionage for strategic technologies",
                strength=0.8,
                citations=[
                    Citation("Manhattan Project espionage", None, "Soviet agents stole nuclear secrets")
                ]
            ),
            Evidence(
                type="expert_opinion",
                description="Security researchers warn of AI lab vulnerabilities",
                strength=0.6,
                citations=[]
            )
        ],
        epistemic_confidence=0.65,
        nli_consistency=0.9,
        claimed_by=["Situational Awareness"],
        contested=False
    )

    # Link 6: Espionage Revealed
    links["espionage_revealed"] = CausalLink(
        id="espionage_revealed",
        from_state="current_2024",
        to_state="race_dynamics",
        trigger_event="Major espionage incident becomes public",
        mechanism="US perception of China threat → adversarial dynamics",
        time_scale="possible any time 2024-2026",
        assumptions=[
            Assumption(
                id="assume_espionage_reveal_1",
                description="Espionage incidents will be detected and become public",
                epistemic_score=0.5,
                rationale="Historical precedent suggests eventual detection. Media/political incentives for exposure.",
                citations=[]
            )
        ],
        evidence=[
            Evidence(
                type="precedent",
                description="Snowden, WikiLeaks precedents of security breaches becoming public",
                strength=0.7,
                citations=[]
            )
        ],
        epistemic_confidence=0.5,
        nli_consistency=0.8,
        claimed_by=["Situational Awareness"],
        contested=False
    )

    # Link 7: Race to AGI (adversarial dynamics)
    links["race_to_agi"] = CausalLink(
        id="race_to_agi",
        from_state="race_dynamics",
        to_state="agi_2027",
        trigger_event="Competitive pressure overrides safety concerns",
        mechanism="Both sides cut corners, reduce safety margins, accelerate timelines",
        time_scale="12-24 months",
        assumptions=[
            Assumption(
                id="assume_race_1",
                description="Race dynamics reduce safety investment (safety tax unaffordable)",
                epistemic_score=0.6,
                rationale="Economic theory + precedent (nuclear arms race). First-mover advantage dominates.",
                citations=[
                    Citation(
                        source="Game theory",
                        url=None,
                        snippet="Prisoner's dilemma: defect (race) dominates cooperate (pause)"
                    )
                ]
            )
        ],
        evidence=[
            Evidence(
                type="theoretical",
                description="Game theory predicts defection in security dilemmas",
                strength=0.7,
                citations=[]
            ),
            Evidence(
                type="precedent",
                description="Nuclear arms race, space race precedents",
                strength=0.6,
                citations=[]
            )
        ],
        epistemic_confidence=0.6,
        nli_consistency=0.9,
        claimed_by=["Situational Awareness", "Security researchers"],
        contested=False
    )

    # Link 8: GPT-5 → Race Dynamics
    links["to_race_dynamics"] = CausalLink(
        id="to_race_dynamics",
        from_state="gpt5_level",
        to_state="race_dynamics",
        trigger_event="Capability demonstrations make strategic importance obvious",
        mechanism="Both US and China recognize AGI as decisive strategic advantage",
        time_scale="immediate once GPT-5 level reached",
        assumptions=[
            Assumption(
                id="assume_race_trigger_1",
                description="Advanced capabilities will be obvious and recognized by governments",
                epistemic_score=0.7,
                rationale="Hard to hide transformative AI once deployed. Economic/military implications clear.",
                citations=[]
            )
        ],
        evidence=[
            Evidence(
                type="theoretical",
                description="Transformative technology triggers great power competition",
                strength=0.7,
                citations=[]
            )
        ],
        epistemic_confidence=0.7,
        nli_consistency=0.9,
        claimed_by=["Situational Awareness"],
        contested=False
    )

    # Build the DAG
    dag = CausalDAG(
        nodes=nodes,
        links=links,
        source_documents=[
            Citation(
                source="AI 2027",
                url="https://ai-2027.com",
                snippet="Forecast by Kokotajlo et al predicting AGI early 2027, ASI late 2027"
            ),
            Citation(
                source="Situational Awareness: The Decade Ahead",
                url="https://situational-awareness.ai",
                snippet="Leopold Aschenbrenner's analysis of AGI timelines and national security"
            )
        ],
        created_at="2024-11-14",
        version="0.1.0"
    )

    return dag


def export_to_json(dag: CausalDAG, output_path: str):
    """Export DAG to JSON format"""

    def convert_to_dict(obj):
        if hasattr(obj, '__dict__'):
            result = {}
            for key, value in obj.__dict__.items():
                if isinstance(value, list):
                    result[key] = [convert_to_dict(item) for item in value]
                elif isinstance(value, dict):
                    result[key] = {k: convert_to_dict(v) for k, v in value.items()}
                elif isinstance(value, Enum):
                    result[key] = value.value
                else:
                    result[key] = convert_to_dict(value) if hasattr(value, '__dict__') else value
            return result
        return obj

    dag_dict = convert_to_dict(dag)

    with open(output_path, 'w') as f:
        json.dump(dag_dict, f, indent=2)

    print(f"✅ Exported DAG to {output_path}")


if __name__ == "__main__":
    print("Building AI2027 Causal DAG...")
    dag = build_ai2027_dag()

    print(f"\nDAG Summary:")
    print(f"  Nodes: {len(dag.nodes)}")
    print(f"  Links: {len(dag.links)}")

    # Export to JSON
    output_path = "research/ai_futures/analysis/ai2027_causal_dag.json"
    export_to_json(dag, output_path)

    print("\n✅ Complete! Next steps:")
    print("  1. Review the JSON file")
    print("  2. Visualize with scripts/visualize_dag.py")
    print("  3. Analyze epistemic scores and identify weak assumptions")
