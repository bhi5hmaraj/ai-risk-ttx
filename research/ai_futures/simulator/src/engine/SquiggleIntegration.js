/**
 * Squiggle Integration for Probabilistic Forecasting
 *
 * Runs Squiggle models to sample from probability distributions
 * instead of using deterministic point estimates.
 */

import { run as runSquiggle } from '@quri/squiggle-lang';
import { squiggleModels } from '../models/squiggleModels';

class SquiggleIntegration {
  constructor() {
    this.cache = new Map();
    this.sampleCount = 1000; // Number of samples for distributions
  }

  /**
   * Run a Squiggle model and return result
   * @param {string} modelKey - Key from squiggleModels
   * @param {Object} bindings - Variable bindings for the model
   * @returns {Object} Squiggle result with samples/distribution
   */
  async runModel(modelKey, bindings = {}) {
    const model = squiggleModels[modelKey];

    if (!model) {
      throw new Error(`Model not found: ${modelKey}`);
    }

    const cacheKey = `${modelKey}_${JSON.stringify(bindings)}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Run Squiggle model
      const result = runSquiggle(model, {
        sampleCount: this.sampleCount,
        xyPointLength: 1000,
        environment: bindings,
      });

      // Extract value from result
      const value = this.extractValue(result);

      // Cache result
      this.cache.set(cacheKey, value);

      return value;
    } catch (error) {
      console.error(`Error running Squiggle model ${modelKey}:`, error);
      return null;
    }
  }

  /**
   * Extract usable value from Squiggle result
   */
  extractValue(result) {
    if (!result.ok) {
      console.error('Squiggle execution error:', result.value);
      return null;
    }

    const value = result.value.result;

    // Handle different value types
    if (value.tag === 'Number') {
      return value.value;
    }

    if (value.tag === 'Distribution') {
      return {
        type: 'distribution',
        mean: this.getMean(value),
        p5: this.getPercentile(value, 0.05),
        p50: this.getPercentile(value, 0.50),
        p95: this.getPercentile(value, 0.95),
        samples: this.getSamples(value, 100),
      };
    }

    if (value.tag === 'Record') {
      // For objects like {pRace: ..., pSlowdown: ...}
      const result = {};
      for (const [key, val] of Object.entries(value.value)) {
        result[key] = this.extractValue({ ok: true, value: { result: val } });
      }
      return result;
    }

    return value.value;
  }

  /**
   * Get mean of distribution
   */
  getMean(distribution) {
    try {
      // Sample and compute mean
      const samples = this.getSamples(distribution, 1000);
      return samples.reduce((sum, x) => sum + x, 0) / samples.length;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get percentile of distribution
   */
  getPercentile(distribution, p) {
    try {
      const samples = this.getSamples(distribution, 1000).sort((a, b) => a - b);
      const index = Math.floor(p * samples.length);
      return samples[index];
    } catch (error) {
      return null;
    }
  }

  /**
   * Get samples from distribution
   */
  getSamples(distribution, count) {
    try {
      // Use Squiggle's sample method if available
      if (distribution.sample) {
        return Array.from({ length: count }, () => distribution.sample());
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Sample a single value from a model
   * (for use in simulation steps)
   */
  async sampleValue(modelKey, bindings = {}) {
    const result = await this.runModel(modelKey, bindings);

    if (result === null) {
      return null;
    }

    // If result is a distribution, sample from it
    if (result.type === 'distribution') {
      return result.p50; // Use median as point estimate
    }

    // If result is a number, return it
    if (typeof result === 'number') {
      return result;
    }

    // If result is an object (like branch probabilities), return it
    return result;
  }

  /**
   * Get full distribution for visualization
   */
  async getDistribution(modelKey, bindings = {}) {
    const result = await this.runModel(modelKey, bindings);

    if (result && result.type === 'distribution') {
      return result;
    }

    // If not a distribution, wrap as point estimate
    return {
      type: 'point',
      value: result,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Set sample count for future runs
   */
  setSampleCount(count) {
    this.sampleCount = count;
    this.clearCache(); // Clear cache since sample count changed
  }
}

// Singleton instance
const squiggleIntegration = new SquiggleIntegration();

export default squiggleIntegration;

/**
 * Helper functions for use in SimulationEngine
 */

/**
 * Sample AI R&D multiplier growth with uncertainty
 */
export async function sampleAIRDMultiplierGrowth(currentMultiplier, monthsElapsed) {
  return await squiggleIntegration.sampleValue('aiRDMultiplierGrowth', {
    currentMultiplier,
    monthsElapsed,
  });
}

/**
 * Sample branch point decision probabilities
 */
export async function sampleBranchPointDecision() {
  return await squiggleIntegration.sampleValue('branchPointDecision');
}

/**
 * Sample job displacement rate
 */
export async function sampleJobDisplacementRate(aiRDMultiplier, cumulativeDisplacement) {
  return await squiggleIntegration.sampleValue('jobDisplacementRate', {
    aiRDMultiplier,
    cumulativeDisplacement,
  });
}

/**
 * Sample robot economy growth rate
 */
export async function sampleRobotEconomyGrowth() {
  return await squiggleIntegration.sampleValue('robotEconomyGrowth');
}

/**
 * Get branch point probabilities for display
 */
export async function getBranchPointProbabilities() {
  const result = await squiggleIntegration.getDistribution('branchPointDecision');
  return result;
}

/**
 * Get alignment success probability for slowdown path
 */
export async function getAlignmentSuccessProbability() {
  const result = await squiggleIntegration.getDistribution('alignmentSuccessProbability');
  return result;
}
