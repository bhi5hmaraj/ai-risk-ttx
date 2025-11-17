/**
 * Parse and execute effects code from JSON data
 *
 * Effects are specified as simple code strings like:
 * "compute_flop: globalState.compute_flop * 3.4; capability_level: 'GPT-5 level'"
 */

export function parseAndExecuteEffects(effectsCode, globalState) {
  if (!effectsCode) return globalState

  const updates = {}

  // Split by semicolon to get individual assignments
  const assignments = effectsCode.split(';').map(s => s.trim()).filter(s => s)

  for (const assignment of assignments) {
    // Parse "key: value" format
    const [key, value] = assignment.split(':').map(s => s.trim())

    if (!key || !value) continue

    // Evaluate the value expression
    // Create a safe evaluation context with only globalState and Math
    try {
      const evalFunc = new Function('globalState', 'Math', `return ${value}`)
      updates[key] = evalFunc(globalState, Math)
    } catch (error) {
      console.error(`Failed to evaluate effect: ${assignment}`, error)
    }
  }

  return {
    ...globalState,
    ...updates
  }
}

/**
 * Parse and execute condition code from JSON data
 *
 * Conditions are specified as code strings that return boolean:
 * "globalState.compute_flop >= 1e26"
 */
export function parseAndExecuteCondition(conditionCode, globalState) {
  if (!conditionCode) return true

  try {
    const evalFunc = new Function('globalState', 'Math', `return ${conditionCode}`)
    return evalFunc(globalState, Math)
  } catch (error) {
    console.error(`Failed to evaluate condition: ${conditionCode}`, error)
    return false
  }
}
