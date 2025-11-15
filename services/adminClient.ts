import type { AdminMetrics, MetricsOptions } from '@/types/admin';

export async function fetchAdminMetrics(opts?: MetricsOptions): Promise<AdminMetrics> {
  const url = new URL('/api/admin/metrics', window.location.origin);
  if (opts?.from && opts?.to) {
    url.searchParams.set('from', opts.from);
    url.searchParams.set('to', opts.to);
  } else if (opts?.preset) {
    url.searchParams.set('range', opts.preset);
  }
  // includeWow is true by default serverside; pass explicit flag if needed later
  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch metrics (${res.status})`);
  const body = await res.json();
  if (!body?.success) throw new Error(body?.error || 'Metrics error');
  return body.data as AdminMetrics;
}
