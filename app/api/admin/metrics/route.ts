import { NextRequest } from 'next/server';
import { getAdminMetrics } from '@/server/data/metricsRepo';

export const runtime = 'nodejs';

// Response construction helper

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

export async function GET(req: NextRequest) {
  try {
    const daysParam = req.nextUrl.searchParams.get('days');
    const days = daysParam ? Number(daysParam) : undefined;
    const data = await getAdminMetrics(days);
    return json(200, { success: true, data });
  } catch (err: any) {
    // Graceful fallback if DB is unavailable
    const fallback = {
      timestamp: Date.now(),
      store: (process.env.SESSION_STORE_TYPE || 'memory') as 'memory' | 'redis' | 'unknown',
      totals: { games: null, byType: {} as Record<string, number> },
      averages: { rounds: null, completionRate: null },
      timeline: [] as Array<{ date: string; count: number; completed: number }>,
      scenarios: { public: null, pending: null, featured: null },
      feedback: { total: null, avgRating: null },
      funnel: { started: 0, completed: 0, rate: null as number | null },
      scenariosByTitle: [] as Array<{ title: string; started: number; completed: number; rate: number | null }>,
      roundFunnel: [] as Array<{ level: number; count: number; conversionFromPrev: number | null }>,
      avgRoundDurations: [] as Array<{ round: number; avgSeconds: number | null }>,
    };
    return json(200, { success: true, data: fallback });
  }
}
