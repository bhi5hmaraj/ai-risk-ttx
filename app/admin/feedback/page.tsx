"use client";

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  createdAt: string;
  model: string | null;
  scenarioType: string | null;
  scenarioTitle?: string | null;
  gameCompleted: boolean;
  avgRating: number | null;
  reviewed: boolean;
};

export default function AdminFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Always fetch all feedback; no filtering UI
      const res = await fetch(`/api/admin/feedback?reviewed=all`);
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

  const viewDetails = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`);
      const body = await res.json();
      if (res.ok && body?.success) setDetail(body.data);
      else setDetail({ error: body?.error || 'Failed to load details' });
    } catch (e: any) {
      setDetail({ error: e?.message || 'Network error' });
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Feedback</h1>
        <button onClick={load} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5 text-sm">Refresh</button>
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
              <th className="text-left px-3 py-2">More</th>
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
                  <td className="px-3 py-2">{r.scenarioTitle || r.scenarioType || '—'}</td>
                  <td className="px-3 py-2">{r.gameCompleted ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{r.avgRating ?? '—'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => viewDetails(r.id)} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-2 py-1 text-xs">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetailOpen(false)}>
          <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <div className="text-sm text-gray-300">Feedback Details</div>
              <button onClick={() => setDetailOpen(false)} className="text-gray-400 hover:text-gray-200 text-sm">Close</button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto text-sm text-gray-200">
              {detailLoading ? (
                <div className="text-gray-400">Loading…</div>
              ) : detail?.error ? (
                <div className="text-red-400">{String(detail.error)}</div>
              ) : detail ? (
                <div className="space-y-2">
                  <div><span className="text-gray-400">ID:</span> {detail.id}</div>
                  <div><span className="text-gray-400">Created:</span> {new Date(detail.createdAt).toLocaleString()}</div>
                  <div><span className="text-gray-400">Model:</span> {detail.model || '—'}</div>
                  <div><span className="text-gray-400">Scenario:</span> {detail.scenarioType || '—'}{detail?.data?.gameMetadata?.scenarioTitle ? ` — ${detail.data.gameMetadata.scenarioTitle}` : ''}</div>
                  <div><span className="text-gray-400">Role:</span> {detail.rolePlayed || '—'}</div>
                  <div><span className="text-gray-400">Completed:</span> {detail.gameCompleted ? 'Yes' : 'No'}</div>
                  <div><span className="text-gray-400">Avg rating:</span> {detail.avgRating ?? '—'}</div>
                  <div><span className="text-gray-400">Reviewed:</span> {detail.reviewed ? 'Yes' : 'No'}</div>
                  <JsonTable title="Feedback data" data={detail.data} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JsonTable({ title, data }: { title: string; data: any }) {
  const rows = flattenJson(data);
  return (
    <div className="mt-3">
      <div className="text-gray-400 mb-1">{title}:</div>
      {rows.length === 0 ? (
        <div className="text-xs text-gray-500">No data</div>
      ) : (
        <div className="overflow-auto max-h-96 border border-gray-800 rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-900 text-gray-300">
              <tr>
                <th className="text-left px-3 py-2 w-1/2">Key</th>
                <th className="text-left px-3 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-gray-800">
                  <td className="px-3 py-2 text-gray-300 font-mono break-all">{r.key}</td>
                  <td className="px-3 py-2 text-gray-200 break-words">
                    {renderValue(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function renderValue(v: any) {
  if (v === null || v === undefined) return <span className="text-gray-500">—</span>;
  if (typeof v === 'boolean') return <span>{v ? 'true' : 'false'}</span>;
  if (typeof v === 'number') return <span>{v}</span>;
  if (typeof v === 'string') return <span className="whitespace-pre-wrap break-words">{v}</span>;
  // Fallback for nested structures
  try {
    return <span className="whitespace-pre-wrap break-words">{JSON.stringify(v)}</span>;
  } catch {
    return <span className="text-gray-500">[unserializable]</span>;
  }
}

function flattenJson(input: any, prefix = ''): Array<{ key: string; value: any }> {
  const out: Array<{ key: string; value: any }> = [];
  const makeKey = (k: string | number) => (prefix ? `${prefix}.${k}` : String(k));

  if (input === null || input === undefined) return out;
  if (typeof input !== 'object') {
    out.push({ key: prefix || 'value', value: input });
    return out;
  }

  if (Array.isArray(input)) {
    input.forEach((v, i) => {
      if (v !== null && typeof v === 'object') out.push(...flattenJson(v, makeKey(`[${i}]`)));
      else out.push({ key: makeKey(`[${i}]`), value: v });
    });
    return out;
  }

  Object.keys(input).forEach((k) => {
    const v = (input as any)[k];
    if (v !== null && typeof v === 'object') out.push(...flattenJson(v, makeKey(k)));
    else out.push({ key: makeKey(k), value: v });
  });
  return out;
}
