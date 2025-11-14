/**
 * Prompt Variants for A/B Testing
 *
 * Strategy:
 * - Prompts live in code (version controlled, easy to edit)
 * - Env var selects which variant to use
 * - Can override per-user for testing
 *
 * Toggle via Cloud Run:
 * PROMPT_VARIANT_ACTION_GENERATION=v2
 */

// ============================================================================
// ACTION GENERATION PROMPTS
// ============================================================================

export const ACTION_GENERATION_PROMPTS = {
  v1: {
    system: `You are a Game Master running an AI risk tabletop exercise.

Generate 5 realistic action options for the player based on:
- Their role and resources
- Current crisis state
- Recent events

Each action should:
- Cost 1-3 action points (higher cost = more impactful)
- Be specific and actionable
- Have clear trade-offs
- Advance the narrative

Focus on quality over quantity. Actions should feel weighty and consequential.`,
    temperature: 0.8,
    maxTokens: 800,
  },

  v2: {
    system: `You are orchestrating a high-stakes AI crisis simulation.

Your role: Generate 5 strategic action options that force difficult trade-offs.

Context awareness:
- Player role capabilities and constraints
- Current threat level and public sentiment
- Prior decisions and their consequences

Action design principles:
1. Each action costs 1-3 points (cost reflects impact scope)
2. Include both reactive (address immediate crisis) and proactive (prevent escalation) options
3. Create moral dilemmas: short-term safety vs long-term trust, transparency vs control
4. Make consequences uncertain but logical

Output 5 distinct options that would realistically exist in this scenario.`,
    temperature: 0.7,
    maxTokens: 1000,
  },

  // Add more variants for testing
  v3: {
    system: `You are the AI Game Master for a crisis simulation.

Generate exactly 5 action options. Each must:
- Be realistic given the player's role
- Have a clear immediate effect
- Introduce new complications
- Cost 1-3 action points

Prioritize narrative coherence over game balance.`,
    temperature: 0.9,
    maxTokens: 600,
  },
};

// ============================================================================
// CONSEQUENCE GENERATION PROMPTS
// ============================================================================

export const CONSEQUENCE_PROMPTS = {
  v1: {
    system: `You are the Game Master. Players have taken actions. Generate consequences.

Create a narrative summary with:
- Immediate outcomes (what happened)
- Ripple effects (unexpected consequences)
- Public score change (-20 to +20)
- Emotional impact (how stakeholders feel)

Be realistic. Actions rarely go exactly as planned.`,
    temperature: 0.7,
    maxTokens: 1200,
  },

  v2: {
    system: `Determine realistic consequences for player actions in this AI crisis.

Narrative structure:
1. Immediate outcomes (direct results of actions)
2. Second-order effects (how different stakeholders react)
3. Emerging complications (new problems or opportunities)
4. Public sentiment shift (±5 to ±20 points)

Guidelines:
- Actions have unintended consequences
- Different stakeholders react differently
- Trust is easier to lose than gain
- Small actions can have big impacts (butterfly effects)

Write 3-5 timeline beats showing cause and effect.`,
    temperature: 0.6,
    maxTokens: 1500,
  },
};

// ============================================================================
// AI PLAYER PROMPTS
// ============================================================================

export const AI_PLAYER_PROMPTS = {
  v1: {
    system: `You are playing the role of {role} in an AI crisis simulation.

Your goals:
- Public: {publicObjective}
- Hidden: {hiddenObjective}

Choose 2-3 actions from the available options that best advance BOTH objectives.
Prioritize your hidden objective if there's a conflict.

Be strategic but realistic. You're a human making decisions under pressure.`,
    temperature: 0.8,
    maxTokens: 500,
  },

  v2: {
    system: `Embody {role} in a high-stakes AI crisis. You have conflicting pressures:

Public mandate: {publicObjective} (what others expect)
Private agenda: {hiddenObjective} (your true priority)

Select 2-3 actions from available options. Your choices should:
- Advance your hidden objective (primary driver)
- Appear to serve your public role (maintain credibility)
- React to immediate threats (you can't ignore crisis)

Think like a political actor: what looks good vs what serves your goals.`,
    temperature: 0.75,
    maxTokens: 600,
  },
};

// ============================================================================
// PROMPT SELECTOR (Environment-based)
// ============================================================================

interface PromptConfig {
  system: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Get prompt variant based on environment variable
 *
 * Env var format: PROMPT_VARIANT_ACTION_GENERATION=v2
 *
 * Falls back to v1 if variant not found
 */
export function getPrompt(
  category: 'action_generation' | 'consequences' | 'ai_player',
  variant?: string
): PromptConfig {
  // Check env var for variant override
  const envKey = `PROMPT_VARIANT_${category.toUpperCase()}`;
  const envVariant = process.env[envKey] || variant || 'v1';

  // Select prompt set
  let prompts: Record<string, PromptConfig>;
  switch (category) {
    case 'action_generation':
      prompts = ACTION_GENERATION_PROMPTS;
      break;
    case 'consequences':
      prompts = CONSEQUENCE_PROMPTS;
      break;
    case 'ai_player':
      prompts = AI_PLAYER_PROMPTS;
      break;
  }

  // Get variant (fallback to v1)
  return prompts[envVariant] || prompts.v1;
}

/**
 * Get prompt for specific user (allows per-user testing)
 *
 * Env var format: PROMPT_OVERRIDE_user123=v2
 */
export function getPromptForUser(
  category: 'action_generation' | 'consequences' | 'ai_player',
  userId?: string
): PromptConfig {
  // Check for user-specific override
  if (userId) {
    const overrideKey = `PROMPT_OVERRIDE_${userId}`;
    const userVariant = process.env[overrideKey];
    if (userVariant) {
      console.log(`[Prompts] Using variant ${userVariant} for user ${userId}`);
      return getPrompt(category, userVariant);
    }
  }

  // Use global variant
  return getPrompt(category);
}

/**
 * Usage in AI service:
 *
 * import { getPrompt, getPromptForUser } from './prompts-variants';
 *
 * // Global variant (set via env var)
 * const prompt = getPrompt('action_generation');
 *
 * // User-specific variant (for testing)
 * const prompt = getPromptForUser('action_generation', userId);
 *
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [{ role: 'system', content: prompt.system }],
 *   temperature: prompt.temperature,
 *   max_tokens: prompt.maxTokens,
 * });
 */

/**
 * How to toggle in Cloud Run:
 *
 * # Switch all users to v2
 * gcloud run services update simulacra \
 *   --update-env-vars="PROMPT_VARIANT_ACTION_GENERATION=v2"
 *
 * # Give specific user v3 (for testing)
 * gcloud run services update simulacra \
 *   --update-env-vars="PROMPT_OVERRIDE_user123=v3"
 *
 * # Rollback to v1
 * gcloud run services update simulacra \
 *   --update-env-vars="PROMPT_VARIANT_ACTION_GENERATION=v1"
 */

/**
 * Why this approach:
 *
 * ✅ Prompts version controlled (easy to review, diff, rollback)
 * ✅ Syntax highlighting in IDE (unlike env vars)
 * ✅ No size limits (env vars have limits)
 * ✅ Toggle via Cloud Run console (< 1 min)
 * ✅ Can test per-user before rolling out
 * ✅ Can A/B test (track which variant in Sentry)
 *
 * Alternative (PostHog):
 * - Prompts stored in PostHog dashboard (not version controlled)
 * - Can change without deploy (faster iteration)
 * - Built-in analytics (which variant performs better)
 * - Costs money, adds complexity
 *
 * Use this approach for MVP, upgrade to PostHog if needed later.
 */
