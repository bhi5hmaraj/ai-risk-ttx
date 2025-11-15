'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useRouter } from 'next/navigation';

type Metrics = {
  success: boolean;
  data?: {
    timestamp: number;
    store: 'memory' | 'redis' | 'unknown';
    totals: { games: number | null; byType: Record<string, number> };
    averages: { rounds: number | null; completionRate: number | null };
    timeline: Array<{ date: string; count: number; completed: number }>;
    funnel: { started: number; completed: number; rate: number | null };
    scenariosByTitle: Array<{ title: string; started: number; completed: number; rate: number | null }>;
    feedback: { total: number | null; avgRating: number | null };
    roundFunnel: Array<{ level: number; count: number; conversionFromPrev: number | null }>;
    avgRoundDurations: Array<{ round: number; avgSeconds: number | null }>;
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
  const games = metrics?.data?.totals.games ?? '—';
  const avgRounds = metrics?.data?.averages.rounds ?? '—';
  const timeline = metrics?.data?.timeline || [];
  const funnel = metrics?.data?.funnel || { started: 0, completed: 0, rate: null };
  const scenariosByTitle = metrics?.data?.scenariosByTitle || [];
  const avgFeedback = metrics?.data?.feedback?.avgRating ?? null;

  const [sortKey, setSortKey] = useState<'started' | 'rate'>('started');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedScenarios = [...scenariosByTitle].sort((a, b) => {
    const A = sortKey === 'started' ? a.started : (a.rate ?? -1);
    const B = sortKey === 'started' ? b.started : (b.rate ?? -1);
    const cmp = (A === B) ? 0 : (A < B ? -1 : 1);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const toggleSort = (key: 'started' | 'rate') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const roundFunnel = metrics?.data?.roundFunnel || [];
  const avgRoundDurations = metrics?.data?.avgRoundDurations || [];

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
            <div className="text-sm text-gray-400">Games (total)</div>
            <div className="mt-2 text-3xl font-bold">{loading ? '…' : games}</div>
            <div className="mt-2 text-xs text-gray-500">Avg rounds: {avgRounds as any}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-400">Avg feedback score</div>
            <div className="mt-2 text-3xl font-bold">{avgFeedback != null ? Math.round(avgFeedback * 10) / 10 : '—'}</div>
            <div className="mt-2 text-xs text-gray-500">As of {ts}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded p-4 sm:col-span-2">
            <div className="text-sm text-gray-300">Funnel (Started → Completed)</div>
            <div className="mt-2 flex items-end gap-6">
              <div>
                <div className="text-2xl font-bold">{funnel.started}</div>
                <div className="text-xs text-gray-400">Started</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{funnel.completed}</div>
                <div className="text-xs text-gray-400">Completed</div>
              </div>
              <div className="ml-auto w-1/2">
                <div className="h-2 w-full bg-gray-800 rounded">
                  <div
                    className="h-2 bg-green-500 rounded"
                    style={{ width: `${Math.min(100, Math.max(0, (funnel.rate ?? 0) * 100))}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Completion rate: {funnel.rate != null ? `${Math.round((funnel.rate as number) * 100)}%` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-300 mb-2">Sessions per day (last 14d)</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={Math.max(0, Math.floor((timeline.length - 1) / 6))} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#e5e7eb' }} />
                  <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={false} name="Created" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-300 mb-2">Completions per day (last 14d)</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={Math.max(0, Math.floor((timeline.length - 1) / 6))} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#e5e7eb' }} />
                  <Line type="monotone" dataKey="completed" stroke="#34d399" strokeWidth={2} dot={false} name="Completed" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-gray-900 border border-gray-800 rounded p-4">
          <div className="text-sm text-gray-300 mb-2">Top Scenarios</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900 text-gray-300">
                <tr>
                  <th className="text-left px-3 py-2">Scenario</th>
                  <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('started')} title="Sort by started">Started {sortKey==='started' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                  <th className="text-left px-3 py-2 cursor-default">Completed</th>
                  <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('rate')} title="Sort by finish rate">Finish Rate % {sortKey==='rate' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                </tr>
              </thead>
              <tbody>
                {sortedScenarios.length === 0 ? (
                  <tr><td className="px-3 py-3 text-gray-400" colSpan={4}>No data</td></tr>
                ) : (
                  sortedScenarios.map((s) => (
                    <tr key={s.title} className="border-t border-gray-800">
                      <td className="px-3 py-2">{s.title}</td>
                      <td className="px-3 py-2">{s.started}</td>
                      <td className="px-3 py-2">{s.completed}</td>
                      <td className="px-3 py-2">{s.rate != null ? `${Math.round(s.rate * 100)}%` : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-300 mb-2">Round Funnel (Reached Round ≥ N)</div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900 text-gray-300">
                <tr>
                  <th className="text-left px-3 py-2">Level (N)</th>
                  <th className="text-left px-3 py-2">Count</th>
                  <th className="text-left px-3 py-2">Conversion from prev</th>
                </tr>
              </thead>
              <tbody>
                {roundFunnel.length === 0 ? (
                  <tr><td className="px-3 py-3 text-gray-400" colSpan={3}>No data</td></tr>
                ) : (
                  roundFunnel.map((r: any) => (
                    <tr key={r.level} className="border-t border-gray-800">
                      <td className="px-3 py-2">{r.level}</td>
                      <td className="px-3 py-2">{r.count}</td>
                      <td className="px-3 py-2">{r.conversionFromPrev != null ? `${Math.round(r.conversionFromPrev * 100)}%` : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-300 mb-2">Average Round Durations (seconds)</div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900 text-gray-300">
                <tr>
                  <th className="text-left px-3 py-2">Round</th>
                  <th className="text-left px-3 py-2">Avg Seconds</th>
                </tr>
              </thead>
              <tbody>
                {avgRoundDurations.length === 0 ? (
                  <tr><td className="px-3 py-3 text-gray-400" colSpan={2}>No data</td></tr>
                ) : (
                  avgRoundDurations.map((r: any) => (
                    <tr key={r.round} className="border-t border-gray-800">
                      <td className="px-3 py-2">{r.round}</td>
                      <td className="px-3 py-2">{r.avgSeconds != null ? r.avgSeconds : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
