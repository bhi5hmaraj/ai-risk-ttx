import React, { useState, useEffect, useCallback } from 'react'
import { ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'
import TutorialModal from './components/TutorialModal'
import SetupScreen from './components/SetupScreen'
import StateMachineVisualizer from './components/StateMachineVisualizer'
import ControlPanel from './components/ControlPanel'
import GlobalStateDisplay from './components/GlobalStateDisplay'
import TimeSeriesGraphs from './components/TimeSeriesGraphs'
import { STATES, INITIAL_GLOBAL_STATE, createTimeScale } from './model'
import './App.css'

function App() {
  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(true)

  // Simulation state
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [currentStateId, setCurrentStateId] = useState('current_2024')
  const [globalState, setGlobalState] = useState(INITIAL_GLOBAL_STATE)
  const [timeScale, setTimeScale] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [history, setHistory] = useState([])
  const [events, setEvents] = useState([]) // NEW: Track all events
  const [unlockedStates, setUnlockedStates] = useState(new Set(['current_2024'])) // NEW: Progressive disclosure
  const [pendingChoice, setPendingChoice] = useState(null)

  // Handle setup completion
  const handleSetupComplete = useCallback((config) => {
    const scale = createTimeScale(config.totalSimDays, config.totalWallSeconds)
    setTimeScale(scale)
    setIsSetupComplete(true)
    setHistory([{
      timestamp: 0,
      stateId: 'current_2024',
      globalState: INITIAL_GLOBAL_STATE,
      event: 'Simulation started'
    }])
    setEvents([{
      simDay: 0,
      name: 'Simulation Started',
      description: 'Beginning at GPT-4 level, late 2024',
      impacts: {}
    }])
  }, [])

  // Time progression (runs every second when playing)
  useEffect(() => {
    if (!isPlaying || !timeScale || !isSetupComplete) return

    const interval = setInterval(() => {
      setGlobalState(prev => {
        const newSimDays = prev.simDays + timeScale.simDaysPerSecond
        const newDate = new Date(prev.simDate)
        newDate.setDate(newDate.getDate() + timeScale.simDaysPerSecond)

        return {
          ...prev,
          simDays: newSimDays,
          simDate: newDate,
        }
      })
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [isPlaying, timeScale, isSetupComplete])

  // Handle state transition
  const handleTransition = useCallback((transition, choiceId = null) => {
    let targetStateId = transition.to
    let effects = transition.effects || ((s) => s)
    let eventDescription = transition.label || transition.trigger || 'Transition occurred'

    // Handle choice-based transitions
    if (transition.type === 'choice' && choiceId) {
      const choice = transition.choices?.find(c => c.id === choiceId)
      if (!choice) {
        // For new format: choices are separate transitions
        targetStateId = transition.to
        eventDescription = transition.label
      } else {
        // Old format with nested choices
        targetStateId = choice.targetState || transition.to
        effects = choice.effects || effects
        eventDescription = choice.label

        // Handle probabilistic outcomes within choice
        if (choice.outcomes) {
          const roll = Math.random()
          let cumProb = 0
          for (const outcome of choice.outcomes) {
            cumProb += outcome.probability
            if (roll < cumProb) {
              targetStateId = outcome.targetState
              effects = outcome.effects
              break
            }
          }
        } else if (choice.probability < 1.0) {
          // Simple probability check
          if (Math.random() > choice.probability) {
            // Failed - stay in current state
            setHistory(prev => [...prev, {
              timestamp: globalState.simDays,
              stateId: currentStateId,
              globalState,
              event: `${choice.label} failed (rolled above ${choice.probability})`
            }])
            setPendingChoice(null)
            return
          }
        }
      }
    }

    // Handle probabilistic transitions
    if (transition.type === 'probabilistic') {
      const prob = transition.baseProbability || 0.5
      if (Math.random() > prob) {
        // Failed probability roll
        return
      }
    }

    // Apply effects and transition
    const oldGlobalState = globalState
    const newGlobalState = effects(globalState)
    setGlobalState(newGlobalState)
    setCurrentStateId(targetStateId)

    // Calculate impacts for event tracking
    const impacts = {}
    if (oldGlobalState.compute_flop !== newGlobalState.compute_flop) {
      impacts.compute_flop = newGlobalState.compute_flop - oldGlobalState.compute_flop
    }
    if (oldGlobalState.safety_margin !== newGlobalState.safety_margin) {
      impacts.safety_margin = newGlobalState.safety_margin - oldGlobalState.safety_margin
    }
    if (oldGlobalState.race_pressure !== newGlobalState.race_pressure) {
      impacts.race_pressure = newGlobalState.race_pressure - oldGlobalState.race_pressure
    }
    if (oldGlobalState.alignment_investment !== newGlobalState.alignment_investment) {
      impacts.alignment_investment = newGlobalState.alignment_investment - oldGlobalState.alignment_investment
    }

    // Add to history
    setHistory(prev => [...prev, {
      timestamp: newGlobalState.simDays,
      stateId: targetStateId,
      globalState: newGlobalState,
      event: eventDescription,
      transitionId: transition.id,
    }])

    // Add to events (for graph markers)
    setEvents(prev => [...prev, {
      simDay: newGlobalState.simDays,
      name: eventDescription,
      description: transition.description || transition.citation || '',
      impacts,
      stateId: targetStateId
    }])

    // Unlock target state for progressive disclosure
    setUnlockedStates(prev => new Set([...prev, targetStateId]))

    setPendingChoice(null)
  }, [currentStateId, globalState])

  // Check if we've reached an end state
  const currentState = STATES[currentStateId]
  const isGameOver = currentState?.isEndState

  // Calculate completion percentage
  const completionPercentage = timeScale ? Math.min(100, (globalState.simDays / timeScale.totalSimDays) * 100) : 0

  if (showTutorial && !isSetupComplete) {
    return <TutorialModal onClose={() => setShowTutorial(false)} />
  }

  if (!isSetupComplete) {
    return <SetupScreen onComplete={handleSetupComplete} />
  }

  return (
    <ReactFlowProvider>
      <div className="app">
        <header className="app-header">
          <div className="header-row-1">
            <h1>AI2027 Interactive Forecast</h1>
            <div className="completion-indicator">
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${completionPercentage}%` }}></div>
              </div>
              <span className="progress-text">
                {completionPercentage.toFixed(1)}% Complete | Day {Math.floor(globalState.simDays)} / {timeScale?.totalSimDays || 1095}
              </span>
            </div>
          </div>
          <div className="header-row-2">
            <div className="sim-date">
              {globalState.simDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className="current-state-badge">
              Current: {currentState?.name || 'Unknown'}
            </div>
          </div>
        </header>

        <div className="app-content-single-pane">
          {/* Left Column: State Machine + Controls */}
          <div className="left-column">
            <div className="state-machine-section">
              <h2>State Machine</h2>
              <StateMachineVisualizer
                currentStateId={currentStateId}
                history={history}
                unlockedStates={unlockedStates}
                onSelectState={setCurrentStateId}
              />
            </div>

            <div className="controls-section">
              <ControlPanel
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                currentState={currentState}
                globalState={globalState}
                timeScale={timeScale}
                onTransition={handleTransition}
                isGameOver={isGameOver}
                pendingChoice={pendingChoice}
                onSetPendingChoice={setPendingChoice}
              />
            </div>

            <div className="state-display-section">
              <GlobalStateDisplay globalState={globalState} />
            </div>
          </div>

          {/* Right Column: Time Series Graphs with Event Markers */}
          <div className="right-column">
            <h2>Impact Over Time</h2>
            <TimeSeriesGraphs
              history={history}
              globalState={globalState}
              events={events}
            />
          </div>
        </div>

        {isGameOver && (
          <div className="game-over-overlay">
            <div className="game-over-modal">
              <h2>{currentState.name}</h2>
              <p>{currentState.description}</p>
              <p className="outcome-type">
                Outcome: {
                  currentState.outcomeType === 'catastrophic' ? '💀 Catastrophic' :
                  currentState.outcomeType === 'success' ? '✅ Success' :
                  '⚠️ Mixed'
                }
              </p>
              <button onClick={() => window.location.reload()}>
                Restart Simulation
              </button>
            </div>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  )
}

export default App
