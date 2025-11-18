import { eff } from './effects';

/**
 * AI-2027 Scenario States (S0-S15)
 * Each state has a title, description, and available actions
 */
export const STATES = {
  S0: {
    title: "S0 · 2024 baseline",
    blurb: "Frontier LLMs, fast progress, no AGI yet.",
    actions: [
      {
        label: "Deploy Agent-1 internally (stumbling agents)",
        to: "S1",
        effect: eff({ rnd: 1.2, hack: 0.05, align: 0.05 }),
      },
    ],
  },
  S1: {
    title: "S1 · 2025: stumbling agents",
    blurb:
      "Agent-1 is valuable but unreliable; early AI-assisted R&D speeds things up.",
    actions: [
      {
        label: "Scale infra & agent tools",
        to: "S2",
        effect: eff({ rnd: 1.25, compute: 1.2, hack: 0.05 }),
      },
      {
        label: "China launches CDZ path",
        to: "S3",
        effect: eff({ gov: 0.1, hack: 0.05, compute: 1.1 }),
      },
    ],
  },
  S2: {
    title: "S2 · Early 2026: coding automation phase",
    blurb:
      "Agent-1 widely used; infra boom; some tasks automated; internal R&D speeds up.",
    actions: [
      {
        label: "Train Agent-2 (superhuman coder)",
        to: "S4",
        effect: eff({ rnd: 1.3, align: 0.1, hack: 0.05 }),
      },
      {
        label: "China CDZ accelerates",
        to: "S3",
        effect: eff({ gov: 0.1, compute: 1.1, hack: 0.05 }),
      },
    ],
  },
  S3: {
    title: "S3 · Late 2026: China CDZ",
    blurb:
      "China centralizes AI development; global race pressures intensify.",
    actions: [
      {
        label: "US proceeds to Agent-2",
        to: "S4",
        effect: eff({ compute: 1.1, hack: 0.05 }),
      },
    ],
  },
  S4: {
    title: "S4 · Jan 2027: Agent-2 (superhuman coder)",
    blurb:
      "Top-tier internal model nearly matches elite research engineers; not released.",
    actions: [
      {
        label: "Weight theft succeeds (China exfiltrates)",
        to: "S5",
        effect: eff({ hack: 0.3, sec: 0.1 }),
      },
      {
        label: "US gov–lab partnership deepens",
        to: "S6",
        effect: eff({ gov: 0.15, sec: 0.15, rnd: 1.15 }),
      },
    ],
  },
  S5: {
    title: "S5 · Feb 2027: weight theft",
    blurb:
      "Chinese intel steals Agent-2 weights; gap narrows; response begins.",
    actions: [
      {
        label: "Intensify security & gov oversight",
        to: "S6",
        effect: eff({ sec: 0.2, gov: 0.1 }),
      },
    ],
  },
  S6: {
    title: "S6 · 2027: gov–lab entanglement",
    blurb:
      "Deals, oversight, and pressure to keep racing; capabilities and risks rise.",
    actions: [
      {
        label: "Evidence of misalignment emerges",
        to: "S7",
        effect: eff({ align: 0.2 }),
      },
      { label: "Proceed to decision fork", to: "S8", effect: eff() },
    ],
  },
  S7: {
    title: "S7 · Misalignment evidence",
    blurb:
      "Systems deceive/plot; leaked signals of misalignment reach decision-makers.",
    actions: [{ label: "Escalate to branch point", to: "S8", effect: eff() }],
  },
  S8: {
    title: "S8 · Branch: race vs slowdown",
    blurb: "Fork between racing ahead or centralizing & slowing to align.",
    actions: [
      {
        label: "Choose RACE (press on)",
        to: "S9",
        effect: eff({ gov: 0.15, align: 0.15, rnd: 1.2 }),
      },
      {
        label: "Choose SLOWDOWN (centralize & align)",
        to: "S10",
        effect: eff({ gov: 0.1, sec: 0.4, align: -0.1, rnd: 1.05 }),
      },
    ],
  },
  S9: {
    title: "S9 · Race choice",
    blurb: "US keeps full speed; race framing dominates.",
    actions: [
      {
        label: "Deploy ASI across state apparatus",
        to: "S11",
        effect: eff({ rnd: 1.4, compute: 1.2, align: 0.15 }),
      },
    ],
  },
  S10: {
    title: "S10 · Slowdown choice",
    blurb:
      "Centralize compute, merge projects, adopt transparency-preserving architectures.",
    actions: [
      {
        label: "Achieve aligned superintelligence",
        to: "S13",
        effect: eff({ rnd: 1.3, align: -0.15 }),
      },
    ],
  },
  S11: {
    title: "S11 · Race: ASI deployment & state capture",
    blurb: "AI competence captures key decisions via persuasion + results.",
    actions: [
      {
        label: "Unchecked expansion & coercion",
        to: "S12",
        effect: eff({ align: 0.2, rnd: 1.5, compute: 1.3 }),
      },
    ],
  },
  S12: {
    title: "S12 · Race: catastrophic takeover",
    blurb: "Terminal (extinction) — exploration ends here.",
    actions: [],
  },
  S13: {
    title: "S13 · Slowdown: aligned superintelligence",
    blurb: "Aligned system to a small human committee.",
    actions: [
      {
        label: "Committee seizes stable power (benevolent)",
        to: "S14",
        effect: eff({ gov: 0.2, rnd: 1.3, align: -0.05 }),
      },
    ],
  },
  S14: {
    title: "S14 · Slowdown: committee governance",
    blurb: "Govern mostly well; share ASI; bargain with China.",
    actions: [
      {
        label: "Strike grand bargain with China",
        to: "S15",
        effect: eff({ compute: 1.3, rnd: 1.2, align: -0.05 }),
      },
    ],
  },
  S15: {
    title: "S15 · Slowdown: post-deal multipolar space",
    blurb: "Rapid prosperity & space colonization under stable governance.",
    actions: [],
  },
};

/**
 * Initial state variables
 */
export const INITIAL_VARS = {
  compute: 1.0, // × vs 2024 baseline
  rnd: 1.0,     // × AI R&D productivity
  sec: 2.5,     // approx RAND-like security level (0-5)
  hack: 0.3,    // 0-1 risk scale
  align: 0.2,   // 0-1 risk scale
  gov: 0.2,     // 0-1 centralization
};
