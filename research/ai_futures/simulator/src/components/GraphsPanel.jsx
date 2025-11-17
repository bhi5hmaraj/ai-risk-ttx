import { useEffect } from 'react';
import Plot from 'react-plotly.js';
import useSimulationStore from '../store/useSimulationStore';

function GraphsPanel() {
  const simState = useSimulationStore((state) => state.simState);

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

  // Variable configurations
  const varConfigs = [
    {
      key: 'ai_rd_multiplier',
      label: 'AI R&D Multiplier',
      color: '#ff6b6b',
      yaxis: 'log',
      scale: 1,
    },
    {
      key: 'gdp_growth_rate',
      label: 'GDP Growth Rate (%)',
      color: '#51cf66',
      yaxis: 'linear',
      scale: 100,
    },
    {
      key: 'public_job_loss_rate',
      label: 'Job Loss Rate (%)',
      color: '#ffa94d',
      yaxis: 'linear',
      scale: 100,
    },
    {
      key: 'misalignment_risk_score',
      label: 'Misalignment Risk (%)',
      color: '#e74c3c',
      yaxis: 'linear',
      scale: 100,
    },
  ];

  // Extract events (state transitions)
  const events = [];
  for (let i = 1; i < simState.history.length; i++) {
    const prev = simState.history[i - 1];
    const curr = simState.history[i];
    if (prev.currentStateId !== curr.currentStateId) {
      events.push({
        time: curr.simTimeMonths,
        label: curr.currentStateName,
        stateId: curr.currentStateId,
      });
    }
  }

  // Create a subplot for each variable
  const createTrace = (config) => {
    const yData = simState.history.map(h => h.variables[config.key] * config.scale);

    return {
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
      fillcolor: config.color + '30',
      hovertemplate: `<b>${config.label}</b><br>` +
                      `Month: %{x:.1f}<br>` +
                      `Value: %{y:.2f}<br>` +
                      `<extra></extra>`,
    };
  };

  // Create all traces
  const traces = varConfigs.map(config => createTrace(config));

  // Create event shapes and annotations for each subplot
  const createEventShapes = (row) => {
    return events.map(event => ({
      type: 'line',
      x0: event.time,
      x1: event.time,
      y0: 0,
      y1: 1,
      yref: `y${row > 1 ? row : ''} domain`,
      line: {
        color: '#4ecdc4',
        width: 2,
        dash: 'dot',
      },
    }));
  };

  const createEventAnnotations = (row) => {
    return events.map((event, i) => ({
      x: event.time,
      y: 1,
      yref: `y${row > 1 ? row : ''} domain`,
      text: event.label.replace(/\d{4}:\s*/, ''), // Remove year prefix
      showarrow: false,
      textangle: -45,
      xanchor: 'left',
      yanchor: 'bottom',
      font: {
        size: 9,
        color: '#4ecdc4',
      },
    }));
  };

  // Combine all shapes and annotations
  const allShapes = [
    ...createEventShapes(1),
    ...createEventShapes(2),
    ...createEventShapes(3),
    ...createEventShapes(4),
  ];

  const allAnnotations = [
    ...createEventAnnotations(1),
    ...createEventAnnotations(2),
    ...createEventAnnotations(3),
    ...createEventAnnotations(4),
  ];

  const layout = {
    autosize: true,
    margin: { l: 60, r: 40, t: 10, b: 40 },
    paper_bgcolor: '#1a1f3a',
    plot_bgcolor: '#0f1629',
    font: {
      color: '#e0e0e0',
      size: 11,
    },
    showlegend: false,
    grid: {
      rows: 2,
      columns: 2,
      pattern: 'independent',
      roworder: 'top to bottom',
    },
    xaxis: {
      title: '',
      gridcolor: '#2c3e50',
      showgrid: true,
      domain: [0, 0.48],
    },
    yaxis: {
      title: varConfigs[0].label,
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[0].yaxis,
      domain: [0.52, 1],
    },
    xaxis2: {
      title: '',
      gridcolor: '#2c3e50',
      showgrid: true,
      domain: [0.52, 1],
    },
    yaxis2: {
      title: varConfigs[1].label,
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[1].yaxis,
      domain: [0.52, 1],
    },
    xaxis3: {
      title: 'Simulation Time (months)',
      gridcolor: '#2c3e50',
      showgrid: true,
      domain: [0, 0.48],
    },
    yaxis3: {
      title: varConfigs[2].label,
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[2].yaxis,
      domain: [0, 0.48],
    },
    xaxis4: {
      title: 'Simulation Time (months)',
      gridcolor: '#2c3e50',
      showgrid: true,
      domain: [0.52, 1],
    },
    yaxis4: {
      title: varConfigs[3].label,
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[3].yaxis,
      domain: [0, 0.48],
    },
    shapes: allShapes,
    annotations: allAnnotations,
    hovermode: 'closest',
  };

  // Assign each trace to its subplot
  const tracesWithSubplots = traces.map((trace, i) => ({
    ...trace,
    xaxis: `x${i + 1}`,
    yaxis: `y${i + 1}`,
  }));

  const plotConfig = {
    displayModeBar: false,
    responsive: true,
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '8px',
    }}>
      {/* Graph Grid */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Plot
          data={tracesWithSubplots}
          layout={layout}
          config={plotConfig}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '4px',
        fontSize: '10px',
        color: '#8e8e8e',
        textAlign: 'center',
      }}>
        Dotted lines indicate state transitions. Hover for details.
      </div>
    </div>
  );
}

export default GraphsPanel;
