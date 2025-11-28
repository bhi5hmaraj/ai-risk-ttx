import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { GameState } from '@/types';

interface GameChartsProps {
  gameState: GameState;
}

export const GameCharts: React.FC<GameChartsProps> = ({ gameState }) => {
  // Prepare score progression data
  const scoreProgressionData = useMemo(() => {
    return gameState.eventLog.map((log) => ({
      round: log.round === 0 ? 'Start' : `R${log.round}`,
      score: log.publicScoreAfter,
      change: log.publicScoreChange,
    }));
  }, [gameState.eventLog]);

  // Prepare round impact data (skip opening scenario)
  const roundImpactData = useMemo(() => {
    return gameState.eventLog
      .filter((log) => log.round > 0)
      .map((log) => ({
        round: `R${log.round}`,
        impact: log.publicScoreChange,
        headline: log.event?.headline || 'No event',
      }));
  }, [gameState.eventLog]);

  const metricName = gameState.coreMetric.name;

  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6 space-y-8">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Performance Analytics</h2>

      {/* Score Progression Line Chart */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-blue-300">Score Progression</h3>
        <p className="text-xs text-gray-400">How {metricName} evolved throughout the simulation</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={scoreProgressionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="round"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              domain={[0, 100]}
              style={{ fontSize: '12px' }}
              label={{ value: `${metricName} (%)`, angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontSize: '12px' } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#E5E7EB' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
            />
            <ReferenceLine y={50} stroke="#6B7280" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#60A5FA"
              strokeWidth={2}
              dot={{ fill: '#60A5FA', r: 4 }}
              activeDot={{ r: 6 }}
              name={metricName}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Round Impact Bar Chart */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-blue-300">Round Impact</h3>
        <p className="text-xs text-gray-400">Score changes per round (positive/negative)</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={roundImpactData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="round"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              label={{ value: 'Score Change (Δ)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontSize: '12px' } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#E5E7EB' }}
              formatter={(value: number, name: string, props: any) => [
                `${value > 0 ? '+' : ''}${value}`,
                'Impact'
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
            />
            <ReferenceLine y={0} stroke="#6B7280" strokeWidth={1} />
            <Bar
              dataKey="impact"
              fill="#60A5FA"
              name="Score Impact"
              radius={[4, 4, 0, 0]}
            >
              {roundImpactData.map((entry, index) => (
                <rect key={`bar-${index}`} fill={entry.impact >= 0 ? '#34D399' : '#EF4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
