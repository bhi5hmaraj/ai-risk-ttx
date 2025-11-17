import useSimulationStore from '../store/useSimulationStore';
import simulationModel from '../../simulation_model.json';

function VariablesView() {
  const simState = useSimulationStore((state) => state.simState);

  if (!simState) return null;

  const { variables } = simState;
  const varsConfig = simulationModel.variables_config;

  // Select key variables to display
  const keyVars = [
    'ai_rd_multiplier',
    'misalignment_risk_score',
    'public_job_loss_rate',
    'stock_market_index',
  ];

  const formatValue = (key, value) => {
    const config = varsConfig[key];
    if (!config) return value.toFixed(2);

    if (config.display_as_percentage) {
      return `${(value * 100).toFixed(1)}%`;
    }

    if (config.display_scale === 'log' && value > 100) {
      return value.toExponential(1);
    }

    return value.toFixed(2);
  };

  return (
    <div className="panel">
      <div className="panel-title">Key Variables</div>

      <div className="variables-grid">
        {keyVars.map((key) => {
          const config = varsConfig[key];
          const value = variables[key];

          return (
            <div key={key} className="variable-card">
              <div className="variable-label">{config.label}</div>
              <div className="variable-value" style={{ color: config.color }}>
                {formatValue(key, value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VariablesView;
