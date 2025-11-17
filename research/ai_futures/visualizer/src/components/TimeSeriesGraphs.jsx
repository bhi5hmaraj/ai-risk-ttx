import React, { useMemo } from 'react'
import './TimeSeriesGraphs.css'

/**
 * Time-series graphs showing key variables over simulation time
 * Based on AI2027 forecasts for compute, algorithmic efficiency, etc.
 */
export default function TimeSeriesGraphs({ history, globalState }) {
  // Prepare data series from history
  const series = useMemo(() => {
    const data = history.map(h => ({
      simDays: h.globalState.simDays || h.timestamp || 0,
      compute_flop: h.globalState.compute_flop,
      algorithmic_efficiency: h.globalState.algorithmic_efficiency,
      race_pressure: h.globalState.race_pressure,
      safety_margin: h.globalState.safety_margin,
      espionage_risk: h.globalState.espionage_risk,
      alignment_investment: h.globalState.alignment_investment,
    }))

    // Add current state if not in history
    if (data.length === 0 || data[data.length - 1].simDays < globalState.simDays) {
      data.push({
        simDays: globalState.simDays,
        compute_flop: globalState.compute_flop,
        algorithmic_efficiency: globalState.algorithmic_efficiency,
        race_pressure: globalState.race_pressure,
        safety_margin: globalState.safety_margin,
        espionage_risk: globalState.espionage_risk,
        alignment_investment: globalState.alignment_investment,
      })
    }

    return data
  }, [history, globalState])

  const maxSimDays = Math.max(...series.map(d => d.simDays), 1)

  return (
    <div className="time-series-graphs">
      <h3>Time Series (Simulation Days)</h3>

      {/* Compute FLOP */}
      <Graph
        title="Compute (FLOP)"
        data={series}
        yKey="compute_flop"
        maxX={maxSimDays}
        formatY={(v) => v.toExponential(1)}
        color="#64ffda"
        isLog={true}
        citation="AI2027 Compute Forecast: 3.4x/year growth"
      />

      {/* Algorithmic Efficiency */}
      <Graph
        title="Algorithmic Efficiency (relative to 2024)"
        data={series}
        yKey="algorithmic_efficiency"
        maxX={maxSimDays}
        formatY={(v) => v.toFixed(2) + 'x'}
        color="#64ffda"
        citation="AI2027 Timelines: ~0.5 OOMs/year"
      />

      {/* Race Pressure */}
      <Graph
        title="Race Pressure"
        data={series}
        yKey="race_pressure"
        maxX={maxSimDays}
        formatY={(v) => (v * 100).toFixed(0) + '%'}
        color="#e94560"
        citation="AI2027 Scenario: US-China competitive dynamics"
      />

      {/* Safety Margin */}
      <Graph
        title="Safety Margin"
        data={series}
        yKey="safety_margin"
        maxX={maxSimDays}
        formatY={(v) => (v * 100).toFixed(0) + '%'}
        color="#48bb78"
        thresholds={[{ value: 0.3, label: 'Critical', color: '#e94560' }]}
        citation="Alignment buffer before misalignment risk"
      />

      {/* Espionage Risk */}
      <Graph
        title="Espionage Risk"
        data={series}
        yKey="espionage_risk"
        maxX={maxSimDays}
        formatY={(v) => (v * 100).toFixed(0) + '%'}
        color="#ed8936"
        citation="AI2027 Security: Weights theft probability"
      />

      {/* Alignment Investment */}
      <Graph
        title="Alignment Investment"
        data={series}
        yKey="alignment_investment"
        maxX={maxSimDays}
        formatY={(v) => (v * 100).toFixed(0) + '%'}
        color="#9f7aea"
        citation="Fraction of resources on safety"
      />
    </div>
  )
}

function Graph({ title, data, yKey, maxX, formatY, color, isLog = false, thresholds = [], citation }) {
  const graphWidth = 400
  const graphHeight = 120
  const padding = { top: 10, right: 10, bottom: 25, left: 50 }

  // Calculate scales
  const xScale = (simDays) => {
    return padding.left + ((simDays / maxX) * (graphWidth - padding.left - padding.right))
  }

  const yValues = data.map(d => d[yKey])
  const minY = Math.min(...yValues, 0)
  const maxY = Math.max(...yValues, 1)

  const yScale = (value) => {
    if (isLog && value > 0) {
      const logMin = Math.log10(minY || 1e24)
      const logMax = Math.log10(maxY || 1e28)
      const logValue = Math.log10(value)
      const normalized = (logValue - logMin) / (logMax - logMin)
      return graphHeight - padding.bottom - (normalized * (graphHeight - padding.top - padding.bottom))
    } else {
      const range = maxY - minY
      const normalized = range > 0 ? (value - minY) / range : 0
      return graphHeight - padding.bottom - (normalized * (graphHeight - padding.top - padding.bottom))
    }
  }

  // Generate path
  const pathData = data.map((d, i) => {
    const x = xScale(d.simDays)
    const y = yScale(d[yKey])
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
  }).join(' ')

  // Current value
  const currentValue = data.length > 0 ? data[data.length - 1][yKey] : 0

  return (
    <div className="graph">
      <div className="graph-header">
        <h4>{title}</h4>
        <span className="current-value" style={{ color }}>{formatY(currentValue)}</span>
      </div>

      <svg width={graphWidth} height={graphHeight} className="graph-svg">
        {/* Grid lines */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={graphHeight - padding.bottom}
          stroke="#0f3460"
          strokeWidth="1"
        />
        <line
          x1={padding.left}
          y1={graphHeight - padding.bottom}
          x2={graphWidth - padding.right}
          y2={graphHeight - padding.bottom}
          stroke="#0f3460"
          strokeWidth="1"
        />

        {/* Y-axis labels */}
        <text x="5" y={padding.top + 5} className="axis-label">{formatY(maxY)}</text>
        <text x="5" y={graphHeight - padding.bottom} className="axis-label">{formatY(minY)}</text>

        {/* X-axis labels */}
        <text x={padding.left} y={graphHeight - 5} className="axis-label">Day 0</text>
        <text x={graphWidth - padding.right - 30} y={graphHeight - 5} className="axis-label">
          Day {Math.floor(maxX)}
        </text>

        {/* Threshold lines */}
        {thresholds.map((t, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={yScale(t.value)}
              x2={graphWidth - padding.right}
              y2={yScale(t.value)}
              stroke={t.color}
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <text
              x={graphWidth - padding.right - 50}
              y={yScale(t.value) - 3}
              className="threshold-label"
              fill={t.color}
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Data line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(d.simDays)}
            cy={yScale(d[yKey])}
            r="3"
            fill={color}
          />
        ))}
      </svg>

      {citation && <p className="graph-citation">{citation}</p>}
    </div>
  )
}
