// Shared admin types for metrics and admin APIs.
// Keep this file free of server-only imports so it can be used on client.

export interface AdminMetrics {
  timestamp: number;
  store: 'memory' | 'redis' | 'unknown';
  totals: { games: number | null; byType: Record<string, number> };
  averages: {
    rounds: number | null;
    completionRate: number | null;
    maxRounds: number | null;
    ratioAvgRoundsToAvgMaxRounds: number | null;
  };
  wow?: {
    startedCount: number | null; // WoW change for started sessions (last 7d vs previous 7d)
    completionRate: number | null; // WoW change for avg completion fraction
    rounds: number | null; // WoW change for avg rounds
    feedbackAvg: number | null; // WoW change for avg feedback score
  };
  timeline: Array<{ date: string; count: number; completed: number }>;
  scenarios: { public: number | null; pending: number | null; featured: number | null };
  feedback: { total: number | null; avgRating: number | null };
  funnel: { started: number; completed: number; rate: number | null };
  scenariosByTitle: Array<{ title: string; started: number; completed: number; rate: number | null }>;
  roundFunnel: Array<{ level: number; count: number; conversionFromPrev: number | null }>;
  avgRoundDurations: Array<{ round: number; avgSeconds: number | null }>;
}

export type MetricsPreset = 'today' | '7d' | '30d';

export interface MetricsOptions {
  preset?: MetricsPreset;
  from?: string; // ISO date/time
  to?: string;   // ISO date/time
  includeWow?: boolean; // compare to previous equal-length window
}
