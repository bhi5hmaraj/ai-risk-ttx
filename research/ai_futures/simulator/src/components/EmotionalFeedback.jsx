import { useEffect } from 'react';
import useSimulationStore from '../store/useSimulationStore';

/**
 * Emotional Feedback System - MDA Framework Implementation
 *
 * Aesthetics (desired emotional responses):
 * - Tension: Rising AI capabilities, accelerating change
 * - Dread: High misalignment risk, job losses mounting
 * - Hope: Alignment progress, safety measures
 * - Anxiety: At critical decision points
 * - Relief/Despair: Different endings
 */

function EmotionalFeedback() {
  const simState = useSimulationStore((state) => state.simState);

  useEffect(() => {
    if (!simState || !simState.variables) return;

    const vars = simState.variables;
    const currentState = simState.currentState;

    // Calculate emotional state based on variables
    const emotionalState = calculateEmotionalState(vars, currentState);

    // Apply to body class
    document.body.className = `emotion-${emotionalState.primary}`;

    // Apply to header
    const header = document.querySelector('.app-header');
    if (header) {
      header.className = `app-header ${emotionalState.headerClass}`;
    }

    // Apply to graphs section
    const graphs = document.querySelector('.graphs-section');
    if (graphs) {
      graphs.className = `graphs-section ${emotionalState.graphsClass}`;
    }

    // Apply to bottom row if at choice point
    const bottom = document.querySelector('.bottom-row');
    if (bottom && simState.isAtBranchPoint) {
      bottom.className = 'bottom-row highlight';
    } else if (bottom) {
      bottom.className = 'bottom-row';
    }

  }, [simState]);

  return null; // This component only applies effects, no rendering
}

function calculateEmotionalState(vars, currentState) {
  const aiRD = vars.ai_rd_multiplier || 1;
  const misalignmentRisk = vars.misalignment_risk_score || 0;
  const jobLoss = vars.public_job_loss_rate || 0;
  const gdpGrowth = vars.gdp_growth_rate || 0.02;

  // Determine emotional state based on MDA aesthetics
  let primary = 'neutral';
  let headerClass = '';
  let graphsClass = '';

  // CRISIS: Very high misalignment risk (>80%)
  if (misalignmentRisk > 0.8) {
    primary = 'crisis';
    headerClass = 'danger';
    graphsClass = 'danger';
  }
  // DREAD: High misalignment (>50%) or massive job losses (>40%)
  else if (misalignmentRisk > 0.5 || jobLoss > 0.4) {
    primary = 'dread';
    headerClass = 'danger';
    graphsClass = 'danger';
  }
  // TENSION: Rapid AI progress (>10x) or moderate risks
  else if (aiRD > 10 || misalignment_risk > 0.3 || jobLoss > 0.2) {
    primary = 'tense';
    headerClass = 'warning';
    graphsClass = 'warning';
  }
  // HOPEFUL: Strong GDP growth or low risks in slowdown path
  else if (gdpGrowth > 0.1 || (misalignmentRisk < 0.2 && currentState?.phase === 'slowdown')) {
    primary = 'hopeful';
    headerClass = 'safe';
    graphsClass = 'safe';
  }

  return {
    primary,
    headerClass,
    graphsClass,
  };
}

export default EmotionalFeedback;
