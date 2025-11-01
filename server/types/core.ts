/** Backend-safe core types (no React dependencies) */

export enum RoleName {
  ELECTION_COMMISSIONER = "Election Commissioner",
  TECH_CEO = "Tech CEO",
  JOURNALIST = "Journalist",
  FEDERAL_REGULATOR = "Federal Regulator",
  CAMPAIGN_MANAGER = "Campaign Manager",
  CYBERSECURITY_EXPERT = "Cybersecurity Expert",
}

export interface RoleDataCore {
  name: string;
  publicObjective: string;
  hiddenObjective: string;
  resources: string[];
  constraints: string[];
}

export interface CoreMetric {
  name: string;
  description: string;
  value: number;
}

export interface StakeholderData {
  name: string;
  icon: string;
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
  id: string;
  role: RoleDataCore;
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

export interface GameEvent { headline: string; detail: string; }

export interface PlayerRoundActions {
  roleName: string;
  actions: ActionOption[];
  availableOptions: ActionOption[];
  isHuman: boolean;
}

export interface HiddenScoreUpdate { update: number; justification: string; }
export interface AIHiddenScoreUpdate { roleName: string; update: number; justification: string; }

export interface OutcomeTimelineItem { title: string; description: string; impact: string; }

export interface GameLogEntry {
  round: number;
  roundSummary: string;
  outcomeTimeline: OutcomeTimelineItem[];
  counterfactualNote: string;
  event: GameEvent | null;
  playerActions: PlayerRoundActions[];
  publicScoreChange: number;
  publicScoreAfter: number;
  hiddenScoreChanges: Record<string, HiddenScoreUpdate>;
  geminiCalls: number;
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

export interface AIActionOptionsResponse { options: ActionOption[]; }
export interface AICounterfactualResponse { publicScoreUpdate: number; }
export interface AIPlayerActionsResponse { actions: ActionOption[]; }

export interface AITurnResponse {
  options: ActionOption[];
  chosenActions: ActionOption[];
  reasoning: string;
}

// Debrief types
export interface AIDebriefEvent { round: number; title: string; description: string; impact: string }
export interface AIDebriefAction { round: number; title: string; impact: string; rationale?: string }
export interface AIDebriefResponse {
  summary: string;
  keyEvents: AIDebriefEvent[];
  userActions: AIDebriefAction[];
}
