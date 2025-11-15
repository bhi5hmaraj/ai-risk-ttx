import { prisma } from '@/server/lib/prisma';
import type { AdminMetrics, MetricsOptions } from '@/types/admin';

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

function resolveRange(opts?: MetricsOptions): { from: Date; to: Date } {
  const now = new Date();
  if (opts?.from && opts?.to) {
    return { from: startOfDay(new Date(opts.from)), to: endOfDay(new Date(opts.to)) };
  }
  const p = opts?.preset || '7d';
  if (p === 'today') return { from: startOfDay(now), to: endOfDay(now) };
  const days = p === '30d' ? 30 : 7;
  const to = endOfDay(now);
  const from = startOfDay(new Date(to));
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

export async function getAdminMetrics(opts?: MetricsOptions): Promise<AdminMetrics> {
  const storeEnv = (process.env.SESSION_STORE_TYPE || '').toLowerCase();
  const store: AdminMetrics['store'] = storeEnv === 'redis' ? 'redis' : storeEnv === 'memory' || !storeEnv ? 'memory' : 'unknown';

  const { from, to } = resolveRange(opts);
  // Range-resolved metrics for timeline and averages

  const [feedbackTotal, feedbackAvg, scenariosApproved, scenariosPending, totalSessions, completedSessions, startedSessions, sessionsByMode, avgAgg] = await Promise.all([
    prisma.feedback.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.feedback.aggregate({ where: { createdAt: { gte: from, lte: to } }, _avg: { avgRating: true } }),
    prisma.publicScenario.count({ where: { status: 'approved' } }),
    prisma.publicScenario.count({ where: { status: 'pending' } }),
    prisma.sessionMetrics.count({ where: { startedAt: { gte: from, lte: to } } }),
    prisma.sessionMetrics.count({ where: { completed: true, completedAt: { gte: from, lte: to } } }),
    prisma.sessionMetrics.count({ where: { startedAt: { gte: from, lte: to } } }),
    prisma.sessionMetrics.groupBy({ where: { startedAt: { gte: from, lte: to } }, by: ['mode'], _count: { _all: true } }).catch(() => [] as any[]),
    // Average rounds and planned rounds across started sessions in range
    prisma.sessionMetrics.aggregate({ where: { startedAt: { gte: from, lte: to } }, _avg: { rounds: true, maxRounds: true } }),
  ]);

  const byType: Record<string, number> = {};
  for (const row of sessionsByMode as Array<{ mode: string; _count: { _all: number } }>) {
    const key = row.mode || 'unknown';
    byType[key] = (byType[key] || 0) + row._count._all;
  }

  // Average completion fraction across sessions: rounds / maxRounds (clamped to 1).
  // If maxRounds is missing, fall back to 1 for completed sessions and otherwise skip.
  const sessionsForCompletion = await prisma.sessionMetrics.findMany({
    where: { startedAt: { gte: from, lte: to } },
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
    prisma.sessionMetrics.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
    prisma.sessionMetrics.findMany({ where: { completed: true, completedAt: { gte: from, lte: to } }, select: { completedAt: true } }),
    prisma.sessionMetrics.findMany({ where: { startedAt: { gte: from, lte: to } }, select: { startedAt: true } }),
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
  const totalDays = Math.max(1, Math.ceil((endOfDay(to).getTime() - startOfDay(from).getTime()) / (24*60*60*1000)));
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(from); d.setDate(from.getDate() + i);
    const k = keyFor(d);
    timeline.push({ date: k, count: startedMap.get(k) || 0, completed: completedMap.get(k) || 0 });
  }

  // Scenarios by title (rate = average completion fraction per scenario)
  const sessionsForScenarios = await prisma.sessionMetrics.findMany({
    where: { startedAt: { gte: from, lte: to } },
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
  const durRows = await prisma.sessionMetrics.findMany({ where: { startedAt: { gte: from, lte: to } }, select: { roundDurations: true } });
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

  const avgRoundsAll = (avgAgg as any)?._avg?.rounds ?? null;
  const avgMaxRoundsAll = (avgAgg as any)?._avg?.maxRounds ?? null;
  const ratioAvgRoundsToAvgMaxRounds = (typeof avgRoundsAll === 'number' && typeof avgMaxRoundsAll === 'number' && avgMaxRoundsAll > 0)
    ? Math.round(((avgRoundsAll / avgMaxRoundsAll) * 100)) / 100
    : null;

  // WoW deltas (compare to previous equal-length window)
  const prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevTo.getDate() - (totalDays - 1));
  const [startedCur, startedPrev] = await Promise.all([
    prisma.sessionMetrics.count({ where: { startedAt: { gte: from, lte: to } } }),
    prisma.sessionMetrics.count({ where: { startedAt: { gte: prevFrom, lte: prevTo } } }),
  ]);
  function delta(cur: number | null, prev: number | null): number | null { if (prev == null || prev === 0 || cur == null) return null; return (cur - prev) / prev; }
  // Completion WoW
  const [compCurRows, compPrevRows] = await Promise.all([
    prisma.sessionMetrics.findMany({ where: { startedAt: { gte: from, lte: to } }, select: { rounds: true, maxRounds: true, completed: true } }),
    prisma.sessionMetrics.findMany({ where: { startedAt: { gte: prevFrom, lte: prevTo } }, select: { rounds: true, maxRounds: true, completed: true } }),
  ]);
  function avgCompletion(rows: Array<{ rounds: number; maxRounds: number | null; completed: boolean }>): number | null {
    let sum = 0, cnt = 0;
    for (const s of rows) {
      const mr = s.maxRounds ?? null;
      if (mr && mr > 0) { sum += Math.min(1, Math.max(0, s.rounds / mr)); cnt++; }
      else if (s.completed) { sum += 1; cnt++; }
    }
    return cnt > 0 ? sum / cnt : null;
  }
  const compCur = avgCompletion(compCurRows);
  const compPrev = avgCompletion(compPrevRows);
  const compWow = (compCur != null && compPrev != null && compPrev !== 0) ? (compCur - compPrev) / compPrev : null;

  // Avg rounds WoW
  const [avgRoundsCurAgg, avgRoundsPrevAgg] = await Promise.all([
    prisma.sessionMetrics.aggregate({ where: { startedAt: { gte: from, lte: to } }, _avg: { rounds: true } }),
    prisma.sessionMetrics.aggregate({ where: { startedAt: { gte: prevFrom, lte: prevTo } }, _avg: { rounds: true } }),
  ]);
  const roundsCur = (avgRoundsCurAgg as any)?._avg?.rounds ?? null;
  const roundsPrev = (avgRoundsPrevAgg as any)?._avg?.rounds ?? null;
  const roundsWow = (roundsCur != null && roundsPrev != null && roundsPrev !== 0) ? (roundsCur - roundsPrev) / roundsPrev : null;

  // Avg feedback WoW
  const [fbCur, fbPrev] = await Promise.all([
    prisma.feedback.aggregate({ where: { createdAt: { gte: from, lte: to } }, _avg: { avgRating: true } }),
    prisma.feedback.aggregate({ where: { createdAt: { gte: prevFrom, lte: prevTo } }, _avg: { avgRating: true } }),
  ]);
  const fbCurAvg = (fbCur as any)?._avg?.avgRating ?? null;
  const fbPrevAvg = (fbPrev as any)?._avg?.avgRating ?? null;
  const fbWow = (fbCurAvg != null && fbPrevAvg != null && fbPrevAvg !== 0) ? (fbCurAvg - fbPrevAvg) / fbPrevAvg : null;

  return {
    timestamp: Date.now(),
    store,
    totals: { games: totalSessions, byType },
    averages: { rounds: avgRoundsAll, completionRate, maxRounds: avgMaxRoundsAll, ratioAvgRoundsToAvgMaxRounds },
    timeline,
    scenarios: { public: scenariosApproved, pending: scenariosPending, featured: null },
    feedback: { total: feedbackTotal, avgRating: (feedbackAvg as any)._avg.avgRating ?? null },
    funnel: { started: startedSessions, completed: completedSessions, rate: startedSessions > 0 ? Math.round((completedSessions / startedSessions) * 100) / 100 : null },
    scenariosByTitle,
    roundFunnel,
    avgRoundDurations,
    wow: {
      startedCount: delta(startedCur, startedPrev),
      completionRate: compWow,
      rounds: roundsWow,
      feedbackAvg: fbWow,
    },
  };
}
