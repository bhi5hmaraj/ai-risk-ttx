'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminMetrics } from '@/types/admin';
import { fetchAdminMetrics } from '@/services/adminClient';
import { AdminMetricCards } from '@/components/admin/AdminMetricCards';
import { TimelineSeriesChart } from '@/components/admin/TimelineSeriesChart';
import { ScenarioTable } from '@/components/admin/ScenarioTable';
import { RoundFunnelTable } from '@/components/admin/RoundFunnelTable';
import { AvgRoundDurationsTable } from '@/components/admin/AvgRoundDurationsTable';

type Metrics = { success: boolean; data?: AdminMetrics };

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [range, setRange] = useState<'today' | '7d' | '30d'>('7d');

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
      const data = await fetchAdminMetrics({ preset: range });
      const body: Metrics = { success: true, data };
      if (!body?.success) {
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
  }, [range]);

  const ts = metrics?.data?.timestamp ? new Date(metrics.data.timestamp).toLocaleString() : '—';
  const games = metrics?.data?.totals.games ?? null;
  const avgRoundsRaw = metrics?.data?.averages.rounds ?? null;
  const avgCompletionRate = metrics?.data?.averages.completionRate ?? null;
  const avgMaxRoundsRaw = metrics?.data?.averages.maxRounds ?? null;
  const wow = metrics?.data?.wow;
  const timeline = metrics?.data?.timeline || [];
  const funnel = metrics?.data?.funnel || { started: 0, completed: 0, rate: null };
  const scenariosByTitle = metrics?.data?.scenariosByTitle || [];
  const avgFeedback = metrics?.data?.feedback?.avgRating ?? null;

  const roundFunnel = metrics?.data?.roundFunnel || [];
  const avgRoundDurations = metrics?.data?.avgRoundDurations || [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
              title="Date range"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
            </select>
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

        <AdminMetricCards
          totalGames={loading ? null : games}
          avgCompletion={avgCompletionRate}
          avgRounds={avgRoundsRaw}
          avgMaxRounds={avgMaxRoundsRaw}
          avgFeedback={avgFeedback}
          wow={wow}
          asOf={ts}
        />
        <div className="bg-gray-900 border border-gray-800 rounded p-4 sm:col-span-2 mt-4">
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-300 mb-2">Sessions per day (last 14d)</div>
            <TimelineSeriesChart data={timeline} seriesKey="count" color="#60a5fa" name="Started" />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <div className="text-sm text-gray-300 mb-2">Completions per day (last 14d)</div>
            <TimelineSeriesChart data={timeline} seriesKey="completed" color="#34d399" name="Completed" />
          </div>
        </div>

        <ScenarioTable rows={scenariosByTitle} />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <RoundFunnelTable rows={roundFunnel} />
          <AvgRoundDurationsTable rows={avgRoundDurations} />
        </div>
      </div>
    </div>
  );
}
