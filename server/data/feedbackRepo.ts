import { prisma } from '@/server/lib/prisma';

export async function list(args: { filter: 'pending' | 'reviewed' | 'all'; limit: number }) {
  const where = args.filter === 'all' ? {} : args.filter === 'reviewed' ? { reviewed: true } : { reviewed: false };
  const rows = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(args.limit, 200),
    select: {
      id: true,
      createdAt: true,
      model: true,
      scenarioType: true,
      gameCompleted: true,
      avgRating: true,
      reviewed: true,
      data: true,
    },
  });
  // Enrich with scenarioTitle derived from nested JSON if present
  return rows.map((r) => {
    let scenarioTitle: string | null = null;
    try {
      scenarioTitle = (r as any).data?.gameMetadata?.scenarioTitle ?? null;
    } catch {}
    const { data, ...rest } = r as any;
    return { ...rest, scenarioTitle };
  });
}

export async function get(id: string) {
  return prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      model: true,
      scenarioType: true,
      rolePlayed: true,
      gameCompleted: true,
      avgRating: true,
      reviewed: true,
      data: true,
    },
  });
}

export async function setReviewed(id: string, reviewed: boolean) {
  return prisma.feedback.update({ where: { id }, data: { reviewed } });
}
