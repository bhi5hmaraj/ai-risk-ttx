import React, { useState } from 'react'
import './SetupScreen.css'

/**
 * Initial setup screen - configure simulation parameters
 */
export default function SetupScreen({ onComplete }) {
  const [simDays, setSimDays] = useState(1095) // Default: 1095 days (3 years, 2024-2027)
  const [wallMinutes, setWallMinutes] = useState(10) // Default: 10 minute playthrough

  const handleStart = () => {
    const totalWallSeconds = wallMinutes * 60

    onComplete({
      totalSimDays: simDays,
      totalWallSeconds,
      wallMinutes
    })
  }

  const daysPerSecond = simDays / (wallMinutes * 60)
  const simYears = (simDays / 365).toFixed(1)

  return (
    <div className="setup-screen">
      <div className="setup-modal">
        <h1>AI2027 State Machine Visualizer</h1>
        <p className="intro">
          This interactive visualizer represents the AI2027 forecast by Daniel Kokotajlo
          and Scott Alexander. It models the causal state machine underlying their prediction
          of AGI by 2027.
        </p>

        <div className="setup-form">
          <div className="form-group">
            <label htmlFor="simDays">
              Simulation Duration (days)
              <span className="help-text">How many simulation days to run ({simYears} years)</span>
            </label>
            <input
              id="simDays"
              type="range"
              min="365"
              max="1825"
              step="30"
              value={simDays}
              onChange={(e) => setSimDays(parseInt(e.target.value))}
            />
            <span className="value-display">{simDays} days (~{simYears} years, Late 2024 - {2024 + parseFloat(simYears)})</span>
          </div>

          <div className="form-group">
            <label htmlFor="wallMinutes">
              Real-Time Duration (minutes)
              <span className="help-text">How long you want to play (wall clock time)</span>
            </label>
            <input
              id="wallMinutes"
              type="range"
              min="5"
              max="30"
              step="1"
              value={wallMinutes}
              onChange={(e) => setWallMinutes(parseInt(e.target.value))}
            />
            <span className="value-display">{wallMinutes} minutes</span>
          </div>

          <div className="time-scale-preview">
            <strong>Time Scale:</strong> {daysPerSecond.toFixed(2)} sim days per real second
            <br />
            <em>1 real minute = {(daysPerSecond * 60).toFixed(0)} sim days (~{(daysPerSecond * 60 / 30).toFixed(1)} sim months)</em>
          </div>

          <button className="start-button" onClick={handleStart}>
            Begin Simulation
          </button>
        </div>

        <div className="about">
          <h3>About this visualization</h3>
          <p>
            This tool visualizes the state machine extracted from AI2027's research.
            States, transitions, probabilities, and timelines come directly from their
            published forecasts.
          </p>
          <p>
            <strong>States:</strong> Current (2024) → GPT-5 Level → Race Dynamics → AGI → Superintelligence
          </p>
          <p>
            <strong>End States:</strong> Extinction (Race Ending) or Committee Control (Slowdown Ending)
          </p>
          <p className="citation">
            Source: <a href="https://ai-2027.com" target="_blank" rel="noopener noreferrer">ai-2027.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
