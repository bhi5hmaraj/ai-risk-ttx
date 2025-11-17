import React, { useMemo } from 'react'
import { getAvailableTransitions } from '../model'
import './ControlPanel.css'

export default function ControlPanel({
  isPlaying,
  onTogglePlay,
  currentState,
  globalState,
  timeScale,
  onTransition,
  isGameOver,
  pendingChoice,
  onSetPendingChoice,
}) {
  // Get available transitions from current state
  const availableTransitions = useMemo(() => {
    return getAvailableTransitions(currentState.id, globalState)
  }, [currentState.id, globalState])

  // Format date
  const formattedDate = globalState.simDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  return (
    <div className="control-panel">
      <div className="time-controls">
        <h3>Simulation Time</h3>
        <div className="time-display">
          <div className="date">{formattedDate}</div>
          <div className="days">Day {Math.floor(globalState.simDays)}</div>
        </div>

        <button
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={onTogglePlay}
          disabled={isGameOver}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        {timeScale && (
          <div className="time-scale-info">
            {timeScale.simDaysPerSecond.toFixed(2)} sim days/sec
          </div>
        )}
      </div>

      <div className="current-state-info">
        <h3>Current State</h3>
        <div className="state-card">
          <h4>{currentState.name}</h4>
          <p>{currentState.description}</p>
          {currentState.probability < 1.0 && (
            <div className="probability">
              AI2027 Forecast: {(currentState.probability * 100).toFixed(0)}% probability
            </div>
          )}
        </div>
      </div>

      <div className="available-transitions">
        <h3>Available Actions</h3>

        {availableTransitions.length === 0 && !isGameOver && (
          <p className="no-transitions">
            No actions available. Time must pass for transitions to become available.
          </p>
        )}

        {availableTransitions.map(transition => (
          <TransitionButton
            key={transition.id}
            transition={transition}
            globalState={globalState}
            onTransition={onTransition}
            pendingChoice={pendingChoice}
            onSetPendingChoice={onSetPendingChoice}
          />
        ))}

        {isGameOver && (
          <div className="game-over-message">
            <p>Simulation ended.</p>
            <p>Outcome: {currentState.name}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TransitionButton({ transition, globalState, onTransition, pendingChoice, onSetPendingChoice }) {
  // Automatic transitions: show info, trigger automatically
  if (transition.type === 'automatic') {
    const meetsConditions = !transition.conditions || transition.conditions(globalState)
    const hasTime = transition.timeRequired ? globalState.simDays >= transition.timeRequired : true

    return (
      <div className="transition-card automatic">
        <div className="transition-header">
          <span className="transition-type">⚙️ Automatic</span>
          <span className={`confidence confidence-${getConfidenceClass(transition.epistemicConfidence)}`}>
            {(transition.epistemicConfidence * 100).toFixed(0)}%
          </span>
        </div>
        <h4>{transition.trigger}</h4>
        <p className="mechanism">{transition.mechanism}</p>

        {transition.timeRequired && (
          <div className="time-required">
            Occurs after ~{transition.timeRequired} days
            {!hasTime && ` (${transition.timeRequired - Math.floor(globalState.simDays)} days remaining)`}
          </div>
        )}

        {meetsConditions && hasTime && (
          <button
            className="trigger-button"
            onClick={() => onTransition(transition)}
          >
            Trigger Now
          </button>
        )}

        <div className="citation">{transition.citation}</div>
      </div>
    )
  }

  // Probabilistic transitions: show roll button
  if (transition.type === 'probabilistic') {
    const meetsConditions = !transition.conditions || transition.conditions(globalState)
    const prob = transition.baseProbability || 0.5

    return (
      <div className="transition-card probabilistic">
        <div className="transition-header">
          <span className="transition-type">🎲 Probabilistic</span>
          <span className={`confidence confidence-${getConfidenceClass(transition.epistemicConfidence)}`}>
            {(transition.epistemicConfidence * 100).toFixed(0)}%
          </span>
        </div>
        <h4>{transition.trigger}</h4>
        <p className="mechanism">{transition.mechanism}</p>

        <div className="probability-info">
          Base probability: {(prob * 100).toFixed(0)}% per period
        </div>

        {meetsConditions && (
          <button
            className="roll-button"
            onClick={() => onTransition(transition)}
          >
            🎲 Roll ({(prob * 100).toFixed(0)}% chance)
          </button>
        )}

        <div className="citation">{transition.citation}</div>
      </div>
    )
  }

  // Choice transitions: show choice options
  if (transition.type === 'choice') {
    const isPending = pendingChoice?.transitionId === transition.id

    return (
      <div className="transition-card choice">
        <div className="transition-header">
          <span className="transition-type">🤔 Decision Point</span>
          <span className={`confidence confidence-${getConfidenceClass(transition.epistemicConfidence)}`}>
            {(transition.epistemicConfidence * 100).toFixed(0)}%
          </span>
        </div>
        <h4>{transition.trigger}</h4>
        <p className="mechanism">{transition.mechanism}</p>

        {!isPending && (
          <button
            className="make-choice-button"
            onClick={() => onSetPendingChoice({ transitionId: transition.id })}
          >
            Make Decision
          </button>
        )}

        {isPending && (
          <div className="choices">
            {transition.choices.map(choice => (
              <div key={choice.id} className="choice-option">
                <h5>{choice.label}</h5>
                <p>{choice.description}</p>
                {choice.probability < 1.0 && (
                  <div className="choice-probability">
                    Success chance: {(choice.probability * 100).toFixed(0)}%
                  </div>
                )}
                {choice.timeRequired && (
                  <div className="time-required">
                    ~{choice.timeRequired} days
                  </div>
                )}
                <button
                  className="choice-button"
                  onClick={() => onTransition(transition, choice.id)}
                >
                  Choose This
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="citation">{transition.citation}</div>
      </div>
    )
  }

  return null
}

function getConfidenceClass(confidence) {
  if (confidence > 0.6) return 'strong'
  if (confidence > 0.3) return 'moderate'
  if (confidence > 0) return 'weak'
  return 'contested'
}
