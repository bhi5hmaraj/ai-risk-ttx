"use client";

export function AvgRoundDurationsTable({
  rows,
}: {
  rows: Array<{ round: number; avgSeconds: number | null }>;
}) {
  return (
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
          {rows.length === 0 ? (
            <tr><td className="px-3 py-3 text-gray-400" colSpan={2}>No data</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.round} className="border-t border-gray-800">
                <td className="px-3 py-2">{r.round}</td>
                <td className="px-3 py-2">{r.avgSeconds != null ? r.avgSeconds : '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

