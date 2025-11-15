import { prisma } from '@/server/lib/prisma';

export interface AdminMetrics {
  timestamp: number;
  store: 'memory' | 'redis' | 'unknown';
  totals: { games: number | null; byType: Record<string, number> };
  averages: { rounds: number | null; completionRate: number | null };
  timeline: Array<{ date: string; count: number; completed: number }>;
  scenarios: { public: number | null; pending: number | null; featured: number | null };
  feedback: { total: number | null; avgRating: number | null };
  funnel: { started: number; completed: number; rate: number | null };
  scenariosByTitle: Array<{ title: string; started: number; completed: number; rate: number | null }>;
  roundFunnel: Array<{ level: number; count: number; conversionFromPrev: number | null }>;
  avgRoundDurations: Array<{ round: number; avgSeconds: number | null }>;
}

export async function getAdminMetrics(daysInput?: number): Promise<AdminMetrics> {
  const storeEnv = (process.env.SESSION_STORE_TYPE || '').toLowerCase();
  const store: AdminMetrics['store'] = storeEnv === 'redis' ? 'redis' : storeEnv === 'memory' || !storeEnv ? 'memory' : 'unknown';

  const days = Math.max(1, Math.min(60, Number(daysInput ?? (process.env.ADMIN_METRICS_DAYS || '14'))));
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const [feedbackTotal, feedbackAvg, scenariosApproved, scenariosPending, totalSessions, completedSessions, startedSessions, sessionsByMode, avgRoundsAgg] = await Promise.all([
    prisma.feedback.count(),
    prisma.feedback.aggregate({ _avg: { avgRating: true } }),
    prisma.publicScenario.count({ where: { status: 'approved' } }),
    prisma.publicScenario.count({ where: { status: 'pending' } }),
    prisma.sessionMetrics.count(),
    prisma.sessionMetrics.count({ where: { completed: true } }),
    prisma.sessionMetrics.count({ where: { startedAt: { not: null } } }),
    prisma.sessionMetrics.groupBy({ by: ['mode'], _count: { _all: true } }).catch(() => [] as any[]),
    prisma.sessionMetrics.aggregate({ where: { completed: true }, _avg: { rounds: true } }),
  ]);

  const byType: Record<string, number> = {};
  for (const row of sessionsByMode as Array<{ mode: string; _count: { _all: number } }>) {
    const key = row.mode || 'unknown';
    byType[key] = (byType[key] || 0) + row._count._all;
  }

  // Average completion fraction across sessions: rounds / maxRounds (clamped to 1).
  // If maxRounds is missing, fall back to 1 for completed sessions and otherwise skip.
  const sessionsForCompletion = await prisma.sessionMetrics.findMany({
    select: { rounds: true, maxRounds: true, completed: true },
  });
  let compSum = 0;
  let compCount = 0;
  for (const s of sessionsForCompletion) {
    const mr = s.maxRounds ?? null;
    if (mr && mr > 0) {
      const frac = Math.min(1, Math.max(0, s.rounds / mr));
      compSum += frac;
      compCount += 1;
    } else if (s.completed) {
      compSum += 1;
      compCount += 1;
    }
  }
  const completionRate = compCount > 0 ? Math.round((compSum / compCount) * 100) / 100 : null;

  // Timeline
  const [createdRows, completedRows, startedRows] = await Promise.all([
    prisma.sessionMetrics.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.sessionMetrics.findMany({ where: { completed: true, completedAt: { gte: start } }, select: { completedAt: true } }),
    prisma.sessionMetrics.findMany({ where: { startedAt: { gte: start } }, select: { startedAt: true } }),
  ]);

  const keyFor = (d: Date) => {
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    return dd.toISOString().slice(0, 10);
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
  const startedMap = new Map<string, number>();
  for (const r of startedRows) {
    const k = keyFor((r as any).startedAt as Date);
    startedMap.set(k, (startedMap.get(k) || 0) + 1);
  }
  const timeline: AdminMetrics['timeline'] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = keyFor(d);
    timeline.push({ date: k, count: startedMap.get(k) || 0, completed: completedMap.get(k) || 0 });
  }

  // Scenarios by title (rate = average completion fraction per scenario)
  const sessionsForScenarios = await prisma.sessionMetrics.findMany({
    select: { scenarioTitle: true, startedAt: true, completed: true, rounds: true, maxRounds: true },
  });
  const titleKey = (t: string | null) => (t && String(t).trim()) || 'Unknown';
  const startedMapBT = new Map<string, number>();
  const completedMapBT = new Map<string, number>();
  const compSumMap = new Map<string, number>();
  const compCountMap = new Map<string, number>();
  for (const s of sessionsForScenarios) {
    const k = titleKey(s.scenarioTitle as any);
    if (s.startedAt) startedMapBT.set(k, (startedMapBT.get(k) || 0) + 1);
    if (s.completed) completedMapBT.set(k, (completedMapBT.get(k) || 0) + 1);
    const mr = s.maxRounds ?? null;
    let frac: number | null = null;
    if (mr && mr > 0) frac = Math.min(1, Math.max(0, s.rounds / mr));
    else if (s.completed) frac = 1;
    if (frac != null) {
      compSumMap.set(k, (compSumMap.get(k) || 0) + frac);
      compCountMap.set(k, (compCountMap.get(k) || 0) + 1);
    }
  }
  const allKeys = Array.from(new Set([...startedMapBT.keys(), ...completedMapBT.keys(), ...compSumMap.keys()]));
  const scenariosByTitle = allKeys
    .map((k) => {
      const s = startedMapBT.get(k) || 0;
      const c = completedMapBT.get(k) || 0;
      const sum = compSumMap.get(k) || 0;
      const cnt = compCountMap.get(k) || 0;
      const rate = cnt > 0 ? Math.round((sum / cnt) * 100) / 100 : null;
      return { title: k, started: s, completed: c, rate };
    })
    .sort((a, b) => b.started - a.started)
    .slice(0, 10);

  // Round funnel (levels 1..5)
  const levels = [1, 2, 3, 4, 5];
  const levelCounts = await Promise.all(levels.map((n) => prisma.sessionMetrics.count({ where: { rounds: { gte: n } } })));
  const roundFunnel = levels.map((lvl, idx) => {
    const count = levelCounts[idx] || 0;
    const prev = idx === 0 ? null : (levelCounts[idx - 1] || 0);
    const conversionFromPrev = prev && prev > 0 ? Math.round((count / prev) * 100) / 100 : null;
    return { level: lvl, count, conversionFromPrev };
  });

  // Average round durations over window
  const durRows = await prisma.sessionMetrics.findMany({ where: { startedAt: { gte: start } }, select: { roundDurations: true } });
  const sums: number[] = [];
  const counts: number[] = [];
  for (const r of durRows) {
    const arr = (r as any).roundDurations as number[] | null;
    if (!Array.isArray(arr)) continue;
    arr.forEach((sec, i) => {
      if (typeof sec !== 'number') return;
      sums[i] = (sums[i] || 0) + sec;
      counts[i] = (counts[i] || 0) + 1;
    });
  }
  const avgRoundDurations = sums.map((sum, i) => ({ round: i + 1, avgSeconds: counts[i] ? Math.round((sum / counts[i]) * 10) / 10 : null }));

  return {
    timestamp: Date.now(),
    store,
    totals: { games: totalSessions, byType },
    averages: { rounds: (avgRoundsAgg as any)._avg.rounds ?? null, completionRate },
    timeline,
    scenarios: { public: scenariosApproved, pending: scenariosPending, featured: null },
    feedback: { total: feedbackTotal, avgRating: (feedbackAvg as any)._avg.avgRating ?? null },
    funnel: { started: startedSessions, completed: completedSessions, rate: startedSessions > 0 ? Math.round((completedSessions / startedSessions) * 100) / 100 : null },
    scenariosByTitle,
    roundFunnel,
    avgRoundDurations,
  };
}
