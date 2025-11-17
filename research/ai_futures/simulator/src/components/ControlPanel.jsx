import useSimulationStore from '../store/useSimulationStore';

function ControlPanel() {
  const isPlaying = useSimulationStore((state) => state.isPlaying);
  const simState = useSimulationStore((state) => state.simState);
  const play = useSimulationStore((state) => state.play);
  const pause = useSimulationStore((state) => state.pause);
  const reset = useSimulationStore((state) => state.reset);
  const setSpeedMultiplier = useSimulationStore((state) => state.setSpeedMultiplier);

  const isEnded = simState?.isEnded || false;
  const isAtBranchPoint = simState?.isAtBranchPoint || false;

  return (
    <div className="panel">
      <div className="panel-title">Simulation Controls</div>

      {/* Timeline */}
      <div className="timeline">
        <div className="timeline-label">{simState?.simDate}</div>
        <div className="timeline-bar">
          <div
            className="timeline-progress"
            style={{ width: `${(simState?.progress ?? 0) * 100}%` }}
          />
        </div>
        <div className="timeline-label">{simState?.simTimeMonths != null ? `${simState.simTimeMonths.toFixed(1)} mo` : '0.0 mo'}</div>
      </div>

      {/* Playback Controls */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        {!isPlaying ? (
          <button
            onClick={play}
            className="primary"
            disabled={isEnded || isAtBranchPoint}
          >
            ▶ Play
          </button>
        ) : (
          <button onClick={pause}>⏸ Pause</button>
        )}
        <button onClick={reset}>↻ Reset</button>
      </div>

      {/* Speed Controls */}
      <div style={{ marginTop: '15px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Speed
        </label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={() => setSpeedMultiplier(0.5)} style={{ fontSize: '12px' }}>
            0.5x
          </button>
          <button onClick={() => setSpeedMultiplier(1)} style={{ fontSize: '12px' }}>
            1x
          </button>
          <button onClick={() => setSpeedMultiplier(2)} style={{ fontSize: '12px' }}>
            2x
          </button>
          <button onClick={() => setSpeedMultiplier(5)} style={{ fontSize: '12px' }}>
            5x
          </button>
        </div>
      </div>

      {/* Status */}
      {isEnded && (
        <div
          style={{
            marginTop: '15px',
            padding: '10px',
            background: '#e74c3c',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}
        >
          Simulation Ended: {simState.currentState.ending_type}
        </div>
      )}

      {isAtBranchPoint && (
        <div
          style={{
            marginTop: '15px',
            padding: '10px',
            background: '#ff6b6b',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}
        >
          ⚠️ Decision Point - Make a choice below
        </div>
      )}
    </div>
  );
}

export default ControlPanel;
