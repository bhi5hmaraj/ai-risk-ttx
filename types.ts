export enum RoleName {
  ELECTION_COMMISSIONER = "Election Commissioner",
  TECH_CEO = "Tech CEO",
  JOURNALIST = "Journalist",
  FEDERAL_REGULATOR = "Federal Regulator",
  CAMPAIGN_MANAGER = "Campaign Manager",
  CYBERSECURITY_EXPERT = "Cybersecurity Expert",
}

export interface RoleData {
  name: string;
  publicObjective: string;
  hiddenObjective: string;
  resources: string[];
  constraints: string[];
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
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

export interface Player {
  id: string; // Use string for player IDs
  role: RoleData;
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
  headline: string;
  detail: string;
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
}

export interface OutcomeTimelineItem {
  title: string;
  description: string;
  impact: string;
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

export interface ActionOption {
    title: string;
    description: string;
    cost: number;
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

// Re-export feedback types
export * from './types/feedback';

// Re-export public scenario types
export * from './types/publicScenario';
