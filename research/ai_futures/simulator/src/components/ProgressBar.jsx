import useSimulationStore from '../store/useSimulationStore';

function ProgressBar() {
  const simState = useSimulationStore((state) => state.simState);
  const simDurationMonths = useSimulationStore((state) => state.simDurationMonths);

  if (!simState) return null;

  // Cap progress at 100%
  const progress = Math.min(simState.progress || 0, 1);
  const percentage = Math.round(progress * 100);
  const currentMonth = Math.min(Math.round(simState.simTimeMonths), simDurationMonths);
  const totalMonths = simDurationMonths; // User-configured duration

  return (
    <div className="progress-bar-container">
      <div className="progress-info">
        <span className="progress-label">
          Progress: <strong>{percentage}%</strong>
        </span>
        <span className="progress-time">
          Month {currentMonth} / {totalMonths}
        </span>
        <span className="progress-date">
          {simState.simDate}
        </span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
