"use client";

export function AdminMetricCards({
  totalGames,
  avgCompletion,
  avgRounds,
  avgMaxRounds,
  avgFeedback,
  wow,
  asOf,
}: {
  totalGames: number | null;
  avgCompletion: number | null; // 0..1
  avgRounds: number | null;
  avgMaxRounds: number | null;
  avgFeedback: number | null;
  wow?: { startedCount: number | null; completionRate: number | null; rounds: number | null; feedbackAvg: number | null };
  asOf: string;
}) {
  const pct = (x: number | null) => (x == null ? '—' : `${Math.round(x * 10000) / 100}%`);
  const num2 = (x: number | null) => (x == null ? '—' : Math.round(x * 100) / 100);
  const Delta = ({ value }: { value: number | null }) => {
    if (value == null) return <span className="text-gray-500 ml-2 text-xs">—</span>;
    const up = value > 0;
    const zero = value === 0;
    const cls = zero ? 'text-gray-400' : up ? 'text-green-400' : 'text-red-400';
    const arrow = zero ? '—' : up ? '▲' : '▼';
    return <span className={`ml-2 text-xs ${cls}`}>{arrow} {Math.round(Math.abs(value) * 1000) / 10}% WoW</span>;
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="bg-gray-900 border border-gray-800 rounded p-4">
        <div className="text-sm text-gray-400">Games (total)</div>
        <div className="mt-2 text-3xl font-bold">{totalGames ?? '—'} <Delta value={wow?.startedCount ?? null} /></div>
        <div className="mt-2 text-xs text-gray-500">As of {asOf}</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded p-4">
        <div className="text-sm text-gray-400">Avg completion</div>
        <div className="mt-2 text-3xl font-bold">{pct(avgCompletion)} <Delta value={wow?.completionRate ?? null} /></div>
        <div className="mt-2 text-xs text-gray-500">Average of per-session completion fractions</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded p-4">
        <div className="text-sm text-gray-400">Avg rounds (played)</div>
        <div className="mt-2 text-3xl font-bold">{num2(avgRounds)} <Delta value={wow?.rounds ?? null} /></div>
        <div className="mt-2 text-xs text-gray-500">Across sessions that started</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded p-4">
        <div className="text-sm text-gray-400">Avg feedback score</div>
        <div className="mt-2 text-3xl font-bold">{avgFeedback != null ? Math.round(avgFeedback * 10) / 10 : '—'} <Delta value={wow?.feedbackAvg ?? null} /></div>
        <div className="mt-2 text-xs text-gray-500">As of {asOf}</div>
      </div>
    </div>
  );
}
