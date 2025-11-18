# Funding Proposal Materials

This folder contains all materials for the AI Futures partnership funding proposal.

## Proposal Documents

- **AI_2027_PROPOSAL_V3.md** - Final version (strategic, recommended for submission)
- **AI_2027_PROPOSAL_V2.md** - Detailed technical version (for internal reference)
- **AI_2027_PROPOSAL.md** - Original version (archived)

## Visualizations

Located in `diagrams/` subfolder. Run `python funding/diagrams/generate_all.py` to generate all diagrams.

### Generated Diagrams

**Player Journey**:
- `player_journey.png` - Engagement funnel showing casual → serious → researcher progression
- `progression_pathway.png` - Progressive complexity visualization

**Success Timeline**:
- `success_timeline.png` - 12-month roadmap with milestones and metrics

**Impact Dimensions**:
- `impact_dimensions.png` - 3D visualization of viral × research × policy impact
- `impact_over_time.png` - How different impact dimensions grow over time

**Partnership Value**:
- `partnership_value.png` - Venn diagram and value multiplication
- `risk_mitigation.png` - Risk reduction through partnership

**MDA Framework**:
- `mda_framework.png` - Mechanics-Dynamics-Aesthetics game design framework
- `mda_development.png` - MDA focus across development phases

## Usage

### Generate All Diagrams

```bash
python funding/diagrams/generate_all.py
```

### Generate Individual Diagrams

```bash
python funding/diagrams/player_journey.py
python funding/diagrams/success_timeline.py
python funding/diagrams/impact_dimensions.py
python funding/diagrams/partnership_value.py
python funding/diagrams/mda_framework.py
```

### Requirements

```bash
pip install matplotlib numpy
```

## Proposal Structure

**AI_2027_PROPOSAL_V3.md** follows this structure:

1. Why This Matters - The gap and opportunity
2. Vision - What players experience (includes MDA framework)
3. How This Extends AI 2027's Mission
4. What We've Built
5. Success State (6-12 months)
6. Architecture Overview (high-level only)
7. Design Principles
8. Development Timeline
9. What We Need
10. Technical Foundation (deliberately vague on implementation)
11. Why This Partnership Works
12. Summary & Next Steps

## Strategic Notes

**V3 is strategically vague** on implementation details to maintain negotiating leverage:
- No specific tech stack mentioned
- No internal project names (Stein, Matrix, etc.)
- Implementation details described as "part of our technical advantage"
- Budget deferred to follow-up conversations

**V2 has full technical detail** for internal reference and deeper technical discussions if needed.
