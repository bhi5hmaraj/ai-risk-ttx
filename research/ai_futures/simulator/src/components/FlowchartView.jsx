import useSimulationStore from '../store/useSimulationStore';

function FlowchartView() {
  const simState = useSimulationStore((state) => state.simState);

  // TODO: Implement flowchart visualization
  // This is a placeholder

  return (
    <div style={{ height: '100%', padding: '20px', overflow: 'auto' }}>
      <h2 style={{ color: '#4ecdc4', marginBottom: '20px' }}>
        Flowchart View
      </h2>
      <p style={{ color: '#8e8e8e', marginBottom: '20px' }}>
        Timeline flowchart visualization will be implemented here.
      </p>

      <div style={{ background: '#1a1f3a', padding: '20px', borderRadius: '8px' }}>
        <div>
          <strong style={{ color: '#4ecdc4' }}>Timeline:</strong>{' '}
          {simState?.simDate}
        </div>
      </div>

      <div style={{ marginTop: '20px', color: '#8e8e8e', fontSize: '14px' }}>
        <p>Coming soon:</p>
        <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
          <li>Linear timeline view from 2025-2030</li>
          <li>Branch point visualization</li>
          <li>Two ending paths clearly shown</li>
          <li>Key events marked on timeline</li>
        </ul>
      </div>
    </div>
  );
}

export default FlowchartView;
