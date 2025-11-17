import useSimulationStore from '../store/useSimulationStore';

function StateInfoPanel() {
  const simState = useSimulationStore((state) => state.simState);

  if (!simState?.currentState) return null;

  const { name, date, description, phase } = simState.currentState;

  const phaseColors = {
    main: '#4ecdc4',
    branch_point: '#ff6b6b',
    race: '#e74c3c',
    slowdown: '#2ecc71',
  };

  return (
    <div className="panel">
      <div className="panel-title">Current State</div>

      <div className="state-info">
        <h3 style={{ color: phaseColors[phase] || '#4ecdc4' }}>
          {name}
        </h3>
        <p style={{ fontSize: '13px', color: '#8e8e8e', marginBottom: '10px' }}>
          {date}
        </p>
        <p>{description}</p>
      </div>

      <div style={{ fontSize: '12px', color: '#8e8e8e', marginTop: '10px' }}>
        Phase: <span style={{ color: phaseColors[phase] }}>{phase}</span>
      </div>
    </div>
  );
}

export default StateInfoPanel;
