"use client";

import { useEffect, useMemo, useState } from 'react';

type Scenario = {
  id: string;
  submitterName: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  voteCount: number;
  gameSetup: any;
  customPrompt: string;
  status: 'pending' | 'approved' | 'rejected';
};

export default function AdminScenariosPage() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Scenario[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/scenarios?status=${status}`);
      const body = await res.json();
      if (!res.ok || !body?.success) {
        setError(body?.error || 'Failed to load scenarios');
      } else {
        setItems(body.data as Scenario[]);
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const approve = async (id: string) => {
    await fetch(`/api/admin/scenarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    load();
  };

  const reject = async (id: string) => {
    const reason = prompt('Enter a rejection reason');
    if (!reason) return;
    await fetch(`/api/admin/scenarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reason }),
    });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Scenarios</h1>
        <div className="flex items-center gap-2">
          <select
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Submitter</th>
              <th className="text-left px-3 py-2">Submitted</th>
              <th className="text-left px-3 py-2">Votes</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-3 text-gray-400" colSpan={6}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-3 text-gray-400" colSpan={6}>No scenarios found.</td></tr>
            ) : (
              items.map((s) => {
                const title = (s.gameSetup as any)?.scenarioTitle || '—';
                return (
                  <tr key={s.id} className="border-t border-gray-800">
                    <td className="px-3 py-2 text-gray-400">{s.id.slice(0, 8)}…</td>
                    <td className="px-3 py-2">{title}</td>
                    <td className="px-3 py-2">{s.submitterName || 'Anonymous'}</td>
                    <td className="px-3 py-2">{new Date(s.submittedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{s.voteCount}</td>
                    <td className="px-3 py-2">
                      {status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => approve(s.id)} className="bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-white">Approve</button>
                          <button onClick={() => reject(s.id)} className="bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-white">Reject</button>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
