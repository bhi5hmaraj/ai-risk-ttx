# AI-2027 Modeling Playground – MVP Documentation

This folder contains focused implementation documentation for the AI-2027 modeling playground MVP.

## Quick Start

**New to this project?** Start here:

1. **[impl_plan.md](impl_plan.md)** - Complete implementation roadmap (read this first)
2. **[tech_design.md](tech_design.md)** - Architecture and technology choices
3. **[model_design.md](model_design.md)** - Which formal models we're supporting

## Documentation Structure

### Implementation Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| **[impl_plan.md](impl_plan.md)** | Week-by-week implementation roadmap with tasks, milestones, and success criteria | Developers implementing the MVP |
| **[tech_design.md](tech_design.md)** | Technical architecture: Next.js + React Flow + Matrix service design | Tech leads, architects |
| **[model_design.md](model_design.md)** | Formal model scope: LTS → Time-Indexed Kripke → MDP progression | Researchers, model designers |

### Supporting Documents

| Document | Purpose |
|----------|---------|
| **[../TOOLS_LITERATURE_SURVEY.md](../TOOLS_LITERATURE_SURVEY.md)** | Comprehensive survey of available libraries (JS/Python) |
| **[../FORMAL_MODELING_SUMMARY.md](../FORMAL_MODELING_SUMMARY.md)** | High-level overview of formal modeling approach |
| **[../formal_models/](../formal_models/)** | Detailed specifications of all formal models |
| **[../logics/](../logics/)** | Temporal logic specifications (LTL, CTL, PCTL, TCTL) |

## Phase Overview

### Phase 1: Deterministic LTS (Week 1)
- **Model**: Simple finite-state machine, deterministic transitions
- **Tech**: Next.js + React Flow + local JS logic
- **Deliverables**: Interactive visualization, basic property checking

### Phase 2: Time Guards (Week 2)
- **Model**: Add temporal constraints (time windows on edges)
- **Tech**: Extend state representation with time
- **Deliverables**: Decision window warnings, bounded properties

### Phase 3: Matrix + MDP (Weeks 3-5)
- **Model**: Add probabilities (stochastic transitions)
- **Tech**: FastAPI backend with Python libraries
- **Deliverables**: Risk quantification, PCTL checking

## Key Concepts

### Canonical Graph Contract

All backends (local JS or Matrix) must provide:

```typescript
interface GraphResponse {
  meta: ModelMeta;
  nodes: NodeAP[];
  edges: EdgeAP[];
}
```

This contract ensures the frontend visualization works regardless of backend.

### Progressive Complexity

```
LTS (deterministic)
  ↓ add time guards
Time-Indexed Kripke
  ↓ add probabilities
MDP (stochastic)
  ↓ optionally add continuous time
CTMDP
```

Each phase extends the previous, not rewrites.

## Development Workflow

1. **Review**: Read [impl_plan.md](impl_plan.md) for current phase tasks
2. **Design**: Consult [tech_design.md](tech_design.md) for architecture decisions
3. **Model**: Consult [model_design.md](model_design.md) for formal specifications
4. **Implement**: Follow week-by-week task breakdown
5. **Test**: Check success criteria for current phase
6. **Document**: Update docs as design evolves

## Status Tracking

- **Phase 1 (Deterministic LTS)**: Not started
- **Phase 2 (Time Guards)**: Not started
- **Phase 3 (Matrix + MDP)**: Not started

See [impl_plan.md](impl_plan.md) for detailed milestones and task lists.

## Questions?

- **Implementation questions**: See [impl_plan.md](impl_plan.md)
- **Tech stack questions**: See [tech_design.md](tech_design.md)
- **Model scope questions**: See [model_design.md](model_design.md)
- **Library options**: See [../TOOLS_LITERATURE_SURVEY.md](../TOOLS_LITERATURE_SURVEY.md)
- **Formal methods background**: See [../formal_models/](../formal_models/) and [../logics/](../logics/)

---

**Last updated**: 2025-11-18
