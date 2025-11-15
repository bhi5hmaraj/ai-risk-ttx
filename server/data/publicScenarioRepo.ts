import { prisma } from '@/server/lib/prisma';

export async function list(args: { status: 'pending' | 'approved' | 'rejected' | 'all'; limit: number }) {
  const where = args.status === 'all' ? {} : { status: args.status };
  return prisma.publicScenario.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    take: Math.min(args.limit, 200),
    select: {
      id: true,
      submitterName: true,
      submittedAt: true,
      reviewedAt: true,
      reviewedBy: true,
      rejectionReason: true,
      voteCount: true,
      gameSetup: true,
      customPrompt: true,
      status: true,
    },
  });
}

export async function approve(id: string, reviewedBy = 'admin') {
  return prisma.publicScenario.update({ where: { id }, data: { status: 'approved', reviewedAt: new Date(), reviewedBy, rejectionReason: null } });
}

export async function reject(id: string, reason: string, reviewedBy = 'admin') {
  return prisma.publicScenario.update({ where: { id }, data: { status: 'rejected', reviewedAt: new Date(), reviewedBy, rejectionReason: reason } });
}

