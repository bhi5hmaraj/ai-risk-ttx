import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/server/lib/prisma';
import { isAdminUser } from '@/server/lib/adminAccess';
import * as scenarioRepo from '@/server/data/publicScenarioRepo';

export const runtime = 'nodejs';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return json(401, { success: false, error: 'Unauthorized' });

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) return json(403, { success: false, error: 'Forbidden - Admin access required' });
  const { id } = await ctx.params;
  const { action, reason } = await req.json().catch(() => ({} as any));
  if (!id || !action) return json(400, { success: false, error: 'Missing id or action' });

  if (action !== 'approve' && action !== 'reject') return json(400, { success: false, error: 'Invalid action' });

  const exists = await prisma.publicScenario.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return json(404, { success: false, error: 'Not Found' });

  if (action === 'approve') {
    const updated = await scenarioRepo.approve(id);
    return json(200, { success: true, data: { id: updated.id, status: updated.status } });
  }

  // reject
  if (!reason || typeof reason !== 'string') return json(400, { success: false, error: 'Rejection reason required' });
  const updated = await scenarioRepo.reject(id, reason);
  return json(200, { success: true, data: { id: updated.id, status: updated.status } });
}
