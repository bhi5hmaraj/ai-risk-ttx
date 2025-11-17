import React, { useState, useEffect, useCallback } from 'react'
import { ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'
import SetupScreen from './components/SetupScreen'
import StateMachineVisualizer from './components/StateMachineVisualizer'
import ControlPanel from './components/ControlPanel'
import GlobalStateDisplay from './components/GlobalStateDisplay'
import TimeSeriesGraphs from './components/TimeSeriesGraphs'
import { STATES, INITIAL_GLOBAL_STATE, createTimeScale } from './model'
import './App.css'

function App() {
  // Simulation state
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [currentStateId, setCurrentStateId] = useState('current_2024')
  const [globalState, setGlobalState] = useState(INITIAL_GLOBAL_STATE)
  const [timeScale, setTimeScale] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [history, setHistory] = useState([])
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

    // Handle choice-based transitions
    if (transition.type === 'choice' && choiceId) {
      const choice = transition.choices.find(c => c.id === choiceId)
      if (!choice) return

      targetStateId = choice.targetState || transition.to
      effects = choice.effects || effects

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

    // Handle probabilistic transitions
    if (transition.type === 'probabilistic') {
      const prob = transition.baseProbability || 0.5
      if (Math.random() > prob) {
        // Failed probability roll
        return
      }
    }

    // Apply effects and transition
    const newGlobalState = effects(globalState)
    setGlobalState(newGlobalState)
    setCurrentStateId(targetStateId)

    setHistory(prev => [...prev, {
      timestamp: newGlobalState.simDays,
      stateId: targetStateId,
      globalState: newGlobalState,
      event: `${transition.trigger}`,
      transitionId: transition.id,
    }])

    setPendingChoice(null)
  }, [currentStateId, globalState])

  // Check if we've reached an end state
  const currentState = STATES[currentStateId]
  const isGameOver = currentState?.isEndState

  if (!isSetupComplete) {
    return <SetupScreen onComplete={handleSetupComplete} />
  }

  return (
    <ReactFlowProvider>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div>
              <h1>AI2027 State Machine Visualizer</h1>
              <p className="subtitle">
                Interactive representation of Kokotajlo & Alexander's AGI timeline forecast
              </p>
            </div>
            <div className="sim-time-display">
              <div className="sim-days-counter">
                <span className="label">Simulation Day</span>
                <span className="value">{Math.floor(globalState.simDays)}</span>
              </div>
              <div className="sim-date-display">
                {globalState.simDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </header>

        <div className="app-content">
          {/* Left: State machine visualization */}
          <div className="visualizer-container">
            <StateMachineVisualizer
              currentStateId={currentStateId}
              history={history}
              onSelectState={setCurrentStateId}
            />
          </div>

          {/* Right: Controls and state */}
          <div className="side-panel">
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

            <GlobalStateDisplay globalState={globalState} />

            <TimeSeriesGraphs history={history} globalState={globalState} />
          </div>
        </div>

        {isGameOver && (
          <div className="game-over-overlay">
            <div className="game-over-modal">
              <h2>{currentState.name}</h2>
              <p>{currentState.description}</p>
              <p className="outcome-type">
                Outcome: {currentState.outcomeType === 'catastrophic' ? '💀 Catastrophic' : '⚠️  Success (with caveats)'}
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
