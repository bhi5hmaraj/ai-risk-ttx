import React, { useMemo } from 'react'
import Plot from 'react-plotly.js'
import './TimeSeriesGraphs.css'

/**
 * Time-series graphs showing key variables over simulation time with event markers
 * Based on AI2027 forecasts for compute, algorithmic efficiency, etc.
 */
export default function TimeSeriesGraphs({ history, globalState, events = [] }) {
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
      {/* Compute FLOP */}
      <Graph
        title="Compute (FLOP)"
        data={series}
        yKey="compute_flop"
        maxX={maxSimDays}
        formatY={(v) => v.toExponential(1)}
        color="#3498db"
        isLog={true}
        events={events}
        citation="AI2027 Compute Forecast: 3.4x/year growth"
      />

      {/* Safety Margin */}
      <Graph
        title="Safety Margin"
        data={series}
        yKey="safety_margin"
        maxX={maxSimDays}
        formatY={(v) => (v * 100).toFixed(0) + '%'}
        color="#27ae60"
        thresholds={[{ value: 0.3, label: 'Critical', color: '#e74c3c' }]}
        events={events}
        citation="Alignment buffer before misalignment risk"
      />

      {/* Race Pressure */}
      <Graph
        title="Race Pressure"
        data={series}
        yKey="race_pressure"
        maxX={maxSimDays}
        formatY={(v) => (v * 100).toFixed(0) + '%'}
        color="#e74c3c"
        events={events}
        citation="AI2027 Scenario: US-China competitive dynamics"
      />

      {/* Algorithmic Efficiency */}
      <Graph
        title="Algorithmic Efficiency (relative to 2024)"
        data={series}
        yKey="algorithmic_efficiency"
        maxX={maxSimDays}
        formatY={(v) => v.toFixed(2) + 'x'}
        color="#9b59b6"
        events={events}
        citation="AI2027 Timelines: ~0.5 OOMs/year"
      />

      {/* Espionage Risk */}
      <Graph
        title="Espionage Risk"
        data={series}
        yKey="espionage_risk"
        maxX={maxSimDays}
        formatY={(v) => (v * 100).toFixed(0) + '%'}
        color="#e67e22"
        events={events}
        citation="AI2027 Security: Weights theft probability"
      />

      {/* Alignment Investment */}
      <Graph
        title="Alignment Investment"
        data={series}
        yKey="alignment_investment"
        maxX={maxSimDays}
        formatY={(v) => (v * 100).toFixed(0) + '%'}
        color="#16a085"
        events={events}
        citation="Fraction of resources on safety"
      />
    </div>
  )
}

function Graph({ title, data, yKey, maxX, formatY, color, isLog = false, thresholds = [], citation, events = [] }) {
  // Current value
  const currentValue = data.length > 0 ? data[data.length - 1][yKey] : 0

  // Prepare data for Plotly
  const xData = data.map(d => d.simDays)
  const yData = data.map(d => d[yKey])

  // Main trace
  const traces = [{
    x: xData,
    y: yData,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: color, width: 3 },
    marker: { color: color, size: 4 },
    name: title,
    hovertemplate: `Day %{x}<br>%{y}<extra></extra>`
  }]

  // Determine y-axis range for event markers
  const yMin = Math.min(...yData, ...(thresholds.map(t => t.value)))
  const yMax = Math.max(...yData, ...(thresholds.map(t => t.value)))

  // Add event markers as vertical lines (shapes)
  const shapes = [
    // Threshold lines
    ...thresholds.map(t => ({
      type: 'line',
      x0: 0,
      x1: maxX,
      y0: t.value,
      y1: t.value,
      line: {
        color: t.color,
        width: 2,
        dash: 'dash'
      }
    })),
    // Event markers
    ...events.map(event => ({
      type: 'line',
      x0: event.simDay,
      x1: event.simDay,
      y0: yMin,
      y1: yMax,
      line: {
        color: 'rgba(52, 73, 94, 0.3)',
        width: 2,
        dash: 'dot'
      }
    }))
  ]

  // Add annotations for thresholds and events
  const annotations = [
    // Threshold labels
    ...thresholds.map(t => ({
      x: maxX * 0.8,
      y: t.value,
      text: t.label,
      showarrow: false,
      font: {
        color: t.color,
        size: 10,
        family: 'system-ui'
      },
      xanchor: 'left',
      yanchor: 'bottom',
      bgcolor: 'rgba(255, 255, 255, 0.8)',
      borderpad: 2
    })),
    // Event markers (only show if there's a relevant impact)
    ...events.filter(event => event.impacts && event.impacts[yKey] !== undefined).map(event => ({
      x: event.simDay,
      y: yMax * 0.9,
      text: '📍',
      showarrow: false,
      font: {
        size: 16
      },
      hovertext: `${event.name}<br>${event.description}`,
      xanchor: 'center',
      yanchor: 'middle'
    }))
  ]

  const layout = {
    height: 220,
    margin: { l: 65, r: 20, t: 10, b: 45 },
    xaxis: {
      title: 'Simulation Days',
      color: '#34495e',
      gridcolor: '#ecf0f1',
      showgrid: true,
      zeroline: false,
      titlefont: { size: 11 }
    },
    yaxis: {
      type: isLog ? 'log' : 'linear',
      color: '#34495e',
      gridcolor: '#ecf0f1',
      showgrid: true,
      zeroline: false
    },
    shapes: shapes,
    annotations: annotations,
    paper_bgcolor: 'rgba(255,255,255,0)',
    plot_bgcolor: 'rgba(255,255,255,0)',
    font: {
      color: '#2c3e50',
      family: 'system-ui, -apple-system, sans-serif'
    },
    showlegend: false,
    hovermode: 'closest'
  }

  const config = {
    displayModeBar: false,
    responsive: true
  }

  return (
    <div className="graph">
      <div className="graph-header">
        <h4>{title}</h4>
        <span className="current-value" style={{ color }}>{formatY(currentValue)}</span>
      </div>

      <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%' }}
        useResizeHandler={true}
      />

      {citation && <p className="graph-citation">{citation}</p>}
    </div>
  )
}
