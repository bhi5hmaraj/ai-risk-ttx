import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isAdminUser } from '@/server/lib/adminAccess';
import { prisma } from '@/server/lib/prisma';
import * as metricsRepo from '@/server/data/metricsRepo';
import * as feedbackRepo from '@/server/data/feedbackRepo';
import * as scenarioRepo from '@/server/data/publicScenarioRepo';
import type { MetricsOptions } from '@/types/admin';

/**
 * Consolidated Admin API router
 *
 * Why: Vercel/Next creates one function per route by default. Migrating
 * from many route files to a single catch‑all reduces the number of serverless
 * functions while keeping all existing URLs stable (no UI changes needed).
 *
 * URLs handled here (all under /api/admin):
 * - GET  /env-debug                     (public)
 * - GET  /metrics                       (admin-only)
 * - GET  /feedback                      (admin-only)
 * - GET  /feedback/:id                  (admin-only)
 * - GET  /scenarios                     (admin-only)
 * - PATCH /scenarios/:id                (admin-only)
 *
 * Auth model:
 * - Pages (/admin/**) are protected by middleware.ts using Clerk + allowlist
 * - APIs are protected here via guardAdmin(), except env-debug which is public
 */
export const runtime = 'nodejs';

/** Serialize a JSON response with a consistent Content-Type header. */
function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

/** Parse a URL string env var and return only its host for safe exposure. */
function safeUrlHost(v?: string | null) {
  if (!v) return null;
  try { return new URL(v).hostname; } catch { return null; }
}

/**
 * Admin guard used by protected endpoints. Returns a Response on failure
 * (401/403) or null when the caller is an allowed admin.
 */
async function guardAdmin(): Promise<Response | null> {
  const { userId } = await auth();
  if (!userId) return json(401, { success: false, error: 'Unauthorized' });
  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) return json(403, { success: false, error: 'Forbidden - Admin access required' });
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ parts?: string[] }> }) {
  const { parts = [] } = await ctx.params;
  const seg0 = parts[0];

  // No root handler (i.e., /api/admin → 404). We only handle defined subpaths.
  if (!seg0) return json(404, { success: false, error: 'Not Found' });

  // Public: /api/admin/env-debug
  // Exposes only booleans and hostname fragments for quick environment checks.
  if (seg0 === 'env-debug') {
    const body = {
      clerkPublishableKeySet: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
      clerkSecretKeySet: Boolean(process.env.CLERK_SECRET_KEY),
      vercelEnv: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
      directDbUrlHost: safeUrlHost(process.env.DIRECT_DATABASE_URL),
      databaseUrlHost: safeUrlHost(process.env.DATABASE_URL),
    };
    return NextResponse.json({ success: true, data: body }, { status: 200 });
  }

  // GET /api/admin/metrics
  // Accepts optional query params: days|range|from|to (see MetricsOptions)
  if (seg0 === 'metrics') {
    const blocked = await guardAdmin();
    if (blocked) return blocked;
    try {
      const sp = req.nextUrl.searchParams;
      const daysParam = sp.get('days');
      const rangeParam = sp.get('range');
      const fromParam = sp.get('from');
      const toParam = sp.get('to');
      let opts: MetricsOptions | undefined;
      if (fromParam && toParam) opts = { from: fromParam, to: toParam, includeWow: true };
      else if (rangeParam === 'today' || rangeParam === '7d' || rangeParam === '30d') opts = { preset: rangeParam, includeWow: true } as MetricsOptions;
      else if (daysParam) {
        const n = Number(daysParam);
        if (n === 1) opts = { preset: 'today', includeWow: true };
        else if (n <= 7) opts = { preset: '7d', includeWow: true };
        else opts = { preset: '30d', includeWow: true };
      }
      const data = await metricsRepo.getAdminMetrics(opts);
      return json(200, { success: true, data });
    } catch (err: any) {
      // Graceful fallback if DB is unavailable
      const fallback = {
        timestamp: Date.now(),
        store: (process.env.SESSION_STORE_TYPE || 'memory') as 'memory' | 'redis' | 'unknown',
        totals: { games: null, byType: {} as Record<string, number> },
        averages: { rounds: null, completionRate: null, maxRounds: null, ratioAvgRoundsToAvgMaxRounds: null },
        timeline: [] as Array<{ date: string; count: number; completed: number }>,
        scenarios: { public: null, pending: null, featured: null },
        feedback: { total: null, avgRating: null },
        funnel: { started: 0, completed: 0, rate: null as number | null },
        scenariosByTitle: [] as Array<{ title: string; started: number; completed: number; rate: number | null }>,
        roundFunnel: [] as Array<{ level: number; count: number; conversionFromPrev: number | null }>,
        avgRoundDurations: [] as Array<{ round: number; avgSeconds: number | null }>,
        wow: { startedCount: null, completionRate: null, rounds: null, feedbackAvg: null },
      };
      return json(200, { success: true, data: fallback });
    }
  }

  // /api/admin/feedback and /api/admin/feedback/:id
  if (seg0 === 'feedback') {
    const blocked = await guardAdmin();
    if (blocked) return blocked;

    // List
    if (parts.length === 1) {
      const { searchParams } = new URL(req.url);
      const filter = (searchParams.get('reviewed') || 'pending').toLowerCase();
      const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '50')));
      const rows = await feedbackRepo.list({ filter: filter as any, limit });
      return json(200, { success: true, data: rows });
    }

    // Detail
    if (parts.length === 2) {
      const id = parts[1];
      if (!id) return json(400, { success: false, error: 'Missing id' });
      const row = await feedbackRepo.get(id);
      if (!row) return json(404, { success: false, error: 'Not Found' });
      return json(200, { success: true, data: row });
    }

    return json(404, { success: false, error: 'Not Found' });
  }

  // /api/admin/scenarios (list only; mutations via PATCH below)
  if (seg0 === 'scenarios') {
    const blocked = await guardAdmin();
    if (blocked) return blocked;
    if (parts.length === 1) {
      const { searchParams } = new URL(req.url);
      const rawStatus = (searchParams.get('status') || 'pending').toLowerCase();
      const status = (rawStatus === 'all' ? 'all' : rawStatus) as 'pending' | 'approved' | 'rejected' | 'all';
      const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '50')));
      const items = await scenarioRepo.list({ status, limit });
      return json(200, { success: true, data: items });
    }
    // No GET handler for /scenarios/:id
    return json(404, { success: false, error: 'Not Found' });
  }

  return json(404, { success: false, error: 'Not Found' });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ parts?: string[] }> }) {
  const { parts = [] } = await ctx.params;
  const seg0 = parts[0];
  const blocked = await guardAdmin();
  if (blocked) return blocked;

  // PATCH /api/admin/feedback/:id  → { reviewed: boolean }
  if (seg0 === 'feedback' && parts.length === 2) {
    const id = parts[1];
    const { reviewed } = await req.json().catch(() => ({ reviewed: undefined }));
    if (!id || typeof reviewed !== 'boolean') return json(400, { success: false, error: 'Missing id or reviewed flag' });

    const exists = await prisma.feedback.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return json(404, { success: false, error: 'Not Found' });
    const updated = await feedbackRepo.setReviewed(id, reviewed);
    return json(200, { success: true, data: { id: updated.id, reviewed: updated.reviewed } });
  }

  // PATCH /api/admin/scenarios/:id → { action: 'approve' | 'reject', reason? }
  if (seg0 === 'scenarios' && parts.length === 2) {
    const id = parts[1];
    const { action, reason } = await req.json().catch(() => ({} as any));
    if (!id || !action) return json(400, { success: false, error: 'Missing id or action' });
    if (action !== 'approve' && action !== 'reject') return json(400, { success: false, error: 'Invalid action' });

    const exists = await prisma.publicScenario.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return json(404, { success: false, error: 'Not Found' });

    if (action === 'approve') {
      const updated = await scenarioRepo.approve(id);
      return json(200, { success: true, data: { id: updated.id, status: updated.status } });
    }
    if (!reason || typeof reason !== 'string') return json(400, { success: false, error: 'Rejection reason required' });
    const updated = await scenarioRepo.reject(id, reason);
    return json(200, { success: true, data: { id: updated.id, status: updated.status } });
  }

  return json(404, { success: false, error: 'Not Found' });
}
