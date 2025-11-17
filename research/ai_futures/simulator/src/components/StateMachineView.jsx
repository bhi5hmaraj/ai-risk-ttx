import useSimulationStore from '../store/useSimulationStore';

function StateMachineView() {
  const simState = useSimulationStore((state) => state.simState);

  // TODO: Implement react-flow visualization
  // This is a placeholder

  return (
    <div style={{ height: '100%', padding: '20px', overflow: 'auto' }}>
      <h2 style={{ color: '#4ecdc4', marginBottom: '20px' }}>
        State Machine View
      </h2>
      <p style={{ color: '#8e8e8e', marginBottom: '20px' }}>
        Interactive state machine visualization will be implemented here using react-flow.
      </p>

      <div style={{ background: '#1a1f3a', padding: '20px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#4ecdc4' }}>Current State:</strong>{' '}
          {simState?.currentState?.id}
        </div>
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#4ecdc4' }}>Phase:</strong>{' '}
          {simState?.currentState?.phase}
        </div>
        <div>
          <strong style={{ color: '#4ecdc4' }}>Progress:</strong>{' '}
          {(simState?.progress * 100).toFixed(1)}%
        </div>
      </div>

      <div style={{ marginTop: '20px', color: '#8e8e8e', fontSize: '14px' }}>
        <p>Coming soon:</p>
        <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
          <li>Interactive node graph showing all states</li>
          <li>Highlight current state and completed path</li>
          <li>Show available transitions</li>
          <li>Click nodes to see detailed information</li>
        </ul>
      </div>
    </div>
  );
}

export default StateMachineView;
