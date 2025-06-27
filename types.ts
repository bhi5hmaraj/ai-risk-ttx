
export enum RoleName {
  ELECTION_COMMISSIONER = "Election Commissioner",
  TECH_CEO = "Tech CEO",
  JOURNALIST = "Journalist",
  FEDERAL_REGULATOR = "Federal Regulator",
  CAMPAIGN_MANAGER = "Campaign Manager",
  CYBERSECURITY_EXPERT = "Cybersecurity Expert",
}

export interface RoleData {
  name: RoleName;
  publicObjective: string;
  hiddenObjective: string;
  resources: string[];
  constraints: string[];
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
}

export interface Player {
  id: string; // Use string for player IDs
  role: RoleData;
  isHuman: boolean;
  hiddenScore: number;
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
  roleName: RoleName;
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
  roleName: RoleName;
  update: number;
  justification: string;
}

export interface GameLogEntry {
  round: number;
  narrative: string;
  event: GameEvent | null; // The event that *led* to this narrative
  playerActions: PlayerRoundActions[];
  publicScoreChange: number;
  publicScoreAfter: number;
  hiddenScoreChanges: Record<RoleName, HiddenScoreUpdate>;
  geminiCalls: number;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  publicScore: number; // Democratic Legitimacy
  eventLog: GameLogEntry[];
  currentEvent: GameEvent | null;
}

export interface AIConsequenceResponse {
  narrative: string;
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