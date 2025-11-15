import { prisma } from '@/server/lib/prisma';
import { GamePhase } from '@/server/types/core';

export async function upsertOnCreate(args: { id: string; mode: string; maxRounds?: number | null; scenarioTitle?: string | null }) {
  const { id, mode, maxRounds, scenarioTitle } = args;
  return prisma.sessionMetrics.upsert({
    where: { id },
    update: { maxRounds: maxRounds ?? undefined, scenarioTitle: scenarioTitle ?? undefined },
    create: { id, mode, maxRounds: maxRounds ?? undefined, scenarioTitle: scenarioTitle ?? undefined },
  });
}

export async function markInitialized(id: string) {
  const now = new Date();
  return prisma.sessionMetrics.update({ where: { id }, data: { rounds: 1, startedAt: now, currentRoundStartedAt: now } });
}

export async function recordAdvance(args: { id: string; round: number; phase: GamePhase }) {
  const { id, round, phase } = args;
  const now = new Date();
  const sm = await prisma.sessionMetrics.findUnique({ where: { id }, select: { currentRoundStartedAt: true, roundDurations: true } });
  let durations = sm?.roundDurations ?? [];
  if (sm?.currentRoundStartedAt) {
    const diffMs = now.getTime() - new Date(sm.currentRoundStartedAt).getTime();
    const secs = Math.max(0, Math.round(diffMs / 1000));
    durations = [...durations, secs];
  }
  const isCompleted = phase === GamePhase.END;
  return prisma.sessionMetrics.update({
    where: { id },
    data: {
      rounds: round,
      roundDurations: durations as any,
      currentRoundStartedAt: isCompleted ? null : now,
      ...(isCompleted ? { completed: true, completedAt: now } : {}),
    },
  });
}

