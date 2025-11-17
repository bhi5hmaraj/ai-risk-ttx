import { useEffect, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import useSimulationStore from '../store/useSimulationStore';

function GraphsPanel() {
  const simState = useSimulationStore((state) => state.simState);
  const [selectedVar, setSelectedVar] = useState('ai_rd_multiplier');

  if (!simState || !simState.history || simState.history.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#8e8e8e', textAlign: 'center' }}>
        <p>Waiting for simulation data...</p>
        <p style={{ fontSize: '12px', marginTop: '10px' }}>Press Play to start</p>
      </div>
    );
  }

  // Extract time series data
  const timeData = simState.history.map(h => h.simTimeMonths);

  // Variable configurations with colors
  const varConfigs = {
    ai_rd_multiplier: {
      label: 'AI R&D Multiplier',
      color: '#ff6b6b',
      yaxis: 'linear',
    },
    gdp_growth_rate: {
      label: 'GDP Growth Rate (%)',
      color: '#51cf66',
      yaxis: 'linear',
      scale: 100, // Convert to percentage
    },
    public_job_loss_rate: {
      label: 'Job Loss Rate (%)',
      color: '#ffa94d',
      yaxis: 'linear',
      scale: 100,
    },
    misalignment_risk_score: {
      label: 'Misalignment Risk (%)',
      color: '#ff6b6b',
      yaxis: 'linear',
      scale: 100,
    },
  };

  const config = varConfigs[selectedVar];
  const scale = config.scale || 1;

  // Get data for selected variable
  const yData = simState.history.map(h => h.variables[selectedVar] * scale);

  // Extract events (state transitions)
  const events = [];
  for (let i = 1; i < simState.history.length; i++) {
    const prev = simState.history[i - 1];
    const curr = simState.history[i];
    if (prev.currentStateId !== curr.currentStateId) {
      events.push({
        time: curr.simTimeMonths,
        label: curr.currentStateName,
        type: 'state_transition',
      });
    }
  }

  // Create trace for the variable
  const trace = {
    x: timeData,
    y: yData,
    type: 'scatter',
    mode: 'lines',
    name: config.label,
    line: {
      color: config.color,
      width: 2,
    },
    fill: 'tozeroy',
    fillcolor: config.color + '30', // Add transparency
    hovertemplate: `<b>${config.label}</b><br>` +
                    `Month: %{x:.1f}<br>` +
                    `Value: %{y:.2f}<br>` +
                    `<extra></extra>`,
  };

  // Create event markers
  const eventShapes = events.map(event => ({
    type: 'line',
    x0: event.time,
    x1: event.time,
    y0: 0,
    y1: 1,
    yref: 'paper',
    line: {
      color: '#4ecdc4',
      width: 2,
      dash: 'dot',
    },
  }));

  const eventAnnotations = events.map((event, i) => ({
    x: event.time,
    y: 1,
    yref: 'paper',
    text: event.label,
    showarrow: false,
    textangle: -45,
    xanchor: 'left',
    yanchor: 'bottom',
    font: {
      size: 10,
      color: '#4ecdc4',
    },
  }));

  const layout = {
    autosize: true,
    margin: { l: 60, r: 40, t: 40, b: 60 },
    paper_bgcolor: '#1a1f3a',
    plot_bgcolor: '#0f1629',
    font: {
      color: '#e0e0e0',
      size: 12,
    },
    xaxis: {
      title: 'Simulation Time (months)',
      gridcolor: '#2c3e50',
      showgrid: true,
    },
    yaxis: {
      title: config.label,
      gridcolor: '#2c3e50',
      showgrid: true,
      type: config.yaxis,
    },
    shapes: eventShapes,
    annotations: eventAnnotations,
    hovermode: 'closest',
  };

  const plotConfig = {
    displayModeBar: false,
    responsive: true,
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px',
    }}>
      {/* Variable Selector */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px',
        flexWrap: 'wrap',
      }}>
        {Object.keys(varConfigs).map(key => (
          <button
            key={key}
            onClick={() => setSelectedVar(key)}
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              background: selectedVar === key ? '#4ecdc4' : undefined,
              color: selectedVar === key ? '#0a0e1a' : undefined,
            }}
          >
            {varConfigs[key].label}
          </button>
        ))}
      </div>

      {/* Graph */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Plot
          data={[trace]}
          layout={layout}
          config={plotConfig}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#8e8e8e',
        textAlign: 'center',
      }}>
        Dotted lines indicate state transitions. Hover over the graph for details.
      </div>
    </div>
  );
}

export default GraphsPanel;
