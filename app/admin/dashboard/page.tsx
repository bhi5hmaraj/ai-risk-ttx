'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Metrics = {
  success: boolean;
  data?: {
    timestamp: number;
    store: 'memory' | 'redis' | 'unknown';
    totals: { games: number | null; byType: Record<string, number> };
    averages: { rounds: number | null; completionRate: number | null };
    timeline: Array<{ date: string; count: number; completed: number }>;
  };
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const handleLogout = async () => {
    try {
      try {
        const mod: any = await import('next-auth/react');
        await mod.signOut({ redirect: false });
      } catch {
        await fetch('/api/admin/logout', { method: 'POST' });
      }
    } finally {
      router.push('/admin/login');
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/metrics', { cache: 'no-store' });
      const body = (await res.json()) as Metrics;
      if (!res.ok || !body?.success) {
        setError('Failed to load metrics');
        setMetrics(null);
      } else {
        setMetrics(body);
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const ts = metrics?.data?.timestamp ? new Date(metrics.data.timestamp).toLocaleString() : '—';
  const store = metrics?.data?.store || 'unknown';
  const games = metrics?.data?.totals.games ?? '—';
  const avgRounds = metrics?.data?.averages.rounds ?? '—';
  const timeline = metrics?.data?.timeline || [];

  const Sparkline = ({ data, color = '#60a5fa' }: { data: Array<{ date: string; count: number }>; color?: string }) => {
    if (!data || data.length === 0) return <div className="text-gray-400">No data</div>;
    const w = 320, h = 80, pad = 4;
    const maxY = Math.max(1, ...data.map(d => d.count));
    const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
    const points = data.map((d, i) => {
      const x = pad + i * stepX;
      const y = pad + (h - pad * 2) * (1 - d.count / maxY);
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <button onClick={load} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5 text-sm">
              Refresh
            </button>
            <button onClick={handleLogout} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5">
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-400">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-400">Store</div>
            <div className="mt-2 text-3xl font-bold capitalize">{store}</div>
            <div className="mt-2 text-xs text-gray-500">As of {ts}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-400">Games (total)</div>
            <div className="mt-2 text-3xl font-bold">{loading ? '…' : games}</div>
            <div className="mt-2 text-xs text-gray-500">Avg rounds: {avgRounds as any}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-300 mb-2">Sessions per day (last 14d)</div>
            <Sparkline data={timeline.map(t => ({ date: t.date, count: t.count }))} />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-300 mb-2">Completions per day (last 14d)</div>
            <Sparkline data={timeline.map(t => ({ date: t.date, count: t.completed }))} color="#34d399" />
          </div>
        </div>
      </div>
    </div>
  );
}
