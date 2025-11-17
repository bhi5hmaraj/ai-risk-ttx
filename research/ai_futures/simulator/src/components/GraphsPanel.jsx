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

  // Create all traces with y-axis padding
  const traces = varConfigs.map((config, i) => {
    const yData = simState.history.map(h => h.variables[config.key] * config.scale);
    const maxY = Math.max(...yData);
    const minY = Math.min(...yData);

    return {
      x: timeData,
      y: yData,
      type: 'scatter',
      mode: 'lines',
      name: config.label,
      line: {
        color: config.color,
        width: 3,
      },
      fill: 'tozeroy',
      fillcolor: config.color + '30',
      hovertemplate: `<b>${config.label}</b><br>` +
                      `Month: %{x:.1f}<br>` +
                      `Value: %{y:.2f}<br>` +
                      `<extra></extra>`,
      maxY, // Store for y-axis range calculation
      minY,
    };
  });

  // Create event markers that cut through ALL graphs vertically (no text labels)
  const allShapes = events.map(event => ({
    type: 'line',
    x0: event.time,
    x1: event.time,
    y0: 0,
    y1: 1,
    yref: 'paper', // Use 'paper' to span the entire plot height
    line: {
      color: '#4ecdc4',
      width: 3,
      dash: 'dot',
    },
    // Note: Plotly shapes don't support native hover, so we'll add invisible traces instead
  }));

  // Create invisible scatter traces for event hover labels (one per event)
  const eventTraces = events.map((event, i) => ({
    x: [event.time],
    y: [0.5], // Middle of the plot
    yaxis: 'y', // All events on first y-axis for simplicity
    type: 'scatter',
    mode: 'markers',
    marker: {
      size: 0.1,
      color: 'rgba(0,0,0,0)', // Invisible
    },
    showlegend: false,
    hovertemplate: `<b>State Transition</b><br>${event.label}<br>Month: ${event.time.toFixed(1)}<extra></extra>`,
    hoverlabel: {
      bgcolor: '#4ecdc4',
      font: { size: 16, color: '#0a0e1a' },
    },
  }));

  const layout = {
    autosize: true,
    margin: { l: 100, r: 40, t: 20, b: 80 },
    paper_bgcolor: '#1a1f3a',
    plot_bgcolor: '#0f1629',
    font: {
      color: '#e0e0e0',
      size: 18, // Much bigger base font
    },
    showlegend: false,
    // Graph 1: AI R&D Multiplier (top, 76.25% to 100% of height)
    xaxis: {
      title: '',
      gridcolor: '#2c3e50',
      showgrid: true,
      titlefont: { size: 20 },
      tickfont: { size: 18 },
    },
    yaxis: {
      title: { text: varConfigs[0].label, font: { size: 20, color: varConfigs[0].color } },
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[0].yaxis,
      domain: [0.7625, 1],
      titlefont: { size: 20 },
      tickfont: { size: 18 },
      // Add 20% headroom for log scale
      ...(traces[0].maxY && { range: [Math.log10(traces[0].minY || 1) - 0.2, Math.log10(traces[0].maxY) + 0.3] }),
    },
    // Graph 2: GDP Growth Rate (51.25% to 73.75%)
    xaxis2: {
      title: '',
      gridcolor: '#2c3e50',
      showgrid: true,
      titlefont: { size: 20 },
      tickfont: { size: 18 },
    },
    yaxis2: {
      title: { text: varConfigs[1].label, font: { size: 20, color: varConfigs[1].color } },
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[1].yaxis,
      domain: [0.5125, 0.7375],
      titlefont: { size: 20 },
      tickfont: { size: 18 },
      // Add 20% headroom
      range: [Math.min(0, traces[1].minY - (traces[1].maxY - traces[1].minY) * 0.1), traces[1].maxY * 1.2],
    },
    // Graph 3: Job Loss Rate (26.25% to 48.75%)
    xaxis3: {
      title: '',
      gridcolor: '#2c3e50',
      showgrid: true,
      titlefont: { size: 20 },
      tickfont: { size: 18 },
    },
    yaxis3: {
      title: { text: varConfigs[2].label, font: { size: 20, color: varConfigs[2].color } },
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[2].yaxis,
      domain: [0.2625, 0.4875],
      titlefont: { size: 20 },
      tickfont: { size: 18 },
      // Add 20% headroom
      range: [Math.min(0, traces[2].minY - (traces[2].maxY - traces[2].minY) * 0.1), traces[2].maxY * 1.2],
    },
    // Graph 4: Misalignment Risk (bottom, 0% to 23.75%)
    xaxis4: {
      title: { text: 'Simulation Time (months)', font: { size: 20 } },
      gridcolor: '#2c3e50',
      showgrid: true,
      titlefont: { size: 20 },
      tickfont: { size: 18 },
    },
    yaxis4: {
      title: { text: varConfigs[3].label, font: { size: 20, color: varConfigs[3].color } },
      gridcolor: '#2c3e50',
      showgrid: true,
      type: varConfigs[3].yaxis,
      domain: [0, 0.2375],
      titlefont: { size: 20 },
      tickfont: { size: 18 },
      // Add 20% headroom
      range: [Math.min(0, traces[3].minY - (traces[3].maxY - traces[3].minY) * 0.1), traces[3].maxY * 1.2],
    },
    shapes: allShapes,
    hovermode: 'closest',
  };

  // Assign each trace to its subplot
  const tracesWithSubplots = traces.map((trace, i) => ({
    ...trace,
    xaxis: `x${i + 1}`,
    yaxis: `y${i + 1}`,
  }));

  // Combine data traces with event hover traces
  const allTraces = [...tracesWithSubplots, ...eventTraces];

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
          data={allTraces}
          layout={layout}
          config={plotConfig}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '10px',
        fontSize: '16px',
        color: '#8e8e8e',
        textAlign: 'center',
      }}>
        Dotted lines = state transitions. Hover over markers for details.
      </div>
    </div>
  );
}

export default GraphsPanel;
