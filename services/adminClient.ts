import type { AdminMetrics } from '@/types/admin';

export async function fetchAdminMetrics(days?: number): Promise<AdminMetrics> {
  const url = new URL('/api/admin/metrics', window.location.origin);
  if (typeof days === 'number') url.searchParams.set('days', String(days));
  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch metrics (${res.status})`);
  const body = await res.json();
  if (!body?.success) throw new Error(body?.error || 'Metrics error');
  return body.data as AdminMetrics;
}

