"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function TimelineSeriesChart({
  data,
  seriesKey,
  color,
  name,
}: {
  data: Array<{ date: string; count?: number; completed?: number }>;
  seriesKey: 'count' | 'completed';
  color: string;
  name: string;
}) {
  const interval = Math.max(0, Math.floor((data.length - 1) / 6));
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={interval} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#e5e7eb' }} />
          <Line type="monotone" dataKey={seriesKey} stroke={color} strokeWidth={2} dot={false} name={name} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
