"use client";

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  createdAt: string;
  model: string | null;
  scenarioType: string | null;
  gameCompleted: boolean;
  avgRating: number | null;
  reviewed: boolean;
};

export default function AdminFeedbackPage() {
  const [filter, setFilter] = useState<'pending'|'reviewed'|'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/feedback?reviewed=${filter}`);
      const body = await res.json();
      if (!res.ok || !body?.success) {
        setError(body?.error || 'Failed to fetch feedback');
        setRows([]);
      } else {
        setRows(body.data as Row[]);
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleReviewed = async (id: string, reviewed: boolean) => {
    await fetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewed }),
    });
    load();
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Feedback</h1>
        <div className="flex items-center gap-2">
          <select className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="all">All</option>
          </select>
          <button onClick={load} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5 text-sm">Refresh</button>
        </div>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="overflow-x-auto border border-gray-800 rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900 text-gray-300">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Created</th>
              <th className="text-left px-3 py-2">Model</th>
              <th className="text-left px-3 py-2">Scenario</th>
              <th className="text-left px-3 py-2">Completed</th>
              <th className="text-left px-3 py-2">Avg Rating</th>
              <th className="text-left px-3 py-2">Reviewed</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-3 text-gray-400" colSpan={7}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-3 py-3 text-gray-400" colSpan={7}>No feedback found.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-800">
                  <td className="px-3 py-2 text-gray-400">{r.id.slice(0, 8)}…</td>
                  <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.model || '—'}</td>
                  <td className="px-3 py-2">{r.scenarioType || '—'}</td>
                  <td className="px-3 py-2">{r.gameCompleted ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{r.avgRating ?? '—'}</td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={r.reviewed} onChange={(e) => toggleReviewed(r.id, e.target.checked)} />
                      <span className="text-gray-400">Mark reviewed</span>
                    </label>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
