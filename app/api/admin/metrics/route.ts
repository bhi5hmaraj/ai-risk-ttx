import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAdminMetrics } from '@/server/data/metricsRepo';
import type { MetricsOptions } from '@/types/admin';

export const runtime = 'nodejs';

// Response construction helper

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return json(401, { success: false, error: 'Unauthorized' });
  try {
    const sp = req.nextUrl.searchParams;
    const daysParam = sp.get('days');
    const rangeParam = sp.get('range'); // today|7d|30d
    const fromParam = sp.get('from');
    const toParam = sp.get('to');
    let opts: MetricsOptions | undefined;
    if (fromParam && toParam) opts = { from: fromParam, to: toParam, includeWow: true };
    else if (rangeParam === 'today' || rangeParam === '7d' || rangeParam === '30d') opts = { preset: rangeParam, includeWow: true } as MetricsOptions;
    else if (daysParam) {
      const n = Number(daysParam);
      if (n === 1) opts = { preset: 'today', includeWow: true };
      else if (n <= 7) opts = { preset: '7d', includeWow: true };
      else opts = { preset: '30d', includeWow: true };
    }
    const data = await getAdminMetrics(opts);
    return json(200, { success: true, data });
  } catch (err: any) {
    // Graceful fallback if DB is unavailable
    const fallback = {
      timestamp: Date.now(),
      store: (process.env.SESSION_STORE_TYPE || 'memory') as 'memory' | 'redis' | 'unknown',
      totals: { games: null, byType: {} as Record<string, number> },
      averages: { rounds: null, completionRate: null, maxRounds: null, ratioAvgRoundsToAvgMaxRounds: null },
      timeline: [] as Array<{ date: string; count: number; completed: number }>,
      scenarios: { public: null, pending: null, featured: null },
      feedback: { total: null, avgRating: null },
      funnel: { started: 0, completed: 0, rate: null as number | null },
      scenariosByTitle: [] as Array<{ title: string; started: number; completed: number; rate: number | null }>,
      roundFunnel: [] as Array<{ level: number; count: number; conversionFromPrev: number | null }>,
      avgRoundDurations: [] as Array<{ round: number; avgSeconds: number | null }>,
      wow: { startedCount: null, completionRate: null, rounds: null, feedbackAvg: null },
    };
    return json(200, { success: true, data: fallback });
  }
}
