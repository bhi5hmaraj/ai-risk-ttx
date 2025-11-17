import React from 'react'
import './GlobalStateDisplay.css'

export default function GlobalStateDisplay({ globalState }) {
  return (
    <div className="global-state-display">
      <h3>Global Variables</h3>
      <p className="subtitle">Key state variables from AI2027 DAG</p>

      <div className="state-section">
        <h4>Capabilities</h4>
        <StateVariable
          label="Compute (FLOP)"
          value={globalState.compute_flop.toExponential(1)}
          color="#64ffda"
        />
        <StateVariable
          label="Algorithmic Efficiency"
          value={globalState.algorithmic_efficiency.toFixed(2) + 'x'}
          color="#64ffda"
        />
        <StateVariable
          label="Capability Level"
          value={globalState.capability_level}
          color="#64ffda"
          isText
        />
      </div>

      <div className="state-section">
        <h4>Race Dynamics</h4>
        <StateBar
          label="US-China Relations"
          value={globalState.us_china_relations}
          color="#ed8936"
          lowLabel="Cooperative"
          highLabel="Adversarial"
        />
        <StateBar
          label="Race Pressure"
          value={globalState.race_pressure}
          color="#e94560"
          lowLabel="No Race"
          highLabel="Full Race"
        />
        <StateBar
          label="Espionage Risk"
          value={globalState.espionage_risk}
          color="#fc8181"
          lowLabel="Secure"
          highLabel="Vulnerable"
        />
      </div>

      <div className="state-section">
        <h4>Safety</h4>
        <StateBar
          label="Alignment Investment"
          value={globalState.alignment_investment}
          color="#48bb78"
          lowLabel="Low"
          highLabel="High"
        />
        <StateBar
          label="Safety Margin"
          value={globalState.safety_margin}
          color={globalState.safety_margin > 0.7 ? '#48bb78' : (globalState.safety_margin > 0.4 ? '#ed8936' : '#e94560')}
          lowLabel="Unsafe"
          highLabel="Safe"
          critical={globalState.safety_margin < 0.3}
        />
      </div>
    </div>
  )
}

function StateVariable({ label, value, color, isText = false }) {
  return (
    <div className="state-variable">
      <div className="variable-label">{label}</div>
      <div className="variable-value" style={{ color: color }}>
        {isText ? <span className="text-value">{value}</span> : value}
      </div>
    </div>
  )
}

function StateBar({ label, value, color, lowLabel, highLabel, critical = false }) {
  const percentage = Math.round(value * 100)

  return (
    <div className="state-bar">
      <div className="bar-header">
        <span className="bar-label">{label}</span>
        <span className="bar-value" style={{ color: color }}>{percentage}%</span>
      </div>
      <div className="bar-container">
        <div
          className={`bar-fill ${critical ? 'critical' : ''}`}
          style={{
            width: `${percentage}%`,
            background: color
          }}
        />
      </div>
      <div className="bar-labels">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}
