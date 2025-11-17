import { useState } from 'react';
import useSimulationStore from '../store/useSimulationStore';

function ConfigPanel({ onClose }) {
  const targetDurationMinutes = useSimulationStore((state) => state.targetDurationMinutes);
  const setTargetDuration = useSimulationStore((state) => state.setTargetDuration);
  const reset = useSimulationStore((state) => state.reset);

  const [duration, setDuration] = useState(targetDurationMinutes);

  const handleStart = () => {
    setTargetDuration(duration);
    reset();
    onClose();
  };

  return (
    <div className="config-modal-overlay">
      <div className="config-modal">
        <h2>Simulation Configuration</h2>

        <div className="config-field">
          <label>How long do you want to play? (minutes)</label>
          <input
            type="number"
            min="1"
            max="60"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
          />
          <p className="help-text">
            The simulation will cover 36 months (Apr 2025 - Apr 2028) in this time.
            You can pause and make choices at key decision points.
          </p>
        </div>

        <div className="config-field">
          <label>Calculated Speed</label>
          <p className="help-text">
            {(36 / (duration * 60)).toFixed(2)} sim months per second
          </p>
        </div>

        <div className="config-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleStart} className="primary">
            Start Simulation
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfigPanel;
