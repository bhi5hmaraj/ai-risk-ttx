import { useState, useEffect } from 'react';
import useSimulationStore from '../store/useSimulationStore';

function ChoicesPanel() {
  const simState = useSimulationStore((state) => state.simState);
  const makeChoice = useSimulationStore((state) => state.makeChoice);
  const isPlaying = useSimulationStore((state) => state.isPlaying);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(null);

  if (!simState) return null;

  const isAtBranchPoint = simState.isAtBranchPoint || false;
  const isEnded = simState.isEnded || false;
  const currentState = simState.currentState;

  // Auto-play countdown when not at branch point
  useEffect(() => {
    if (!isAtBranchPoint && !isEnded && !isPlaying) {
      const countdown = 10;
      setAutoPlayCountdown(countdown);

      const interval = setInterval(() => {
        setAutoPlayCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Auto-play would start here
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setAutoPlayCountdown(null);
    }
  }, [isAtBranchPoint, isEnded, isPlaying]);

  // If ended, show ending info
  if (isEnded) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3 style={{ color: '#e74c3c', fontSize: '20px', marginBottom: '16px' }}>
          Simulation Ended: {currentState.ending_type}
        </h3>
        <p style={{ color: '#e0e0e0', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' }}>
          {currentState.description}
        </p>
      </div>
    );
  }

  // If at branch point, show choices
  if (isAtBranchPoint) {
    const choices = currentState.user_choices || [];

    if (choices.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#8e8e8e' }}>
          <p>Branch point reached but no choices defined.</p>
        </div>
      );
    }

    return (
      <div style={{ padding: '20px' }}>
        <h3 style={{
          color: '#ff6b6b',
          fontSize: '18px',
          marginBottom: '16px',
          textAlign: 'center',
        }}>
          ⚠️ Critical Decision Point - {currentState.name}
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}>
          {choices.map((choice) => (
            <div
              key={choice.id}
              style={{
                background: '#0f1629',
                border: '1px solid #2c3e50',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#4ecdc4';
                e.currentTarget.style.background = '#1a1f3a';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#2c3e50';
                e.currentTarget.style.background = '#0f1629';
              }}
              onClick={() => makeChoice(choice.id)}
            >
              <h4 style={{
                color: '#4ecdc4',
                fontSize: '16px',
                marginBottom: '10px',
              }}>
                {choice.label}
              </h4>
              <p style={{
                color: '#e0e0e0',
                fontSize: '13px',
                lineHeight: 1.5,
                marginBottom: '12px',
              }}>
                {choice.description}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  makeChoice(choice.id);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                }}
                className="primary"
              >
                Choose This Path →
              </button>
            </div>
          ))}
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: '13px',
          color: '#8e8e8e',
          fontStyle: 'italic',
        }}>
          Your choice will determine the future trajectory of the simulation
        </div>
      </div>
    );
  }

  // Default: Show what's coming next (automatic transition)
  const nextStates = currentState.auto_transitions || [];

  if (nextStates.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#51cf66', fontSize: '15px' }}>
          Simulation running... Next state will load automatically
        </p>
        {autoPlayCountdown && (
          <p style={{ color: '#8e8e8e', fontSize: '13px', marginTop: '8px' }}>
            Resuming in {autoPlayCountdown}s
          </p>
        )}
      </div>
    );
  }

  const nextState = nextStates[0]; // Usually only one automatic transition

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{
        color: '#4ecdc4',
        fontSize: '16px',
        marginBottom: '12px',
        textAlign: 'center',
      }}>
        What Happens Next?
      </h3>

      <div style={{
        background: '#0f1629',
        border: '1px solid #2c3e50',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
        }}>
          <div style={{
            fontSize: '24px',
            color: '#4ecdc4',
          }}>
            →
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              color: '#4ecdc4',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '4px',
            }}>
              Next State
            </div>
            <div style={{
              color: '#e0e0e0',
              fontSize: '13px',
            }}>
              {nextState.description || 'Automatic transition when conditions are met'}
            </div>
          </div>
        </div>

        <div style={{
          fontSize: '12px',
          color: '#8e8e8e',
          paddingTop: '12px',
          borderTop: '1px solid #2c3e50',
        }}>
          <strong>Condition:</strong> {nextState.condition || 'Time elapsed'}
        </div>
      </div>

      {autoPlayCountdown && (
        <div style={{
          textAlign: 'center',
          marginTop: '16px',
          fontSize: '13px',
          color: '#8e8e8e',
        }}>
          Simulation will resume automatically in {autoPlayCountdown}s
        </div>
      )}
    </div>
  );
}

export default ChoicesPanel;
