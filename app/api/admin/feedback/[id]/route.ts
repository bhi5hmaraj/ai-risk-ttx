import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/server/lib/prisma';
import { isAdminUser } from '@/server/lib/adminAccess';
import * as feedbackRepo from '@/server/data/feedbackRepo';

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
  const { reviewed } = await req.json().catch(() => ({ reviewed: undefined }));
  if (!id || typeof reviewed !== 'boolean') return json(400, { success: false, error: 'Missing id or reviewed flag' });

  const exists = await prisma.feedback.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return json(404, { success: false, error: 'Not Found' });

  const updated = await feedbackRepo.setReviewed(id, reviewed);
  return json(200, { success: true, data: { id: updated.id, reviewed: updated.reviewed } });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return json(401, { success: false, error: 'Unauthorized' });

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) return json(403, { success: false, error: 'Forbidden - Admin access required' });
  const { id } = await ctx.params;
  if (!id) return json(400, { success: false, error: 'Missing id' });

  const row = await feedbackRepo.get(id);

  if (!row) return json(404, { success: false, error: 'Not Found' });
  return json(200, { success: true, data: row });
}
