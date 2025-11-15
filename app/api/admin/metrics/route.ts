import { NextRequest } from 'next/server';
import { prisma } from '@/server/lib/prisma';

export const runtime = 'nodejs';

type BasicMetrics = {
  timestamp: number;
  store: 'memory' | 'redis' | 'unknown';
  totals: { games: number | null; byType: Record<string, number> };
  averages: { rounds: number | null; completionRate: number | null };
  timeline: Array<{ date: string; count: number; completed: number }>;
  scenarios: { public: number | null; pending: number | null; featured: number | null };
  feedback: { total: number | null; avgRating: number | null };
};

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

export async function GET(_req: NextRequest) {
  const storeEnv = (process.env.SESSION_STORE_TYPE || '').toLowerCase();
  const store: BasicMetrics['store'] = storeEnv === 'redis' ? 'redis' : storeEnv === 'memory' || !storeEnv ? 'memory' : 'unknown';

  try {
    const [feedbackTotal, feedbackAvg, scenariosApproved, scenariosPending, totalSessions, completedSessions, sessionsByMode, avgRoundsAgg] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.aggregate({ _avg: { avgRating: true } }),
      prisma.publicScenario.count({ where: { status: 'approved' } }),
      prisma.publicScenario.count({ where: { status: 'pending' } }),
      prisma.sessionMetrics.count(),
      prisma.sessionMetrics.count({ where: { completed: true } }),
      prisma.sessionMetrics.groupBy({ by: ['mode'], _count: { _all: true } }).catch(() => [] as any[]),
      prisma.sessionMetrics.aggregate({ where: { completed: true }, _avg: { rounds: true } }),
    ]);

    const byType: Record<string, number> = {};
    for (const row of sessionsByMode as Array<{ mode: string; _count: { _all: number } }>) {
      const key = row.mode || 'unknown';
      byType[key] = (byType[key] || 0) + row._count._all;
    }

    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) / 100 : null;

    // Build simple daily timeline for the last N days
    const days = Math.max(1, Math.min(60, Number(process.env.ADMIN_METRICS_DAYS || '14')));
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const [createdRows, completedRows] = await Promise.all([
      prisma.sessionMetrics.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
      prisma.sessionMetrics.findMany({ where: { completed: true, completedAt: { gte: start } }, select: { completedAt: true } }),
    ]);

    const keyFor = (d: Date) => {
      const dd = new Date(d); dd.setHours(0,0,0,0);
      return dd.toISOString().slice(0,10);
    };
    const createdMap = new Map<string, number>();
    for (const r of createdRows) {
      const k = keyFor(r.createdAt as unknown as Date);
      createdMap.set(k, (createdMap.get(k) || 0) + 1);
    }
    const completedMap = new Map<string, number>();
    for (const r of completedRows) {
      const k = keyFor(r.completedAt as unknown as Date);
      completedMap.set(k, (completedMap.get(k) || 0) + 1);
    }
    const timeline: BasicMetrics['timeline'] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = keyFor(d);
      timeline.push({ date: k, count: createdMap.get(k) || 0, completed: completedMap.get(k) || 0 });
    }

    const data: BasicMetrics = {
      timestamp: Date.now(),
      store,
      totals: { games: totalSessions, byType },
      averages: { rounds: avgRoundsAgg._avg.rounds ?? null, completionRate },
      timeline,
      scenarios: { public: scenariosApproved, pending: scenariosPending, featured: null },
      feedback: { total: feedbackTotal, avgRating: feedbackAvg._avg.avgRating ?? null },
    };

    return json(200, { success: true, data });
  } catch (err: any) {
    // Fallback to placeholders if DB is unavailable
    const data: BasicMetrics = {
      timestamp: Date.now(),
      store,
      totals: { games: null, byType: {} },
      averages: { rounds: null, completionRate: null },
      timeline: [],
      scenarios: { public: null, pending: null, featured: null },
      feedback: { total: null, avgRating: null },
    };
    return json(200, { success: true, data });
  }
}
