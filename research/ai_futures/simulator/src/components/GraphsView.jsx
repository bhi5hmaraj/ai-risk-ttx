import useSimulationStore from '../store/useSimulationStore';

function GraphsView() {
  const simState = useSimulationStore((state) => state.simState);

  // TODO: Implement plotly graphs
  // This is a placeholder

  return (
    <div style={{ height: '100%', padding: '20px', overflow: 'auto' }}>
      <h2 style={{ color: '#4ecdc4', marginBottom: '20px' }}>
        Variable Graphs
      </h2>
      <p style={{ color: '#8e8e8e', marginBottom: '20px' }}>
        Real-time plotly graphs will be implemented here showing all variables vs sim time.
      </p>

      <div style={{ background: '#1a1f3a', padding: '20px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#4ecdc4' }}>History Points:</strong>{' '}
          {simState?.history?.length || 0}
        </div>
        <div>
          <strong style={{ color: '#4ecdc4' }}>Current Time:</strong>{' '}
          {simState?.simTimeMonths.toFixed(1)} months
        </div>
      </div>

      <div style={{ marginTop: '20px', color: '#8e8e8e', fontSize: '14px' }}>
        <p>Coming soon:</p>
        <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
          <li>AI R&D Multiplier (log scale)</li>
          <li>Compute shares (US vs China)</li>
          <li>Stock Market Index</li>
          <li>GDP Growth Rate</li>
          <li>Job Displacement Rate</li>
          <li>Misalignment Risk Score</li>
          <li>All updating in real-time as simulation progresses</li>
        </ul>
      </div>
    </div>
  );
}

export default GraphsView;
