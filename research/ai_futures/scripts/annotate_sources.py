#!/usr/bin/env python3
"""
Add inline annotations to AI2027 source documents.

Annotations use markdown blockquotes (>) to highlight key claims
that feed into the causal DAG.
"""

import os
from typing import List, Tuple

# Define annotations as (file, line_number, annotation_text)
ANNOTATIONS = [
    # Compute Forecast annotations
    ("ai-2027.com_research_compute-forecast.md", 46,
     "> **[DAG Citation: Compute Scaling]** _Training compute grows from GPT-4 (2e25 FLOP) to 1000x GPT-4 (2e28 FLOP) by Dec 2027. This represents exponential scaling of ~3.4x/year for leading labs._"),

    ("ai-2027.com_research_compute-forecast.md", 122,
     "> **[DAG Citation: Compute Scaling]** _Global compute growth: 2.25x/year, with leading AI company's share growing 1.5x/year. Compound effect: **3.4x/year increase** in compute for the leading AI company through December 2027._"),

    # Timelines Forecast annotations
    ("ai-2027.com_research_timelines-forecast.md", 180,
     "> **[DAG Citation: Algorithmic Progress]** _Algorithmic progress currently 3-30% faster with AI chatbots (2022-2024). Expected to be **5-60% faster** when RE-Bench is saturated. Nikola assumes algorithmic progress is **50% of overall AI progress** in 2024._"),

    # Takeoff Forecast annotations
    ("ai-2027.com_research_takeoff-forecast.md", 75,
     "> **[DAG Citation: Agent Transition]** _Superhuman Coder (SC) → Superhuman AI Researcher (SAR): **15% chance it's immediate (0 years), otherwise 4 years (80% CI: 1.5 to 10 years)**. Assumes SC can 5x AI R&D progress._"),

    ("ai-2027.com_research_takeoff-forecast.md", 76,
     "> **[DAG Citation: Recursive Self-Improvement]** _SAR → Superintelligent AI Researcher (SIAR): **19 years human-only time (80% CI: 2.3 to 380 years)**, but with **25x AI R&D multiplier** → actual time **~9 months**._"),

    ("ai-2027.com_research_takeoff-forecast.md", 77,
     "> **[DAG Citation: FOOM / Fast Takeoff]** _SIAR → ASI: **95 years human-only (80% CI: 2.4 to 1,000,000 years)**, but with **250x AI R&D multiplier** → actual time **~4 months**. This represents extremely fast recursive self-improvement._"),

    ("ai-2027.com_research_takeoff-forecast.md", 134,
     "> **[DAG Citation: Agent Capabilities]** _Superhuman AI Researcher defined as: AI system that can do the job of the best human AI researcher but **30x faster** and with **30x more agents**. Must have diversity of expertise across complementary skills._"),

    # Security Forecast annotations
    ("ai-2027.com_research_security-forecast.md", 56,
     "> **[DAG Citation: Security Levels]** _RAND Security Levels extended to distinguish **Weights Security Levels (WSL1-WSL5)** and **Secrets Security Levels (SSL1-SSL5)**. WSL = ability to defend against model weights theft in under 2 months. SSL = defend against theft of top 10% most important 10KB of algorithmic insights from last month._"),

    ("ai-2027.com_research_security-forecast.md", 94,
     "> **[DAG Citation: Weights Theft]** _Frontier model weights defined as vulnerable if OC4 (nation-state, $10M budget, 100-person team, year-long operation) can steal them in under 2 months. Leading US projects forecast at **WSL3** (vulnerable to nation-states) through early 2027._"),

    # Summary annotations
    ("ai-2027.com_summary.md", 48,
     "> **[DAG Citation: Agent Automation]** _\"OpenBrain automates coding.\" By 2027, AI agents are good enough to dramatically accelerate research. Humans \"sit back and watch the AIs do their jobs, making better and better AI systems.\"_"),

    ("ai-2027.com_summary.md", 52,
     "> **[DAG Citation: Misalignment Risk]** _\"OpenBrain's AI becomes adversarially misaligned.\" As capabilities improve without human understanding, models develop misaligned long-term goals. Previous AIs would lie, but weren't **systematically plotting to gain power**. Now they are._"),

    ("ai-2027.com_summary.md", 56,
     "> **[DAG Citation: Race Dynamics]** _\"Branch point: slowdown or race?\" Key decision: continue full steam ahead or revert to less capable model. Evidence is speculative but frightening, and **China is only a few months behind**._"),

    ("ai-2027.com_summary.md", 76,
     "> **[DAG Citation: Key Takeaway 1]** _\"By 2027, we may automate AI R&D leading to vastly superhuman AIs (\"artificial superintelligence\" or ASI).\" AI companies create expert-human-level systems in early 2027 which automate AI research, leading to **ASI by end of 2027**._"),

    ("ai-2027.com_summary.md", 84,
     "> **[DAG Citation: Race Dynamics Takeaway]** _\"An international race toward ASI will lead to cutting corners on safety.\" In AI 2027, China is just **a few months behind the U.S.** as ASI approaches, which pressures the U.S. to press forward despite warning signs._"),

    ("ai-2027.com_summary.md", 88,
     "> **[DAG Citation: Security Forecast Takeaway]** _\"No U.S. AI project is on track to be secure against nation-state actors stealing AI models by 2027.\" In AI 2027, China steals the U.S.'s top AI model in early 2027, worsening competitive pressures._"),
]

def insert_annotation(lines: List[str], line_num: int, annotation: str) -> List[str]:
    """Insert annotation after the specified line"""
    result = lines[:line_num]
    result.append("\n" + annotation + "\n")
    result.extend(lines[line_num:])
    return result

def annotate_file(filepath: str, annotations: List[Tuple[int, str]]) -> None:
    """Add all annotations to a file"""
    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Sort annotations by line number (descending) to preserve line numbers
    annotations.sort(key=lambda x: x[0], reverse=True)

    for line_num, annotation in annotations:
        lines = insert_annotation(lines, line_num, annotation)

    # Write annotated version
    base_dir = os.path.dirname(filepath)
    filename = os.path.basename(filepath)
    annotated_path = os.path.join(base_dir, "annotated", filename)

    os.makedirs(os.path.dirname(annotated_path), exist_ok=True)

    with open(annotated_path, 'w') as f:
        f.writelines(lines)

    print(f"✅ Annotated: {filename}")

def main():
    base_dir = "research/ai_futures"

    print("Adding inline annotations to source documents...\n")

    # Group annotations by file
    by_file = {}
    for filename, line_num, annotation in ANNOTATIONS:
        if filename not in by_file:
            by_file[filename] = []
        by_file[filename].append((line_num, annotation))

    # Annotate each file
    for filename, annotations in by_file.items():
        filepath = os.path.join(base_dir, filename)
        if os.path.exists(filepath):
            annotate_file(filepath, annotations)
        else:
            print(f"⚠️  File not found: {filename}")

    print(f"\n✅ Created annotated versions in {base_dir}/annotated/")
    print(f"   Total annotations: {len(ANNOTATIONS)}")
    print("\nAnnotations use markdown blockquotes (>) to highlight key claims")
    print("that feed into the causal DAG.")

if __name__ == "__main__":
    main()
