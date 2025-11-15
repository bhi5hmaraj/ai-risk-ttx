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

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return json(401, { success: false, error: 'Unauthorized' });
  const { searchParams } = new URL(req.url);
  const filter = (searchParams.get('reviewed') || 'pending').toLowerCase(); // pending|reviewed|all
  const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '50')));

  const rows = await feedbackRepo.list({ filter: filter as any, limit });

  return json(200, { success: true, data: rows });
}
