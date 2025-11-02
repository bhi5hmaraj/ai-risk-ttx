/**
 * Core type definitions - Backend-safe (no React dependencies)
 * Can be safely imported from API routes and serverless functions
 */

export enum RoleName {
  ELECTION_COMMISSIONER = "Election Commissioner",
  TECH_CEO = "Tech CEO",
  JOURNALIST = "Journalist",
  FEDERAL_REGULATOR = "Federal Regulator",
  CAMPAIGN_MANAGER = "Campaign Manager",
  CYBERSECURITY_EXPERT = "Cybersecurity Expert",
}

/**
 * Backend-safe role data (without icon component)
 */
export interface RoleDataCore {
  name: string;
  publicObjective: string;
  hiddenObjective: string;
  resources: string[];
  constraints: string[];
}

/**
 * Frontend RoleData with icon component
 * Extends core with React-specific properties
 */
export interface RoleData extends RoleDataCore {
  icon: (props: any) => any; // Use 'any' to avoid React import in core types
}

export interface CoreMetric {
  name: string;
  description: string;
  value: number;
}

export interface StakeholderData {
    name: string;
    icon: string; // emoji string
    publicObjective: string;
    hiddenObjective: string;
    resources?: string[];
    constraints?: string[];
}

export interface GameSetup {
    scenarioTitle: string;
    scenarioDescription: string;
    coreMetric: CoreMetric;
    stakeholders: StakeholderData[];
}

export interface ActionOption {
    title: string;
    description: string;
    cost: number;
}

export interface Player {
  id: string; // Use string for player IDs
  role: RoleDataCore; // Use core type without React dependencies
  isHuman: boolean;
  hiddenScore: number;
  actionPoints: number;
  actions: ActionOption[];
  hasSubmittedActions: boolean;
}

export enum GamePhase {
  LOBBY,
  STARTING,
  ACTION,
  CONSEQUENCE,
  END,
}

export interface GameEvent {
  id?: string; // optional stable id for causal linking
  headline: string;
  detail: string;
}

export type CausalRefType = 'event' | 'action' | 'exogenous';

export interface CausalReference {
  type: CausalRefType; // what is being cited
  ref: string;         // event id or action descriptor
  rationale: string;   // short explanation of the causal link
}

export interface PlayerRoundActions {
  roleName: string;
  actions: ActionOption[]; // chosen actions
  availableOptions: ActionOption[]; // all possible actions for that round
  isHuman: boolean;
}

export interface HiddenScoreUpdate {
  update: number;
  justification: string;
}

// New type for the array structure from the API
export interface AIHiddenScoreUpdate {
  roleName: string;
  update: number;
  justification: string;
}

export interface OutcomeTimelineItem {
  title: string;
  description: string;
  impact: string;
  causes?: CausalReference[]; // optional interpretability citations
}

export interface GameLogEntry {
  round: number;
  roundSummary: string;
  outcomeTimeline: OutcomeTimelineItem[];
  counterfactualNote: string;
  event: GameEvent | null; // The event that led to this summary
  playerActions: PlayerRoundActions[];
  publicScoreChange: number;
  publicScoreAfter: number;
  hiddenScoreChanges: Record<string, HiddenScoreUpdate>;
  geminiCalls: number;
  citations?: CausalReference[]; // optional aggregated citations for the round
}

export interface GameState {
  phase: GamePhase;
  round: number;
  coreMetric: CoreMetric;
  eventLog: GameLogEntry[];
  currentEvent: GameEvent | null;
}

export interface AIConsequenceResponse {
  roundSummary: string;
  outcomeTimeline: OutcomeTimelineItem[];
  counterfactualNote: string;
  publicScoreUpdate: number;
  hiddenScoreUpdates: AIHiddenScoreUpdate[];
  nextEvent: GameEvent;
}

export interface AIActionOptionsResponse {
    options: ActionOption[];
}

export interface AICounterfactualResponse {
    publicScoreUpdate: number;
}

export interface AIPlayerActionsResponse {
    actions: ActionOption[];
}

export interface AITurnResponse {
    options: ActionOption[];      // 5 generated options
    chosenActions: ActionOption[]; // Actions chosen from options
    reasoning: string;             // Why the AI chose these actions
}
