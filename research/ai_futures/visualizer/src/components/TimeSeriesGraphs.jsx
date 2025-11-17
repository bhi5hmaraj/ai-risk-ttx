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
      {/* Top 3 - Most Important */}
      <Graph
        title="Compute (FLOP)"
        data={series}
        yKey="compute_flop"
        maxX={maxSimDays}
        formatY={(v) => v.toExponential(1)}
        color="#3498db"
        isLog={true}
        events={events}
      />

      <Graph
        title="Safety Margin"
        data={series}
        yKey="safety_margin"
        maxX={maxSimDays}
        formatY={(v) => (v * 100).toFixed(0) + '%'}
        color="#27ae60"
        thresholds={[{ value: 0.3, label: 'Critical', color: '#e74c3c' }]}
        events={events}
      />

      <Graph
        title="Race Pressure"
        data={series}
        yKey="race_pressure"
        maxX={maxSimDays}
        formatY={(v) => (v * 100).toFixed(0) + '%'}
        color="#e74c3c"
        events={events}
      />
    </div>
  )
}

function Graph({ title, data, yKey, maxX, formatY, color, isLog = false, thresholds = [], events = [] }) {
  // Current value
  const currentValue = data.length > 0 ? data[data.length - 1][yKey] : 0

  // Prepare data for Plotly
  const xData = data.map(d => d.simDays)
  const yData = data.map(d => d[yKey])

  // Determine y-axis range with 25% headroom
  const thresholdValues = thresholds.length > 0 ? thresholds.map(t => t.value) : []
  const dataMin = yData.length > 0 ? Math.min(...yData, ...thresholdValues) : 0
  const dataMax = yData.length > 0 ? Math.max(...yData, ...thresholdValues) : 1

  // Add 25% padding to y-axis for headroom
  const yRange = dataMax - dataMin || 1
  const yMin = isLog ? undefined : (dataMin - (yRange * 0.1))
  const yMax = isLog ? undefined : (dataMax + (yRange * 0.25))

  // Main data trace
  const mainTrace = {
    x: xData,
    y: yData,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: color, width: 4 },
    marker: { color: color, size: 6 },
    name: title,
    hovertemplate: `<b>Day %{x}</b><br>%{y}<extra></extra>`,
    hoverlabel: {
      bgcolor: color,
      font: { size: 16, color: 'white', family: 'system-ui' }
    }
  }

  // Add event markers as scatter points (visible, with hover)
  const eventTraces = events
    .filter(event => event.impacts && event.impacts[yKey] !== undefined)
    .map(event => {
      // Find closest y value at this event's day
      const idx = xData.findIndex(x => x >= event.simDay)
      const yValue = idx >= 0 ? yData[idx] : (yData.length > 0 ? yData[yData.length - 1] : 0)

      return {
        x: [event.simDay],
        y: [yValue],
        type: 'scatter',
        mode: 'markers',
        marker: {
          size: 15,
          color: 'rgba(231, 76, 60, 0.9)',
          symbol: 'circle',
          line: { color: 'white', width: 3 }
        },
        name: event.name,
        hovertemplate: `<b>${event.name}</b><br>Day ${event.simDay}<br>${event.description || ''}<extra></extra>`,
        hoverlabel: {
          bgcolor: '#e74c3c',
          font: { size: 16, color: 'white', family: 'system-ui' }
        },
        showlegend: false
      }
    })

  const allTraces = [mainTrace, ...eventTraces]

  // Add threshold lines as shapes
  const shapes = thresholds.map(t => ({
    type: 'line',
    x0: 0,
    x1: maxX,
    y0: t.value,
    y1: t.value,
    line: {
      color: t.color,
      width: 3,
      dash: 'dash'
    }
  }))

  // Only threshold labels (no event text)
  const annotations = thresholds.map(t => ({
    x: maxX * 0.85,
    y: t.value,
    text: t.label,
    showarrow: false,
    font: {
      color: t.color,
      size: 15,
      family: 'system-ui',
      weight: 700
    },
    xanchor: 'left',
    yanchor: 'bottom',
    bgcolor: 'rgba(255, 255, 255, 0.95)',
    borderpad: 5
  }))

  const layout = {
    height: 240,
    margin: { l: 80, r: 30, t: 15, b: 55 },
    xaxis: {
      title: {
        text: 'Simulation Days',
        font: { size: 15 }
      },
      color: '#2c3e50',
      gridcolor: '#d5dce0',
      showgrid: true,
      zeroline: false,
      tickfont: { size: 14 }
    },
    yaxis: {
      type: isLog ? 'log' : 'linear',
      color: '#2c3e50',
      gridcolor: '#d5dce0',
      showgrid: true,
      zeroline: false,
      range: isLog ? undefined : [yMin, yMax],
      tickfont: { size: 14 }
    },
    shapes: shapes,
    annotations: annotations,
    paper_bgcolor: 'rgba(255,255,255,0)',
    plot_bgcolor: 'rgba(255,255,255,0)',
    font: {
      color: '#2c3e50',
      family: 'system-ui, -apple-system, sans-serif',
      size: 14
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
        data={allTraces}
        layout={layout}
        config={config}
        style={{ width: '100%' }}
        useResizeHandler={true}
      />
    </div>
  )
}
