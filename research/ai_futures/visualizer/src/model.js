/**
 * AI2027 State Machine Model
 *
 * Logic layer - loads data from JSON files and provides helper functions
 * All data is externalized for easy maintenance
 */

import statesData from './data/states.json'
import transitionsData from './data/transitions.json'
import initialStateData from './data/initial_state.json'
import { parseAndExecuteEffects, parseAndExecuteCondition } from './utils/effectsParser'

// Export loaded data
export const STATES = statesData

// Convert date string to Date object for initial state
export const INITIAL_GLOBAL_STATE = {
  ...initialStateData,
  simDate: new Date(initialStateData.simDate)
}

// Process transitions to add runtime functions
export const TRANSITIONS = transitionsData.map(t => ({
  ...t,
  // Add conditions function
  conditions: t.conditionCode
    ? (globalState) => parseAndExecuteCondition(t.conditionCode, globalState)
    : undefined,

  // Add effects function
  effects: t.effectsCode
    ? (globalState) => parseAndExecuteEffects(t.effectsCode, globalState)
    : undefined,

  // Process choices if they exist
  choices: t.choices?.map(choice => ({
    ...choice,
    effects: choice.effectsCode
      ? (globalState) => parseAndExecuteEffects(choice.effectsCode, globalState)
      : undefined,
    outcomes: choice.outcomes?.map(outcome => ({
      ...outcome,
      effects: outcome.effectsCode
        ? (globalState) => parseAndExecuteEffects(outcome.effectsCode, globalState)
        : undefined,
    }))
  }))
}))

/**
 * Get available transitions from current state
 */
export function getAvailableTransitions(currentStateId, globalState) {
  return TRANSITIONS.filter(t => {
    if (t.from !== currentStateId) return false
    if (t.conditions && !t.conditions(globalState)) return false
    return true
  })
}

/**
 * Time scaling: map simulation days to wall clock seconds
 * User chooses total simulation duration (e.g., 1095 days = 3 years)
 * Then we map that to a reasonable wall clock time (e.g., 10 minutes = 600 seconds)
 *
 * Example: 1095 sim days / 600 wall seconds = 1.825 sim days per wall second
 */
export function createTimeScale(totalSimDays, totalWallSeconds) {
  return {
    simDaysPerSecond: totalSimDays / totalWallSeconds,
    secondsPerSimDay: totalWallSeconds / totalSimDays,
  }
}
