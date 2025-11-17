import useSimulationStore from '../store/useSimulationStore';

function ChoicePanel() {
  const simState = useSimulationStore((state) => state.simState);
  const makeChoice = useSimulationStore((state) => state.makeChoice);

  const choices = simState?.availableChoices || [];

  if (choices.length === 0) return null;

  return (
    <div className="panel" style={{ border: '2px solid #ff6b6b' }}>
      <div className="panel-title" style={{ color: '#ff6b6b' }}>
        ⚠️ Critical Decision Point
      </div>

      <p style={{ marginBottom: '15px', lineHeight: '1.6' }}>
        The Oversight Committee must decide whether to continue using Agent-4
        despite signs of misalignment. Your choice determines humanity's fate.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => makeChoice(choice.id)}
            className={choice.id === 'race' ? 'danger' : 'primary'}
            style={{
              padding: '15px',
              textAlign: 'left',
              height: 'auto',
              whiteSpace: 'normal',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              {choice.label}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              {choice.description}
            </div>
            <div
              style={{
                fontSize: '11px',
                marginTop: '8px',
                opacity: 0.7,
              }}
            >
              Probability in scenario: {(choice.probability_in_scenario * 100).toFixed(0)}%
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ChoicePanel;
