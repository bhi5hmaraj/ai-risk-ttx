import { useState } from 'react';
import useSimulationStore from '../store/useSimulationStore';
import StateMachineFlowchart from './StateMachineFlowchart';

function CurrentStatePanel() {
  const simState = useSimulationStore((state) => state.simState);
  const isPlaying = useSimulationStore((state) => state.isPlaying);
  const play = useSimulationStore((state) => state.play);
  const pause = useSimulationStore((state) => state.pause);
  const reset = useSimulationStore((state) => state.reset);
  const setSpeedMultiplier = useSimulationStore((state) => state.setSpeedMultiplier);
  const speed = useSimulationStore((state) => state.speed);
  const [showFlowchart, setShowFlowchart] = useState(true);

  if (!simState) return null;

  const isEnded = simState.isEnded || false;
  const isAtBranchPoint = simState.isAtBranchPoint || false;

  return (
    <>
      {/* Playback Controls */}
      <div className="panel">
        <div className="panel-title">Controls</div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {!isPlaying ? (
            <button
              onClick={play}
              className="primary"
              disabled={isEnded || isAtBranchPoint}
              style={{ flex: 1 }}
            >
              ▶ Play
            </button>
          ) : (
            <button onClick={pause} style={{ flex: 1 }}>
              ⏸ Pause
            </button>
          )}
          <button onClick={reset}>
            ↻ Reset
          </button>
        </div>

        {/* Speed Controls */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#8e8e8e' }}>
            Speed
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0.5, 1, 2, 5].map((mult) => (
              <button
                key={mult}
                onClick={() => setSpeedMultiplier(mult)}
                style={{
                  flex: 1,
                  fontSize: '12px',
                  background: Math.abs(speed / (36 / 300) - mult) < 0.1 ? '#4ecdc4' : undefined,
                  color: Math.abs(speed / (36 / 300) - mult) < 0.1 ? '#0a0e1a' : undefined,
                }}
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        {isEnded && (
          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: '#e74c3c',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            Simulation Ended: {simState.currentState.ending_type}
          </div>
        )}

        {isAtBranchPoint && (
          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: '#ff6b6b',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            ⚠️ Make a Choice Below
          </div>
        )}
      </div>

      {/* Current State Info / Flowchart Toggle */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="panel-title">{showFlowchart ? 'State Flowchart' : 'Current State'}</div>
          <button
            onClick={() => setShowFlowchart(!showFlowchart)}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
            }}
          >
            {showFlowchart ? 'Details' : 'Flowchart'}
          </button>
        </div>

        {showFlowchart ? (
          <StateMachineFlowchart />
        ) : (
          <>
            <h3 style={{
              color: '#4ecdc4',
              fontSize: '18px',
              marginBottom: '12px',
              lineHeight: 1.3,
            }}>
              {simState.currentState.name}
            </h3>

            <p style={{
              color: '#e0e0e0',
              lineHeight: 1.6,
              fontSize: '14px',
              marginBottom: '12px',
            }}>
              {simState.currentState.description}
            </p>

            <div style={{
              fontSize: '12px',
              color: '#8e8e8e',
              paddingTop: '12px',
              borderTop: '1px solid #2c3e50',
            }}>
              <div style={{ marginBottom: '6px' }}>
                <strong>Phase:</strong> {simState.currentState.phase}
              </div>
              <div>
                <strong>Time in state:</strong> {simState.stateElapsedMonths.toFixed(1)} months
              </div>
            </div>
          </>
        )}
      </div>

      {/* Key Variables */}
      <div className="panel">
        <div className="panel-title">Key Variables</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* AI R&D Multiplier */}
          <div>
            <div style={{ fontSize: '12px', color: '#8e8e8e', marginBottom: '4px' }}>
              AI R&D Multiplier
            </div>
            <div className={`variable-display ${simState.variables.ai_rd_multiplier > 20 ? 'critical' : simState.variables.ai_rd_multiplier > 10 ? 'warning' : ''}`}
                 style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {simState.variables.ai_rd_multiplier.toFixed(2)}x
            </div>
          </div>

          {/* GDP Growth */}
          <div>
            <div style={{ fontSize: '12px', color: '#8e8e8e', marginBottom: '4px' }}>
              GDP Growth Rate
            </div>
            <div className={`variable-display ${simState.variables.gdp_growth_rate > 0.5 ? 'good' : simState.variables.gdp_growth_rate < -0.05 ? 'critical' : ''}`}
                 style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {(simState.variables.gdp_growth_rate * 100).toFixed(1)}%
            </div>
          </div>

          {/* Job Loss */}
          <div>
            <div style={{ fontSize: '12px', color: '#8e8e8e', marginBottom: '4px' }}>
              Job Loss Rate
            </div>
            <div className={`variable-display ${simState.variables.public_job_loss_rate > 0.5 ? 'critical' : simState.variables.public_job_loss_rate > 0.2 ? 'warning' : ''}`}
                 style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {(simState.variables.public_job_loss_rate * 100).toFixed(1)}%
            </div>
          </div>

          {/* Misalignment Risk */}
          <div>
            <div style={{ fontSize: '12px', color: '#8e8e8e', marginBottom: '4px' }}>
              Misalignment Risk Score
            </div>
            <div className={`variable-display ${simState.variables.misalignment_risk_score > 0.7 ? 'critical' : simState.variables.misalignment_risk_score > 0.4 ? 'warning' : ''}`}
                 style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {(simState.variables.misalignment_risk_score * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CurrentStatePanel;
