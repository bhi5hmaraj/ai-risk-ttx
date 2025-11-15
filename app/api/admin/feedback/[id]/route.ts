import { NextRequest } from 'next/server';
import { prisma } from '@/server/lib/prisma';
import * as feedbackRepo from '@/server/data/feedbackRepo';

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
  const { reviewed } = await req.json().catch(() => ({ reviewed: undefined }));
  if (!id || typeof reviewed !== 'boolean') return json(400, { success: false, error: 'Missing id or reviewed flag' });

  const exists = await prisma.feedback.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return json(404, { success: false, error: 'Not Found' });

  const updated = await feedbackRepo.setReviewed(id, reviewed);
  return json(200, { success: true, data: { id: updated.id, reviewed: updated.reviewed } });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return json(401, { success: false, error: 'Unauthorized' });
  const { id } = await ctx.params;
  if (!id) return json(400, { success: false, error: 'Missing id' });

  const row = await feedbackRepo.get(id);

  if (!row) return json(404, { success: false, error: 'Not Found' });
  return json(200, { success: true, data: row });
}
