import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/server/lib/prisma';
import { isAdminUser } from '@/server/lib/adminAccess';
import * as scenarioRepo from '@/server/data/publicScenarioRepo';

export const runtime = 'nodejs';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return json(401, { success: false, error: 'Unauthorized' });

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) return json(403, { success: false, error: 'Forbidden - Admin access required' });
  const { searchParams } = new URL(req.url);
  const rawStatus = (searchParams.get('status') || 'pending').toLowerCase();
  const status = (rawStatus === 'all' ? 'all' : rawStatus) as 'pending' | 'approved' | 'rejected' | 'all';
  const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '50')));

  const items = await scenarioRepo.list({ status, limit });

  return json(200, { success: true, data: items });
}
