async function getHealth() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/session/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

export default async function AdminHealthPage() {
  const health = await getHealth();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">System Health</h1>
      {!health ? (
        <div className="text-sm text-red-400">Unable to fetch health status.</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded p-4 space-y-2">
          <div className="text-sm text-gray-300">API: {health?.data?.api ? 'OK' : 'DOWN'}</div>
          <div className="text-sm text-gray-300">Store: {health?.data?.store}</div>
          <div className="text-sm text-gray-300">Store latency: {health?.data?.storeLatency} ms</div>
          <div className="text-xs text-gray-500">Timestamp: {new Date(health?.data?.timestamp || Date.now()).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

