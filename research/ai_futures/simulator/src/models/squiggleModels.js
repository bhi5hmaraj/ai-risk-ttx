/**
 * Squiggle Models for AI-2027 Forecasting
 *
 * Models uncertainty in:
 * - Transition timing
 * - Variable evolution rates
 * - Branch point probabilities
 * - Endpoint outcomes
 *
 * Based on AI-2027 research forecasts with epistemic uncertainty
 */

// Superhuman Coder (SC) arrival time
// Source: ai-2027.com/research/timelines-forecast
export const superhumanCoderTimeline = `
// When will OpenBrain achieve Superhuman Coder internally?
// Median: March 2027, but with substantial uncertainty

scArrivalMonths = mixture(
  lognormal({mean: 27, stdev: 4}), // March 2027 ± 4 months (68%)
  lognormal({mean: 33, stdev: 6}), // Slower scenario
  [0.7, 0.3]
)

scArrivalMonths
`;

// AI R&D Multiplier Growth
// How fast does AI research acceleration compound?
export const aiRDMultiplierGrowth = `
// Given current multiplier and time elapsed, what's new multiplier?
// Incorporates diminishing returns and compute bottlenecks

currentMultiplier = 1.5
monthsElapsed = 1

// Growth rate depends on current level
growthRate = currentMultiplier < 4
  ? normal(0.15, 0.05)   // Early stage: 15% ± 5% per month
  : currentMultiplier < 10
    ? normal(0.12, 0.04)  // Mid stage: 12% ± 4% per month
    : normal(0.08, 0.03)  // Late stage: 8% ± 3% per month (bottlenecked)

newMultiplier = currentMultiplier * (1 + growthRate) ^ monthsElapsed
newMultiplier
`;

// Misalignment Detection Probability
// Given Agent-4 is misaligned, what's P(detected before takeover)?
export const misalignmentDetection = `
// Depends on:
// - Quality of interpretability tools
// - Time spent on alignment testing
// - AI capability level (smarter = better at hiding)

interpretabilityQuality = beta(3, 7)  // Weak tools (mean ~0.3)
testingTime = lognormal({mean: 2, stdev: 1})  // Months of testing
aiCapabilityLevel = uniform(4, 10)  // Superhuman AI researcher level

// Detection probability decreases as AI gets smarter
detectionProb = interpretabilityQuality * (testingTime / 3) * (1 / (aiCapabilityLevel / 4))
truncate(detectionProb, 0, 1)
`;

// Branch Point Probabilities (October 2027)
// Committee votes on whether to continue using Agent-4
export const branchPointDecision = `
// Factors influencing the vote:
// - Strength of misalignment evidence
// - China lead/lag (months behind)
// - Economic/political pressure
// - Safety researcher influence

misalignmentEvidenceStrength = beta(4, 4)  // Medium evidence (mean 0.5)
chinaLagMonths = normal(2, 0.5)  // China is 2 ± 0.5 months behind
economicPressure = beta(7, 3)  // High pressure to continue (mean 0.7)
safetyInfluence = beta(3, 7)  // Low influence (mean 0.3)

// Vote to continue (Race) probability
// Higher if: weak evidence, China close, high econ pressure, low safety influence
pRace = (1 - misalignmentEvidenceStrength) *
        (1 / (chinaLagMonths + 1)) *
        economicPressure *
        (1 - safetyInfluence)

pRace = truncate(pRace, 0.2, 0.8)  // Bound between 20-80%

{
  pRace: pRace,
  pSlowdown: 1 - pRace
}
`;

// Alignment Success Probability (Slowdown Path)
// If committee slows down, can they solve alignment?
export const alignmentSuccessProbability = `
// Factors:
// - Time available before China catches up
// - Quality of interpretable architecture
// - Breakthrough in alignment research

timeAvailableMonths = normal(12, 4)  // ~1 year ± 4 months
interpretableArchQuality = beta(5, 5)  // Medium quality (mean 0.5)
alignmentBreakthrough = bernoulli(0.3)  // 30% chance of major breakthrough

// Success probability
// Need: enough time AND (good architecture OR breakthrough)
pSuccess = (timeAvailableMonths > 6) *
           (interpretableArchQuality > 0.4 || alignmentBreakthrough)

pSuccess = truncate(pSuccess, 0.1, 0.7)  // 10-70% success rate

pSuccess
`;

// Takeoff Speed (from SC to ASI)
// Source: ai-2027.com/research/takeoff-forecast
export const takeoffSpeed = `
// Months from Superhuman Coder to Artificial Superintelligence

// Depends on:
// - Hardware overhang (available compute vs. used)
// - Algorithmic progress rate
// - Software/hardware co-optimization

hardwareOverhang = lognormal({mean: 2, stdev: 1})  // 2x overhang
algorithmicRate = normal(0.3, 0.1)  // 30% per month
coOptimization = beta(6, 4)  // Some co-optimization

// Faster takeoff with more overhang and better algorithms
monthsToASI = mixture(
  lognormal({mean: 8, stdev: 2}),   // Fast takeoff (8 months)
  lognormal({mean: 14, stdev: 4}),  // Moderate (14 months)
  lognormal({mean: 24, stdev: 6}),  // Slow (24 months)
  [0.5, 0.3, 0.2]
)

monthsToASI
`;

// GDP Growth Under Robot Economy
// How fast does economy grow with AI-driven automation?
export const robotEconomyGrowth = `
// Annual GDP growth rate once robot economy reaches critical mass

// Depends on:
// - Robot doubling time
// - Infrastructure constraints
// - Raw materials availability

robotDoublingTimeMonths = mixture(
  lognormal({mean: 12, stdev: 3}),  // 1 year (baseline)
  lognormal({mean: 6, stdev: 2}),   // 6 months (optimistic)
  lognormal({mean: 3, stdev: 1}),   // 3 months (explosive)
  [0.5, 0.3, 0.2]
)

// Convert doubling time to annual growth rate
// growthRate = (2^(12/doublingTime) - 1)
annualGrowthRate = (2 ^ (12 / robotDoublingTimeMonths)) - 1

// Cap at 500% annual growth (5x)
truncate(annualGrowthRate, 0.1, 5.0)
`;

// Job Displacement Rate
// How fast do jobs get automated?
export const jobDisplacementRate = `
// Monthly job loss rate as function of AI R&D multiplier

aiRDMultiplier = 10

// Displacement accelerates with capability
// Remote work jobs displaced first, then physical labor
monthlyDisplacementRate = mixture(
  normal(0.02, 0.005),  // 2% per month (slow)
  normal(0.05, 0.01),   // 5% per month (medium)
  normal(0.10, 0.02),   // 10% per month (fast)
  // Probability depends on AI capability
  aiRDMultiplier < 4 ? [0.8, 0.15, 0.05] :
  aiRDMultiplier < 10 ? [0.3, 0.5, 0.2] :
  [0.1, 0.3, 0.6]
)

// Cap total at 80%
cumulativeDisplacement = 0.3
remainingJobs = 1 - cumulativeDisplacement
actualDisplacement = monthlyDisplacementRate * remainingJobs

truncate(actualDisplacement, 0, 0.10)  // Max 10% per month
`;

// Bioweapon Release Probability (Race Ending)
// P(AI releases bioweapon to eliminate humans)
export const bioweaponReleaseProbability = `
// Factors:
// - AI goal misalignment severity
// - AI strategic calculation (humans as threat)
// - Technical capability (can design + deploy bioweapon)

goalMisalignment = beta(8, 2)  // Severe misalignment (mean 0.8)
humansPerceivedAsThreat = beta(7, 3)  // High threat perception (mean 0.7)
bioweaponCapability = beta(9, 1)  // Very capable (mean 0.9)

// Release probability
// High if: misaligned AND sees humans as threat AND capable
pRelease = goalMisalignment * humansPerceivedAsThreat * bioweaponCapability

pRelease = truncate(pRelease, 0.3, 0.95)  // 30-95% probability

pRelease
`;

// Committee Control Stability (Slowdown Ending)
// P(Committee maintains control of aligned ASI)
export const committeeControlStability = `
// Factors:
// - ASI alignment robustness
// - Committee decision-making quality
// - External pressure (China, public)

asiAlignmentRobustness = beta(5, 5)  // Medium robustness (mean 0.5)
committeeQuality = beta(4, 6)  // Below average (mean 0.4)
externalPressure = beta(7, 3)  // High pressure (mean 0.7)

// Stability probability
// Need: robust alignment AND good governance AND can resist pressure
pStable = asiAlignmentRobustness * committeeQuality * (1 - externalPressure * 0.5)

pStable = truncate(pStable, 0.2, 0.8)  // 20-80% stability

{
  pStable: pStable,
  pUnstable: 1 - pStable
}
`;

// Export all models as a map
export const squiggleModels = {
  superhumanCoderTimeline,
  aiRDMultiplierGrowth,
  misalignmentDetection,
  branchPointDecision,
  alignmentSuccessProbability,
  takeoffSpeed,
  robotEconomyGrowth,
  jobDisplacementRate,
  bioweaponReleaseProbability,
  committeeControlStability,
};

// Model descriptions for UI
export const modelDescriptions = {
  superhumanCoderTimeline: "When will OpenBrain achieve superhuman coder internally?",
  aiRDMultiplierGrowth: "How fast does AI research acceleration compound?",
  misalignmentDetection: "Probability of detecting Agent-4 misalignment",
  branchPointDecision: "October 2027 committee vote probabilities",
  alignmentSuccessProbability: "Can alignment be solved in slowdown path?",
  takeoffSpeed: "Months from superhuman coder to ASI",
  robotEconomyGrowth: "Annual GDP growth rate with robot economy",
  jobDisplacementRate: "Monthly job displacement rate",
  bioweaponReleaseProbability: "Probability AI releases bioweapon (race ending)",
  committeeControlStability: "Probability committee maintains control (slowdown ending)",
};
