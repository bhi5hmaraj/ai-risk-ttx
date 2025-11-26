"use client";

export function RoundFunnelTable({
  rows,
}: {
  rows: Array<{ level: number; count: number; conversionFromPrev: number | null }>;
}) {
  return (
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
          {rows.length === 0 ? (
            <tr><td className="px-3 py-3 text-gray-400" colSpan={3}>No data</td></tr>
          ) : (
            rows.map((r) => (
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
  );
}

