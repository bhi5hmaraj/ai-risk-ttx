/**
 * Simulation Engine - Parsimonious to AI-2027 Research
 *
 * Handles:
 * - Time progression
 * - State transitions (automatic and user-triggered)
 * - Variable updates based on transitions
 * - Dynamic rate calculations
 */

import simulationModel from '../../simulation_model.json';

export class SimulationEngine {
  constructor() {
    this.model = simulationModel;
    this.maxSimMonths = 36; // Default duration, can be set dynamically
    this.reset();
  }

  setMaxSimMonths(months) {
    this.maxSimMonths = months;
  }

  reset() {
    this.currentState = this.model.initial_state.current_state_id;
    this.simTimeMonths = 0;
    this.variables = { ...this.model.initial_state.variables };
    this.history = [{
      time: 0,
      state: this.currentState,
      variables: { ...this.variables },
    }];
    this.stateElapsedMonths = 0;
    this.isRunning = false;
    this.hasEnded = false;
  }

  /**
   * Get current state object
   */
  getCurrentState() {
    return this.model.states.find(s => s.id === this.currentState);
  }

  /**
   * Get all available user choices (if at branch point)
   */
  getAvailableChoices() {
    const state = this.getCurrentState();
    return state?.user_choices || [];
  }

  /**
   * Check if we're at a branch point
   */
  isAtBranchPoint() {
    return this.getAvailableChoices().length > 0;
  }

  /**
   * Check if simulation has ended
   */
  isEnded() {
    const state = this.getCurrentState();
    return state?.is_end_state || false;
  }

  /**
   * Advance simulation by deltaMonths
   */
  step(deltaMonths) {
    if (this.isEnded()) {
      this.hasEnded = true;
      return false;
    }

    // Update time
    this.simTimeMonths += deltaMonths;
    this.stateElapsedMonths += deltaMonths;

    // Update variables dynamically based on current state
    this.updateVariablesDynamic(deltaMonths);

    // Check for automatic transitions
    this.checkAutomaticTransitions();

    // Record history
    this.recordHistory();

    return true;
  }

  /**
   * Update variables with dynamic rates
   */
  updateVariablesDynamic(deltaMonths) {
    const state = this.getCurrentState();

    // Dynamic updates based on state
    // These rates are derived from AI-2027 research

    // AI R&D multiplier grows exponentially once Agent-3+ is deployed
    if (this.variables.ai_rd_multiplier >= 4) {
      // After Agent-3, progress compounds rapidly
      const growthRate = 0.1; // 10% per month
      this.variables.ai_rd_multiplier *= Math.pow(1 + growthRate, deltaMonths);
    }

    // GDP growth accelerates with AI deployment
    if (this.currentState.includes('RACE') && this.simTimeMonths >= 30) {
      // Robot economy causes explosive GDP growth
      this.variables.gdp_growth_rate = Math.min(
        this.variables.gdp_growth_rate * 1.1,
        2.0 // Cap at 200% annual growth
      );
    }

    // Stock market follows GDP with some volatility
    if (state && !state.is_end_state) {
      const stockGrowth = 1 + (this.variables.gdp_growth_rate * deltaMonths / 12);
      this.variables.stock_market_index *= stockGrowth;
    }

    // Job loss accelerates as AI capabilities grow
    if (this.variables.ai_rd_multiplier > 10) {
      const jobLossRate = 0.05 * deltaMonths; // 5% per month
      this.variables.public_job_loss_rate = Math.min(
        this.variables.public_job_loss_rate + jobLossRate,
        0.80 // Cap at 80%
      );
    }

    // Public approval drops as job loss increases
    if (this.variables.public_job_loss_rate > 0.1) {
      const approvalDrop = -0.02 * deltaMonths;
      this.variables.openbrain_approval_rating = Math.max(
        this.variables.openbrain_approval_rating + approvalDrop,
        -0.60 // Floor at -60%
      );
    }

    // Misalignment risk grows with capability
    if (this.variables.ai_rd_multiplier > 4 && !this.currentState.includes('SLOWDOWN')) {
      const riskGrowth = 0.01 * deltaMonths;
      this.variables.misalignment_risk_score = Math.min(
        this.variables.misalignment_risk_score + riskGrowth,
        1.0
      );
    }
  }

  /**
   * Check if automatic transitions should trigger
   */
  checkAutomaticTransitions() {
    const state = this.getCurrentState();
    if (!state || !state.auto_transitions) return;

    for (const transition of state.auto_transitions) {
      if (this.evaluateCondition(transition.condition)) {
        this.transitionTo(transition.to);
        break;
      }
    }
  }

  /**
   * Evaluate transition condition
   */
  evaluateCondition(condition) {
    // Parse simple conditions like "time_elapsed >= 4"
    if (condition.includes('time_elapsed')) {
      const match = condition.match(/time_elapsed\s*(>=|<=|>|<|==)\s*(\d+)/);
      if (match) {
        const [, operator, value] = match;
        const threshold = parseFloat(value);

        switch (operator) {
          case '>=': return this.stateElapsedMonths >= threshold;
          case '<=': return this.stateElapsedMonths <= threshold;
          case '>': return this.stateElapsedMonths > threshold;
          case '<': return this.stateElapsedMonths < threshold;
          case '==': return this.stateElapsedMonths === threshold;
        }
      }
    }
    return false;
  }

  /**
   * User-triggered transition (for branch points)
   */
  makeChoice(choiceId) {
    const choices = this.getAvailableChoices();
    const choice = choices.find(c => c.id === choiceId);

    if (!choice) {
      throw new Error(`Invalid choice: ${choiceId}`);
    }

    this.transitionTo(choice.to);
  }

  /**
   * Transition to new state
   */
  transitionTo(newStateId) {
    const newState = this.model.states.find(s => s.id === newStateId);

    if (!newState) {
      throw new Error(`State not found: ${newStateId}`);
    }

    console.log(`Transitioning: ${this.currentState} -> ${newStateId}`);

    // Apply variable updates from new state
    if (newState.variable_updates) {
      Object.assign(this.variables, newState.variable_updates);
    }

    // Update state
    this.currentState = newStateId;
    this.stateElapsedMonths = 0;

    // Record transition in history
    this.recordHistory();
  }

  /**
   * Record current state in history
   */
  recordHistory() {
    const state = this.getCurrentState();
    this.history.push({
      simTimeMonths: this.simTimeMonths,
      currentStateId: this.currentState,
      currentStateName: state ? state.name : this.currentState,
      variables: { ...this.variables },
    });
  }

  /**
   * Get simulation progress (0-1)
   */
  getProgress() {
    const state = this.getCurrentState();
    if (!state) return 0;

    // Progress based on state duration
    if (state.duration_months > 0) {
      return Math.min(this.stateElapsedMonths / state.duration_months, 1);
    }

    return this.isEnded() ? 1 : 0;
  }

  /**
   * Get human-readable date
   */
  getSimDate() {
    const startDate = new Date('2025-04-01');
    const currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + this.simTimeMonths);

    return currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  }

  /**
   * Get full simulation state for rendering
   */
  getState() {
    return {
      currentStateId: this.currentState,
      currentState: this.getCurrentState(),
      simTimeMonths: this.simTimeMonths,
      simDate: this.getSimDate(),
      stateElapsedMonths: this.stateElapsedMonths,
      variables: { ...this.variables },
      history: this.history,
      availableChoices: this.getAvailableChoices(),
      isAtBranchPoint: this.isAtBranchPoint(),
      isEnded: this.isEnded(),
      progress: Math.min(this.simTimeMonths / this.maxSimMonths, 1), // Cap at 100%
    };
  }
}
