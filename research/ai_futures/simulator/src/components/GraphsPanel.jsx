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

  // Create event shapes that cut through ALL graphs vertically
  const allShapes = events.map(event => ({
    type: 'line',
    x0: event.time,
    x1: event.time,
    y0: 0,
    y1: 1,
    yref: 'paper', // Use 'paper' to span the entire plot height
    line: {
      color: '#4ecdc4',
      width: 2,
      dash: 'dot',
    },
  }));

  // Create annotations at the top of the plot (visible across all graphs)
  const allAnnotations = events.map((event, i) => ({
    x: event.time,
    y: 1,
    yref: 'paper', // Position relative to entire plot area
    text: event.label.replace(/\d{4}:\s*/, ''), // Remove year prefix
    showarrow: false,
    textangle: -45,
    xanchor: 'left',
    yanchor: 'top',
    font: {
      size: 12,
      color: '#4ecdc4',
      weight: 'bold',
    },
  }));

  const layout = {
    autosize: true,
    margin: { l: 80, r: 40, t: 30, b: 60 },
    paper_bgcolor: '#1a1f3a',
    plot_bgcolor: '#0f1629',
    font: {
      color: '#e0e0e0',
      size: 13,
    },
    showlegend: false,
    // Graph 1: AI R&D Multiplier (top, 76.25% to 100% of height)
    xaxis: {
      title: '',
      gridcolor: '#2c3e50',
      showgrid: true,
      titlefont: { size: 14 },
      tickfont: { size: 13 },
    },
    yaxis: {
      title: { text: varConfigs[0].label, font: { size: 14, color: varConfigs[0].color } },
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[0].yaxis,
      domain: [0.7625, 1],
      titlefont: { size: 14 },
      tickfont: { size: 13 },
    },
    // Graph 2: GDP Growth Rate (51.25% to 73.75%)
    xaxis2: {
      title: '',
      gridcolor: '#2c3e50',
      showgrid: true,
      titlefont: { size: 14 },
      tickfont: { size: 13 },
    },
    yaxis2: {
      title: { text: varConfigs[1].label, font: { size: 14, color: varConfigs[1].color } },
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[1].yaxis,
      domain: [0.5125, 0.7375],
      titlefont: { size: 14 },
      tickfont: { size: 13 },
    },
    // Graph 3: Job Loss Rate (26.25% to 48.75%)
    xaxis3: {
      title: '',
      gridcolor: '#2c3e50',
      showgrid: true,
      titlefont: { size: 14 },
      tickfont: { size: 13 },
    },
    yaxis3: {
      title: { text: varConfigs[2].label, font: { size: 14, color: varConfigs[2].color } },
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[2].yaxis,
      domain: [0.2625, 0.4875],
      titlefont: { size: 14 },
      tickfont: { size: 13 },
    },
    // Graph 4: Misalignment Risk (bottom, 0% to 23.75%)
    xaxis4: {
      title: { text: 'Simulation Time (months)', font: { size: 14 } },
      gridcolor: '#2c3e50',
      showgrid: true,
      titlefont: { size: 14 },
      tickfont: { size: 13 },
    },
    yaxis4: {
      title: { text: varConfigs[3].label, font: { size: 14, color: varConfigs[3].color } },
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[3].yaxis,
      domain: [0, 0.2375],
      titlefont: { size: 14 },
      tickfont: { size: 13 },
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
        marginTop: '8px',
        fontSize: '12px',
        color: '#8e8e8e',
        textAlign: 'center',
      }}>
        Dotted lines indicate state transitions. Hover for details.
      </div>
    </div>
  );
}

export default GraphsPanel;
