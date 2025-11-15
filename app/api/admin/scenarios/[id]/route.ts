import { NextRequest } from 'next/server';
import { prisma } from '@/server/lib/prisma';
import * as scenarioRepo from '@/server/data/publicScenarioRepo';

export const runtime = 'nodejs';

async function isAdmin(req: NextRequest): Promise<boolean> {
  try {
    const { getToken } = await import('next-auth/jwt');
    const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
    if ((token as any)?.role === 'admin') return true;
  } catch {}
  try {
    const { verifySessionToken } = await import('@/server/lib/adminAuth');
    const cookie = req.cookies.get('admin_session')?.value;
    if (!cookie) return false;
    const ok = await verifySessionToken(cookie);
    return ok.valid;
  } catch {
    return false;
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return json(401, { success: false, error: 'Unauthorized' });
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
