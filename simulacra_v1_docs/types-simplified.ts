/**
 * Simulacra MVP Types - Simplified
 * 
 * Removed: Hidden objectives, hidden scores
 * Added: Numeric resources, intents, policy, ENV
 * 
 * Design for: Single human now, multiple humans later
 */

// ============================================================================
// GAME PHASE
// ============================================================================

export enum GamePhase {
  LOBBY = 'lobby',
  STARTING = 'starting',     // Brief transition (LLM generating initial scenario)
  POLICY = 'policy',         // Players update goals/stances
  GENERATING = 'generating', // Server generating intents via LLM
  PROPOSAL = 'proposal',     // Players select intents (was ACTION)
  REVEAL = 'reveal',         // Simultaneous reveal
  COUNTER = 'counter',       // Players respond to incoming
  RESOLVING = 'resolving',   // Server applying resolution math
  DEBRIEF = 'debrief',       // Results shown, narrative generated
  END = 'end',
}

// Phase durations in seconds (0 = no timer, wait for ready)
export const DEFAULT_PHASE_DURATIONS: Record<GamePhase, number> = {
  [GamePhase.LOBBY]: 0,
  [GamePhase.STARTING]: 30,    // LLM timeout
  [GamePhase.POLICY]: 30,
  [GamePhase.GENERATING]: 30,  // LLM timeout
  [GamePhase.PROPOSAL]: 120,
  [GamePhase.REVEAL]: 5,       // Dramatic pause
  [GamePhase.COUNTER]: 90,
  [GamePhase.RESOLVING]: 5,
  [GamePhase.DEBRIEF]: 60,
  [GamePhase.END]: 0,
};

// ============================================================================
// RESOURCES
// ============================================================================

/**
 * Numeric resources for game mechanics
 * All values in [0, 100]
 */
export interface Resources {
  M: number;  // Material (money, compute, physical assets)
  I: number;  // Institutional (authority, legal power, access)
  N: number;  // Narrative (public trust, media influence)
}

export interface ResourceDelta {
  M?: number;
  I?: number;
  N?: number;
}

export function createResources(m: number, i: number, n: number): Resources {
  return { M: m, I: i, N: n };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampResources(r: Resources): Resources {
  return {
    M: clamp(r.M, 0, 100),
    I: clamp(r.I, 0, 100),
    N: clamp(r.N, 0, 100),
  };
}

export function clampDelta(d: ResourceDelta): ResourceDelta {
  return {
    M: d.M !== undefined ? clamp(d.M, -10, 10) : undefined,
    I: d.I !== undefined ? clamp(d.I, -10, 10) : undefined,
    N: d.N !== undefined ? clamp(d.N, -10, 10) : undefined,
  };
}

export function applyDelta(r: Resources, d: ResourceDelta): Resources {
  return clampResources({
    M: r.M + (d.M ?? 0),
    I: r.I + (d.I ?? 0),
    N: r.N + (d.N ?? 0),
  });
}

export function resourceSum(r: Resources): number {
  return r.M + r.I + r.N;
}

// ============================================================================
// CORE METRIC (G)
// ============================================================================

export interface CoreMetric {
  name: string;
  description: string;
  value: number;          // [0, 100]
  min?: number;           // default 0
  max?: number;           // default 100
}

// ============================================================================
// POLICY
// ============================================================================

export type Stance = 'hostile' | 'neutral' | 'cooperative';
export type Priority = 'self' | 'global' | 'balanced';

export interface Policy {
  goals: string[];                    // Player-written objectives
  priority: Priority;                 // Affects intent generation
  stances: Record<string, Stance>;    // Stance toward each other player
}

export function createDefaultPolicy(): Policy {
  return {
    goals: [],
    priority: 'balanced',
    stances: {},
  };
}

// ============================================================================
// ROLE
// ============================================================================

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  initialResources: Resources;
  
  // Flavor for LLM context
  resourceDescriptions?: string[];
  constraints?: string[];
  suggestedGoals?: string[];
  
  // UI
  icon?: string;
}

// ============================================================================
// INTENT
// ============================================================================

export type IntentTarget = string | 'SELF' | 'GLOBAL';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Intent {
  id: string;
  source: string;           // Player ID or 'ENV'
  target: IntentTarget;
  
  cost: number;             // AP cost
  
  deltas: {
    targetResources?: ResourceDelta;
    sourceResources?: ResourceDelta;
    coreMetric?: number;    // G change, clamped to [-10, +10]
  };
  
  title: string;
  description: string;
  risk: RiskLevel;
}

export interface ResolvedIntent extends Intent {
  wasContested: boolean;
  effectiveness: number;    // 0.8 uncontested, 0.4 contested
  
  realizedDeltas: {
    targetResources?: ResourceDelta;
    sourceResources?: ResourceDelta;
    coreMetric?: number;
  };
}

export interface IncomingIntent {
  intent: Intent;
  canCounter: boolean;
  counterCost: number;      // Usually 2 AP
}

export type CounterDecision = 'accept' | 'counter';

// ============================================================================
// PLAYER
// ============================================================================

export interface Player {
  id: string;
  name: string;
  
  roleId: string;
  role: RoleDefinition;
  
  isHuman: boolean;
  connected: boolean;
  
  // Resources
  resources: Resources;
  
  // Action points
  ap: number;
  apMax: number;
  
  // Policy
  policy: Policy;
  
  // Round state
  availableIntents: Intent[];
  selectedIntentIds: string[];
  incomingIntents: IncomingIntent[];
  counterDecisions: Record<string, CounterDecision>;
  
  // Submission tracking
  hasSubmittedPolicy: boolean;
  hasSubmittedIntents: boolean;
  hasSubmittedCounters: boolean;
}

export function createPlayer(
  id: string,
  name: string,
  role: RoleDefinition,
  isHuman: boolean
): Player {
  return {
    id,
    name,
    roleId: role.id,
    role,
    isHuman,
    connected: true,
    resources: { ...role.initialResources },
    ap: 3,
    apMax: 6,
    policy: createDefaultPolicy(),
    availableIntents: [],
    selectedIntentIds: [],
    incomingIntents: [],
    counterDecisions: {},
    hasSubmittedPolicy: false,
    hasSubmittedIntents: false,
    hasSubmittedCounters: false,
  };
}

// ============================================================================
// ENV (Environment Agent)
// ============================================================================

export interface ENVState {
  ap: number;
  aggressionLevel: number;  // [0, 1]
  selectedIntents: Intent[];
}

export interface ENVPolicy {
  baseAP: number;
  aggressionThresholds: {
    high: { above: number; aggression: number };
    medium: { above: number; aggression: number };
    low: { above: number; aggression: number };
  };
  hints: string[];  // LLM guidance
}

export function calculateENVAP(coreMetricValue: number): number {
  return Math.floor((100 - coreMetricValue) / 20) + 1;
}

export function calculateENVAggression(
  coreMetricValue: number,
  policy: ENVPolicy
): number {
  const { high, medium, low } = policy.aggressionThresholds;
  if (coreMetricValue > high.above) return high.aggression;
  if (coreMetricValue > medium.above) return medium.aggression;
  return low.aggression;
}

// ============================================================================
// AP CALCULATION
// ============================================================================

export function calculateAP(
  resources: Resources,
  coreMetricValue: number,
  playerCount: number
): number {
  const sum = resourceSum(resources);
  const healthFactor = coreMetricValue / 100;
  const apMax = 6 + 2 * (playerCount - 1);
  
  const ap = Math.floor((sum * healthFactor) / 30) + 2;
  return clamp(ap, 1, apMax);
}

export const COUNTER_COST = 2;  // Fixed AP cost to counter

// ============================================================================
// RESOLUTION
// ============================================================================

export const EFFECTIVENESS_UNCONTESTED = 0.8;
export const EFFECTIVENESS_CONTESTED = 0.4;

export function resolveIntent(
  intent: Intent,
  wasContested: boolean
): ResolvedIntent {
  const effectiveness = wasContested
    ? EFFECTIVENESS_CONTESTED
    : EFFECTIVENESS_UNCONTESTED;
  
  const scale = (d: ResourceDelta | undefined): ResourceDelta | undefined => {
    if (!d) return undefined;
    return {
      M: d.M !== undefined ? Math.round(d.M * effectiveness) : undefined,
      I: d.I !== undefined ? Math.round(d.I * effectiveness) : undefined,
      N: d.N !== undefined ? Math.round(d.N * effectiveness) : undefined,
    };
  };
  
  return {
    ...intent,
    wasContested,
    effectiveness,
    realizedDeltas: {
      targetResources: scale(intent.deltas.targetResources),
      sourceResources: scale(intent.deltas.sourceResources),
      coreMetric: intent.deltas.coreMetric !== undefined
        ? Math.round(intent.deltas.coreMetric * effectiveness)
        : undefined,
    },
  };
}

// ============================================================================
// SCENARIO
// ============================================================================

export interface GameEvent {
  id: string;
  round: number;
  headline: string;
  detail: string;
  effect?: {
    coreMetric?: number;
  };
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  
  coreMetric: CoreMetric;
  driftPerRound: number;    // G decreases by this each round
  
  maxRounds: number;
  phaseDurations?: Partial<Record<GamePhase, number>>;
  
  roles: RoleDefinition[];
  envPolicy: ENVPolicy;
  events: GameEvent[];
}

// ============================================================================
// GAME STATE
// ============================================================================

export interface GameState {
  gameId: string;
  scenarioId: string;
  
  phase: GamePhase;
  phaseEndsAt: number | null;  // Unix timestamp, null = no timer
  
  round: number;
  maxRounds: number;
  
  coreMetric: CoreMetric;
  
  players: Record<string, Player>;
  playerOrder: string[];
  
  env: ENVState;
  
  currentEvent: GameEvent | null;
  revealedIntents: ResolvedIntent[];
  
  roundHistory: RoundHistory[];
}

// ============================================================================
// ROUND HISTORY & DEBRIEF
// ============================================================================

export interface RoundHistory {
  round: number;
  
  startState: {
    coreMetric: number;
    players: Record<string, { resources: Resources; ap: number }>;
  };
  
  endState: {
    coreMetric: number;
    players: Record<string, { resources: Resources }>;
  };
  
  allIntents: ResolvedIntent[];
  event: GameEvent | null;
  debrief: RoundDebrief;
}

export interface RoundDebrief {
  round: number;
  
  coreMetricChange: {
    before: number;
    after: number;
    delta: number;
    breakdown: DeltaContribution[];
  };
  
  playerDebriefs: Record<string, PlayerDebrief>;
  envActions: ResolvedIntent[];
  
  narrative: string;
  
  nextRound: {
    round: number;
    scheduledEvents: string[];
    envAPPreview: number;
  } | null;
}

export interface PlayerDebrief {
  playerId: string;
  
  resources: {
    before: Resources;
    after: Resources;
    delta: ResourceDelta;
  };
  
  apUsed: number;
  apNextRound: number;
  
  myIntents: ResolvedIntent[];
  incomingIntents: ResolvedIntent[];
}

export interface DeltaContribution {
  source: string;
  intentId?: string;
  contribution: number;
  description: string;
}

// ============================================================================
// MESSAGES (Client <-> Server)
// ============================================================================

// Server -> Client
export interface ServerMessages {
  // Phase changes
  phase_changed: { phase: GamePhase; endsAt: number | null; message?: string };
  
  // Lobby
  players_init: { players: PlayerPublicView[]; scenario?: Scenario };
  player_joined: { player: PlayerPublicView };
  player_left: { playerId: string };
  
  // Policy phase
  policy_updated: { playerId: string; policy: Policy };
  
  // Intent generation
  intents_available: { intents: Intent[] };
  
  // Proposal phase
  player_ready: { playerId: string; phase: GamePhase };
  
  // Reveal phase
  intents_revealed: { intents: Intent[] };  // All proposed intents
  
  // Counter phase
  incoming_intents: { intents: IncomingIntent[] };
  
  // Resolution
  resolution_complete: {
    coreMetric: { before: number; after: number };
    playerChanges: Record<string, { resources: Resources; ap: number }>;
  };
  
  // Debrief
  round_debrief: RoundDebrief;
  
  // End
  game_ended: { reason: 'completed' | 'collapsed' | 'abandoned'; finalState: GameState };
  
  // Errors
  error: { message: string; code?: string };
}

// Client -> Server
export interface ClientMessages {
  // Lobby
  set_role: { roleId: string; name?: string };
  start_game: {};
  
  // Policy
  update_policy: { policy: Partial<Policy> };
  
  // Proposal
  select_intents: { intentIds: string[] };
  
  // Counter
  submit_counters: { decisions: Record<string, CounterDecision> };
  
  // Universal
  ready: {};  // Player ready to advance phase
  
  // Debug/Admin
  advance_phase: {};  // Force advance (admin only)
}

// ============================================================================
// PLAYER VIEWS (Information Hiding)
// ============================================================================

export type ResourceRange = 'low' | 'medium' | 'high';

export interface PlayerPublicView {
  id: string;
  name: string;
  roleId: string;
  roleName: string;
  isHuman: boolean;
  connected: boolean;
  
  // Approximate resources (not exact)
  resourceRanges: {
    M: ResourceRange;
    I: ResourceRange;
    N: ResourceRange;
  };
  
  // Their stated policy (visible, but may be lying)
  policy: Policy;
  
  // Submission status
  hasSubmitted: boolean;
}

export function toResourceRange(value: number): ResourceRange {
  if (value < 35) return 'low';
  if (value < 65) return 'medium';
  return 'high';
}

export function toPlayerPublicView(
  player: Player,
  currentPhase: GamePhase
): PlayerPublicView {
  const hasSubmitted = 
    currentPhase === GamePhase.POLICY ? player.hasSubmittedPolicy :
    currentPhase === GamePhase.PROPOSAL ? player.hasSubmittedIntents :
    currentPhase === GamePhase.COUNTER ? player.hasSubmittedCounters :
    false;
  
  return {
    id: player.id,
    name: player.name,
    roleId: player.roleId,
    roleName: player.role.name,
    isHuman: player.isHuman,
    connected: player.connected,
    resourceRanges: {
      M: toResourceRange(player.resources.M),
      I: toResourceRange(player.resources.I),
      N: toResourceRange(player.resources.N),
    },
    policy: player.policy,
    hasSubmitted,
  };
}

// ============================================================================
// GAME LOG (Legacy Compatibility)
// ============================================================================

export interface GameLogEntry {
  round: number;
  roundSummary: string;
  event: GameEvent | null;
  resolvedIntents: ResolvedIntent[];
  coreMetricBefore: number;
  coreMetricAfter: number;
  coreMetricDelta: number;
}
