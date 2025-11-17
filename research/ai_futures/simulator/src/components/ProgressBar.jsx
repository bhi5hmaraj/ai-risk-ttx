import useSimulationStore from '../store/useSimulationStore';

function ProgressBar() {
  const simState = useSimulationStore((state) => state.simState);

  if (!simState) return null;

  const progress = simState.progress || 0;
  const percentage = Math.round(progress * 100);
  const currentMonth = Math.round(simState.simTimeMonths);
  const totalMonths = 36; // 2025-2030 is ~5 years = 60 months, but scenario is 36 months

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
