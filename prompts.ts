import { RoleName } from './types/core';
import type { GameState, Player, ActionOption, PlayerRoundActions, GameSetup } from './types/core';
import { GAME_CONFIG } from "./gameConfig";

// Number of roles in the game (avoids importing React-dependent constants.tsx)
const NUM_ROLES = 6; // Update this if roles are added/removed

// Schema for the AI's response when determining the consequences of player actions.
const AIConsequenceResponseSchema = {
  type: "object",
  properties: {
    roundSummary: { type: "string", description: "2-3 sentence plain-language summary of what happened this round and why the core metric changed." },
    outcomeTimeline: {
      type: "array",
      description: "An ordered list (3-5 items) that breaks down the key beats of the round in chronological order.",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "A short label for the moment." },
          description: { type: "string", description: "1-2 sentences describing what happened during this beat." },
          impact: { type: "string", description: "A concise explanation of how this beat affected the core metric or player goals." },
          causes: {
            type: "array",
            description: "Optional causal citations explaining why this beat happened, linking to prior events or actions.",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["event", "action", "exogenous"], description: "What is being cited (prior event, player action, or external factor)." },
                ref: { type: "string", description: "Reference id or descriptor (e.g., prior event id or 'Role:Action@Round')." },
                rationale: { type: "string", description: "Short explanation of the causal link." }
              },
              required: ["type", "ref", "rationale"],
            }
          },
        },
        required: ['title', 'description', 'impact'],
      },
    },
    counterfactualNote: {
      type: "string",
      description: "One short paragraph that explains what would have happened to the core metric if no one had acted, starting with 'If no one had acted...'",
    },
    publicScoreUpdate: { type: "number", description: "The integer change (delta) in the public score." },
    hiddenScoreUpdates: {
      type: "array",
      description: "An array of hidden score updates for every role.",
      minItems: NUM_ROLES,
      maxItems: NUM_ROLES,
      items: {
        type: "object",
        properties: {
          roleName: { type: "string", enum: Object.values(RoleName), description: "The name of the role." },
          update: { type: "number", description: "The integer change in the player's hidden score." },
          justification: { type: "string", description: "A brief, one-sentence explanation for the score change based on their secret objective." },
        },
        required: ['roleName', 'update', 'justification'],
      }
    },
    nextEvent: {
      type: "object",
      properties: {
        headline: { type: "string", description: "The headline for the next, escalating crisis event." },
        detail: { type: "string", description: "A paragraph explaining the new crisis in detail." },
      },
      required: ['headline', 'detail'],
    },
  },
  required: ['roundSummary', 'outcomeTimeline', 'counterfactualNote', 'publicScoreUpdate', 'hiddenScoreUpdates', 'nextEvent'],
} as const;

// Schema for the AI's response when generating actions for an AI-controlled player.
const AIPlayerActionsSchema = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      description: "The list of actions the player will take. Can be an empty array.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "The concise title of the action." },
          description: { type: "string", description: "A brief explanation of the action." },
          cost: { type: "number", description: `An integer cost between 1 and ${GAME_CONFIG.ACTION_POINTS_PER_ROUND}.` }
        },
        required: ['title', 'description', 'cost']
      }
    }
  },
  required: ['actions']
} as const;

// Schema for the AI's response when generating action options for a human player.
const AIActionOptionsResponseSchema = {
  type: "object",
  properties: {
    options: {
      type: "array",
      description: "An array of exactly 5 distinct action options.",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "The concise title of the action." },
          description: { type: "string", description: "A brief description of the action and its potential outcome." },
          cost: { type: "number", description: `An integer cost between 1 and ${GAME_CONFIG.ACTION_POINTS_PER_ROUND}.` }
        },
        required: ['title', 'description', 'cost']
      },
    }
  },
  required: ['options']
} as const;

const AICounterfactualResponseSchema = {
  type: "object",
  properties: {
    publicScoreUpdate: { type: "number", description: "The integer change (delta) in the public score if no one acted." },
  },
  required: ['publicScoreUpdate'],
} as const;

// Schema for combined AI turn (generate options + choose actions in one call)
const AITurnSchema = {
  type: "object",
  properties: {
    options: {
      type: "array",
      description: "The 5 distinct action options generated for this AI player.",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "The concise title of the action." },
          description: { type: "string", description: "A brief description of the action and its potential outcome." },
          cost: { type: "number", description: `An integer cost between 1 and ${GAME_CONFIG.ACTION_POINTS_PER_ROUND}.` }
        },
        required: ['title', 'description', 'cost']
      }
    },
    chosenActions: {
      type: "array",
      description: "The actions the AI player chose from the options. Can be empty if they choose inaction. Must be exact copies from the options array.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "The concise title of the action." },
          description: { type: "string", description: "A brief description of the action and its potential outcome." },
          cost: { type: "number", description: `An integer cost between 1 and ${GAME_CONFIG.ACTION_POINTS_PER_ROUND}.` }
        },
        required: ['title', 'description', 'cost']
      }
    },
    reasoning: {
      type: "string",
      description: "Brief internal reasoning (1-2 sentences) for why the AI chose these specific actions to advance their hidden objective."
    }
  },
  required: ['options', 'chosenActions', 'reasoning']
} as const;

const buildGameSetupSchema = (maxAIPlayers: number) => ({
    type: "object",
    properties: {
        scenarioTitle: { type: "string", description: "A short, catchy title for the scenario." },
        scenarioDescription: { type: "string", description: "A brief, one-paragraph overview of the starting situation." },
        coreMetric: {
            type: "object",
            properties: {
                name: { type: "string", description: "The name of the central score for this scenario (e.g., 'Public Trust', 'Market Stability')." },
                description: { type: "string", description: "A brief explanation of what this score represents." },
                value: { type: "number", description: "The starting value for the score, typically between 70 and 100." }
            },
            required: ['name', 'description', 'value']
        },
        stakeholders: {
            type: "array",
            description: `A list of 5 to ${1 + maxAIPlayers} relevant and distinct stakeholder roles for this scenario. Include a balanced cast with both protagonists and antagonists, and mix individuals and institutions.`,
            minItems: 5,
            maxItems: 1 + maxAIPlayers,
            items: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The title of the stakeholder role (e.g., 'Lead Cyberneticist', 'Chief Medical Officer')." },
                    icon: { type: "string", description: "A single emoji that represents this role (e.g., '🔬' for scientist, '💼' for executive, '🏥' for medical officer). Must be a single emoji character." },
                    publicObjective: { type: "string", description: "The stated, public-facing goal of this role." },
                    hiddenObjective: { type: "string", description: "The secret, personal, or institutional goal that this role is trying to achieve." }
                },
                required: ['name', 'icon', 'publicObjective', 'hiddenObjective']
            }
        }
    },
    required: ['scenarioTitle', 'scenarioDescription', 'coreMetric', 'stakeholders']
} as const);


/**
 * Generates the prompt for creating the initial game scenario.
 * This prompt asks the AI to act as a Game Master and set the stage.
 */
export const getInitialScenarioPromptAndSchema = () => {
    const prompt = `
      You are a master storyteller and the Game Master for 'Crisis Command', a serious simulation game.
      Your primary task is to establish a tense, realistic, and thought-provoking starting scenario.
      The game begins with the core metric at a fragile 100. Do not assume a specific metric name; choose a scenario-appropriate one (e.g., "Global Stability", "Public Trust").

      Tell the story in a way that players can scan quickly:
      - Use the 'roundSummary' field for a tight plain-language recap (no more than 3 sentences).
      - Populate the 'outcomeTimeline' array with 3 to 4 chronological beats. Each beat should have a short title, a couple of sentences, and an explicit "impact" line tying back to how the crisis affects the core metric or the players.
      - The 'counterfactualNote' should begin with "If no one had acted..." and briefly explain the expected score change (remember, this is the first round so reference the escalating crisis rather than player decisions).

      Here are your strict instructions for the response:
      1.  Generate that structured summary plus a specific, actionable crisis event.
      2.  The 'publicScoreUpdate' field MUST be a significant negative integer. A value between -15 and -25 is ideal to create immediate tension. The game will start at (100 + this value).
      3.  For the 'hiddenScoreUpdates', every role MUST be present. Each must have an 'update' of 0 and a 'justification' of 'Game start.'. This is a non-negotiable setup requirement.

      Fairness & Neutrality: Avoid national/ethnic stereotyping or default moral judgments. If geopolitical actors are involved (e.g., US, China, EU), frame causes and risks in terms of concrete actions/decisions, not identity.

      You must respond ONLY with a single, valid JSON object that conforms to the provided schema. Do not include any explanatory text or markdown formatting outside of the JSON structure.
    `;
    return { prompt, schema: AIConsequenceResponseSchema };
}

/**
 * Generates the prompt for processing player actions and determining the consequences.
 * This is the core "turn resolution" prompt.
 * @param gameState The current state of the game.
 * @param players The list of all players and their chosen actions for the round.
 * @param counterfactualScoreChange The pre-calculated score change if no one had acted.
 * @param maxRounds The maximum number of rounds in the game (for score normalization).
 */
export const getConsequencesPromptAndSchema = (gameState: GameState, players: Player[], counterfactualScoreChange: number, maxRounds: number = GAME_CONFIG.MAX_ROUNDS) => {
    const playerActionsText = players.map(p => {
        const actionTitles = p.actions.length > 0 ? p.actions.map(a => `"${a.title}"`).join(", ") : 'took no action';
        return `  - ${p.role.name} (Secret Goal: ${p.role.hiddenObjective}): ${actionTitles}.`
    }).join("\n");

    const historyBlocks = (gameState.eventLog || [])
      .filter(e => (e.round ?? 0) > 0 && e.round < gameState.round)
      .map(e => {
        const actions = (e.playerActions || [])
          .map(pa => {
            const titles = (pa.actions || []).map(a => a.title).join('; ');
            return `    <actor name="${pa.roleName}" human="${pa.isHuman}">${titles || 'none'}</actor>`;
          })
          .join('\n');
        return [
          `<round n="${e.round}">`,
          `  <headline>${e.event?.headline || ''}</headline>`,
          `  <summary>${e.roundSummary}</summary>`,
          `  <publicScoreChange>${e.publicScoreChange}</publicScoreChange>`,
          `  <publicScoreAfter>${e.publicScoreAfter}</publicScoreAfter>`,
          `  <actions>`,
          actions,
          `  </actions>`,
          `</round>`
        ].join('\n');
      })
      .join('\n');

    const prompt = `
      You are the Game Master for 'Crisis Command', and you are the impartial arbiter of consequences.
      Your task is to analyze the players' actions in response to the crisis and return a crisp, structured recap. The world reacts to their choices.

      CURRENT SITUATION:
      - Round: ${gameState.round}
      - ${gameState.coreMetric.name}: ${gameState.coreMetric.value}
      - The Crisis: "${gameState.currentEvent?.headline}" - ${gameState.currentEvent?.detail}

      PLAYER ACTIONS TAKEN:
      ${playerActionsText}

      PRIOR ROUND HISTORY (use for long‑horizon causes):
      <rounds>
${historyBlocks || '        <!-- no prior rounds -->'}
      </rounds>

      Now, determine the outcome. Your response must be logical and fair.
      FAIRNESS & NEUTRALITY (MUST FOLLOW):
      - Do not favor or penalize any role based on nationality, ideology, profession, or institutional identity.
      - Avoid stereotypes or blanket judgments (e.g., anti-Chinese framing, or always praising a particular role like an AI alignment researcher by default).
      - Assign credit/blame ONLY for concrete actions or inaction in THIS round.
      - Hidden score updates must be action-justified; if a role took no relevant action, do not reward them.
      1.  **Round Summary:** Populate the 'roundSummary' field with 2-3 sentences that clearly explain what happened and why the ${gameState.coreMetric.name} score changed, explicitly naming the most important player actions.
      2.  **Outcome Timeline:** Fill the 'outcomeTimeline' array with 3-5 chronological beats. Each beat needs a short headline (title), 1-2 sentences of description, and an "impact" string that connects the beat back to the core metric or a player objective.
          For each beat, when applicable, add 'causes' entries that cite why it happened by referencing:
            • prior events (use their id or exact headline) or
            • specific player actions from this round or previous rounds.
          - For action causes, set ref to "Role:Exact Action Title@Round" and write a mechanism‑focused rationale (what changed, how it propagated, over what timeframe).
          - For event causes, use the prior event id or exact headline and explain the causal link (not just correlation).
          - Keep rationales specific (1–2 sentences) and avoid repeating the same generic text.
          - Keep each causes.rationale concise (<= 180 characters).
          - Consider long‑horizon dependencies: include at least one root‑cause citation from earlier rounds when appropriate, not only immediate antecedents. You may reference data from the <rounds> XML blocks above.
      3.  **Counterfactual Note:** In the 'counterfactualNote' field, start with "If no one had acted..." and explain that the score would have changed by ${counterfactualScoreChange} points and why.
      4.  **Public Score Update:** Provide an integer change to the public score. This should be a direct result of the summary and timeline.
      5.  **Hidden Score Updates:** For EACH player, provide a hidden score update. The justification MUST be incisive and directly reference how their actions moved them closer to or further from their secret objective.
          **SCORE NORMALIZATION:** Personal scores are normalized to a maximum of 100 across the entire game (${maxRounds} rounds). Each round's hidden score update should typically range from -${Math.floor(100 / maxRounds)} to +${Math.floor(100 / maxRounds)} (i.e., ±${Math.floor(100 / maxRounds)} per round). Only exceed this range for truly exceptional, game-defining actions that warrant outsized impact.
      6.  **New Crisis:** Generate a new crisis event. This event MUST be an escalation or a logical next step that flows naturally from this round's timeline. Raise the stakes.

      Respond ONLY with a valid JSON object matching the provided schema. No commentary.
    `;
    return { prompt, schema: AIConsequenceResponseSchema };
};

/**
 * Generates a prompt for an AI to choose actions for its role from a given list of options.
 * @param player The AI player's role and state.
 * @param gameState The current state of the game.
 * @param options The list of available actions for the AI to choose from.
 */
export const getAIPlayerActionsPromptAndSchema = (player: Player, gameState: GameState, options: ActionOption[]) => {
    const optionsText = options.map(opt => `- ${opt.title} (Cost: ${opt.cost}): ${opt.description}`).join('\n');
    const prompt = `
      You are an AI role-playing in the 'Crisis Command' simulation. You must think and act *exactly* like the character you've been assigned. Your personal motivations are everything.

      YOUR PERSONA:
      - Role: ${player.role.name}
      - Publicly, you want: "${player.role.publicObjective}"
      - Secretly, your true goal is: "${player.role.hiddenObjective}"

      THE SITUATION:
      - Crisis: "${gameState.currentEvent?.headline}" - ${gameState.currentEvent?.detail}
      - You have ${GAME_CONFIG.ACTION_POINTS_PER_ROUND} action points to spend.

      YOUR TASK:
      From the list of available actions below, select a combination that adds up to your action point budget and best serves your HIDDEN objective. You can use your public objective as a cover.

      Fairness note: Do not assume benevolence or malice based on identity (nationality, ideology, profession). Choose strictly on how options advance your hidden objective within the current situation.

      AVAILABLE ACTIONS:
${optionsText}

      Choose your actions. An empty array [] is a valid choice if you believe inaction is the most strategic move.

      Respond ONLY with a valid JSON object matching the provided schema. The actions in your response MUST be exact copies of the actions from the list above. Do not invent new actions.
    `;
    return { prompt, schema: AIPlayerActionsSchema };
};

/**
 * Generates a prompt for the GM to create a list of action options for a human player.
 * @param player The player for whom to generate options.
 * @param gameState The current state of the game.
 * @param previousRoundActions The actions taken by all players in the previous round.
 */
export const getActionOptionsPromptAndSchema = (player: Player, gameState: GameState, previousRoundActions: PlayerRoundActions[] | null) => {
    let previousActionsText = "This is the first round, so no actions have been taken yet.";
    if (previousRoundActions && previousRoundActions.length > 0) {
        previousActionsText = "Here are the actions taken by all roles in the previous round:\n" +
            previousRoundActions.map(pa => {
                const actionTitles = pa.actions.length > 0 ? pa.actions.map(a => a.title).join(", ") : 'Took no action';
                return `  - ${pa.roleName}: ${actionTitles}.`
            }).join("\n");
}

// Note: Copilot instructions moved to client-safe file: '@/copilot/instructions'

    const prompt = `
      You are the Game Master for 'Crisis Command'. Your task is to generate a set of 5 distinct, strategic action options for a player. These options are their primary way of interacting with the game world.

      THE PLAYER:
      - Role: ${player.role.name}
      - Public Objective: "${player.role.publicObjective}"
      - HIDDEN Objective: "${player.role.hiddenObjective}"

      THE CURRENT CRISIS:
      - "${gameState.currentEvent?.headline}" - ${gameState.currentEvent?.detail}

      CONTEXT FROM LAST ROUND:
${previousActionsText}

      INSTRUCTIONS FOR OPTION DESIGN:
      1.  **Create 5 Unique Options:** The options must be genuinely different from each other. Avoid simple rephrasings.
      2.  **Ensure Coherence:** The new options should be a logical evolution from the previous round's actions. They should react to, build upon, or counter what happened before. Do not suggest actions that are functionally identical to what was done last round.
      3.  **Tailor to the Role:** The actions must feel authentic to the player's role. A Tech CEO has different capabilities than a Journalist.
      4.  **Create Strategic Tension (without ideological bias):** Design the options to create a difficult choice.
          - At least two options should clearly serve the public objective.
          - At least two should subtly serve the hidden objective.
          - One option could be a high-risk/high-reward gamble, a compromise, or an unconventional idea.
      5.  **Fairness & Neutrality:** Avoid privileging a specific ideology or faction by default. The attractiveness of an option must come from its trade-offs in this situation, not the role's identity.
      6.  **Assign Logical Costs:** Each action must have a cost from 1 to ${GAME_CONFIG.ACTION_POINTS_PER_ROUND}. More impactful or complex actions should cost more.
      7.  **Write Clear Descriptions:** The description should help the player understand the action's intent and potential effects without revealing the exact mechanical outcome.

      Respond ONLY with a valid JSON object matching the provided schema.
    `;
    return { prompt, schema: AIActionOptionsResponseSchema };
};

/** CHAT MODE PROMPTS **/

export const getInitialScenarioChatPrompt = () => {
  return `Begin the simulation by generating the opening crisis scenario.

You must provide:
1. **roundSummary**: 2-3 sentence overview of the starting crisis
2. **outcomeTimeline**: 3-4 key moments that set the stage (chronological beats)
3. **counterfactualNote**: Start with "If no one acts..." and explain the baseline deterioration
4. **publicScoreUpdate**: A negative score change (-15 to -25) representing the initial crisis impact
5. **hiddenScoreUpdates**: All players start with update: 0, justification: "Game start."
6. **nextEvent**: The first actionable crisis the players will face

Fairness & Neutrality (must follow):
- Avoid national/ethnic stereotyping or default moral judgments.
- If geopolitical actors are involved (e.g., US, China, EU), attribute causes/risks to concrete actions or decisions, not identity.
- Do not implicitly praise or condemn specific roles by default. Let actions drive tone.`;
};

export const getChatConsequencesPrompt = (
  gameState: GameState,
  players: Player[],
  counterfactualScoreChange: number,
  maxRounds: number = GAME_CONFIG.MAX_ROUNDS
) => {
  const playerActionsText = players
    .map(p => {
      const actionTitles = p.actions.length > 0 ? p.actions.map(a => `"${a.title}"`).join(", ") : 'took no action';
      return `- **${p.role.name}**: ${actionTitles}`;
    })
    .join("\n");

  const historyBlocks = (gameState.eventLog || [])
    .filter(e => (e.round ?? 0) > 0 && e.round < gameState.round)
    .map(e => {
      const actions = (e.playerActions || [])
        .map(pa => {
          const titles = (pa.actions || []).map(a => a.title).join('; ');
          return `    <actor name="${pa.roleName}" human="${pa.isHuman}">${titles || 'none'}</actor>`;
        })
        .join('\n');
      return [
        `<round n="${e.round}">`,
        `  <headline>${e.event?.headline || ''}</headline>`,
        `  <summary>${e.roundSummary}</summary>`,
        `  <publicScoreChange>${e.publicScoreChange}</publicScoreChange>`,
        `  <publicScoreAfter>${e.publicScoreAfter}</publicScoreAfter>`,
        `  <actions>`,
        actions,
        `  </actions>`,
        `</round>`
      ].join('\n');
    })
    .join('\n');

  return `# Round ${gameState.round} - Determine Consequences

## Current Status
- **${gameState.coreMetric.name}**: ${gameState.coreMetric.value}
- **Crisis**: "${gameState.currentEvent?.headline}"
${gameState.currentEvent?.detail}

## Player Actions This Round
${playerActionsText}

## Prior Round History (XML blocks)
<rounds>
${historyBlocks || '  <!-- no prior rounds -->'}
</rounds>

## Counterfactual Analysis
If no one had acted, the ${gameState.coreMetric.name} would have changed by **${counterfactualScoreChange}** points.

## Output (Structured)
Return a JSON object matching this structure:
- roundSummary (string)
- outcomeTimeline (array of 3-5 items), each item has:
   - title (string)
   - description (string)
   - impact (string)
   - causes (optional, array) with entries: { type: 'event'|'action'|'exogenous', ref: string, rationale: string }
- counterfactualNote (string)
- publicScoreUpdate (number)
- hiddenScoreUpdates (array, one per role)
- nextEvent { headline, detail }

Fairness & Neutrality (must follow):
- Do not favor or penalize any role based on nationality, ideology, profession, or institutional identity.
- Avoid stereotypes or blanket judgments; assign credit/blame only for concrete actions this round.
- Hidden score updates must be action-justified.

**SCORE NORMALIZATION (must follow):**
Personal scores are normalized to a maximum of 100 across the entire game (${maxRounds} rounds). Each round's hidden score update should typically range from -${Math.floor(100 / maxRounds)} to +${Math.floor(100 / maxRounds)} (i.e., ±${Math.floor(100 / maxRounds)} per round). Only exceed this range for truly exceptional, game-defining actions that warrant outsized impact.

Long‑horizon dependencies (must consider):
  - When selecting causes, include immediate antecedents and, when relevant, a root‑cause from earlier rounds using the <rounds> XML blocks above.
  - For action refs use "Role:Exact Action Title@Round"; for events include the original round in the ref if possible (e.g., evt_r2_k1 or "Exact Headline @Round 2").
  - Keep each causes.rationale concise (<= 180 characters).
`;
};

export const getDebriefPrompt = (
  gameState: GameState,
  players: Player[],
  humanRoleName?: string,
  gameSetup?: GameSetup
) => {
  const human = humanRoleName || players.find(p => (p as any).isHuman)?.role.name || 'Human Player';
  const outcome = `${gameState.coreMetric.name}: ${gameState.coreMetric.value}`;

  const realEntries = gameState.eventLog.filter((e: any) => (e.round ?? 0) > 0 && (gameState.round ? e.round <= gameState.round : true));
  const allowedRounds = realEntries.map((e: any) => e.round);
  const roundsList = realEntries.map((e: any) => `Round ${e.round}: ${e.event?.headline || 'N/A'} (Δ ${e.publicScoreChange})`).join('\n');

  const actionsByRole = new Map<string, { round: number; titles: string[] }[]>();
  for (const entry of realEntries) {
    for (const pra of entry.playerActions || []) {
      const arr = actionsByRole.get(pra.roleName) ?? [];
      arr.push({ round: entry.round, titles: (pra.actions || []).map((a: any) => a.title) });
      actionsByRole.set(pra.roleName, arr);
    }
  }

  const humanActionsList = (actionsByRole.get(human) || [])
    .flatMap(a => a.titles.map(t => `Round ${a.round}: ${t}`));
  const actionsText = `Human (${human}): ${humanActionsList.join(', ') || 'no recorded actions'}`;

  const roleCounts: string[] = [];
  const roleSummaries: string[] = [];
  for (const p of players) {
    const arr = actionsByRole.get(p.role.name) || [];
    const count = arr.reduce((sum, rr) => sum + rr.titles.length, 0);
    roleCounts.push(`${p.role.name}: ${count}`);
    const perRound = arr.map(rr => `Round ${rr.round}: [${rr.titles.join('; ')}]`).join(' | ');
    roleSummaries.push(`${p.role.name} => ${perRound || 'no recorded actions'}`);
  }

  const setupBlock = gameSetup ? `SETUP SUMMARY (initial conditions only):\n` +
    `Scenario: ${gameSetup.scenarioTitle}\n${gameSetup.scenarioDescription}\n` +
    `Core Metric (initial): ${gameSetup.coreMetric.name} — ${gameSetup.coreMetric.description} (start ${gameSetup.coreMetric.value})\n` +
    `Stakeholders:\n` +
    gameSetup.stakeholders.map(s => `- ${s.name}: Public="${s.publicObjective}" | Hidden="${s.hiddenObjective}"`).join('\n') +
    `\n\n` : '';

  return `You are debriefing the just-completed Simulacra simulation. Provide a structured debrief.

FINAL OUTCOME: ${outcome}

${setupBlock}
ALLOWED_ROUNDS: [${allowedRounds.join(', ')}]
ROUND HEADLINES (only these rounds exist):
${roundsList}

HUMAN ACTIONS BY ROUND (choose only from these):
${actionsText}

ROLE ACTION COUNTS: { ${roleCounts.join('; ')} }
ROLE ACTIONS BY ROUND:
${roleSummaries.join('\n')}

CONSTRAINTS (MUST FOLLOW):
- Do NOT reference any rounds that are not listed in ALLOWED_ROUNDS.
- If there are fewer than 3 rounds, return at most that many keyEvents.
- userActions must reference the human's recorded actions above. If NONE exist, userActions may be an empty array.
- Do NOT state that "no actions were taken" for any role whose ROLE ACTION COUNTS is greater than 0.
- For each keyEvent, include an "actor" field with the primary stakeholder responsible (choose from the Stakeholders list above). If no stakeholder primarily caused the event, set actor = "System".
- For each keyEvent, OPTIONALLY include a "causes" array citing the specific prior events or actions that led to this decisive moment. Each cause must be:
  * type: "event" (for a prior round's headline), "action" (for a player action), or "exogenous" (for external/systemic factors)
  * ref: For "event", use the event headline. For "action", use format "RoleName:ActionTitle@RoundNumber". For "exogenous", use a brief descriptor.
  * rationale: A short explanation of why this cause was significant (1-2 sentences)

Respond using the required schema.`;
};

export const getCounterfactualPromptAndSchema = (gameState: GameState) => {
    const prompt = `
      You are an impartial Game Master for 'Crisis Command'.
      Your task is to calculate a specific outcome.

      CURRENT SITUATION:
      - The Crisis: "${gameState.currentEvent?.headline}" - ${gameState.currentEvent?.detail}

      INSTRUCTION:
      Imagine that faced with this crisis, EVERY role chose to do NOTHING. They took no action.
      Based on this complete inaction, determine the change to the '${gameState.coreMetric.name}' score. This should reflect the public's reaction to their leaders' failure to act during a crisis. The score change should almost always be negative.

      Respond ONLY with a valid JSON object matching the provided schema. No commentary. Just the JSON.
    `;
    return { prompt, schema: AICounterfactualResponseSchema };
};

export const getCustomScenarioPromptAndSchema = (scenarioDescription: string, aiPlayers?: number) => {
    const desiredAI = Math.max(0, Math.min(GAME_CONFIG.MAX_AI_PLAYERS_CUSTOM, Math.floor(aiPlayers ?? GAME_CONFIG.MAX_AI_PLAYERS_CUSTOM)));
    const stakeholdersMax = 1 + desiredAI;
    const prompt = `
      You are a world-class Game Designer and Storyteller. Your task is to take a user's idea for a crisis and transform it into a complete, playable setup for a strategic simulation game.

      USER'S SCENARIO IDEA:
      "${scenarioDescription}"

      Based on this idea, you must design all the core components of the game. Your response must be a single, valid JSON object that conforms to the provided schema.

      Here are your design instructions:
      1.  **Scenario Title & Description:** Invent a catchy, evocative title and write a compelling one-paragraph description that sets the scene and establishes the stakes.
      2.  **Core Metric:**
          -   Invent a central game score that is thematic to the scenario. Instead of "Democratic Legitimacy," it could be "Global Economic Stability," "Public Health Confidence," or "Inter-species Trust."
          -   The 'value' MUST be an integer between 70 and 100. This represents a high but fragile starting point.
      3.  **Stakeholders (target ${stakeholdersMax} roles):**
          -   Create a cast of between 5 and ${stakeholdersMax} distinct, believable stakeholder roles (prefer exactly ${stakeholdersMax} when plausible). These should be the key players in the crisis.
          -   Include a balanced mix:
              • 2–3 protagonists (public‑minded)
              • 1–2 antagonists/adversaries (e.g., rival state operator, troll‑farm lead, rogue executive)
              • 1 neutral/referee/regulator role that may constrain others
          -   Stakeholders can be individuals (e.g., "Chief Epidemiologist"), institutions (e.g., "National Grid Operator"), or organized adversaries (e.g., "Disinformation Cell Director"). Choose what best fits the scenario.
          -   Do NOT make everyone cooperative; ensure at least one stakeholder is structurally opposed to the others so the game has real conflict.
          -   For each role's 'icon', choose a SINGLE emoji that visually represents their role or domain. Examples: 🔬 (scientist), 💼 (executive), 🏥 (medical), ⚖️ (legal/regulatory), 🎖️ (military), 🏭 (industrial), 🌍 (environmental), 📡 (communications), 🛡️ (security), 💊 (pharmaceutical), etc. The emoji should be intuitive and immediately recognizable.
          -   The 'publicObjective' should be what they say they want in press conferences.
          -   The 'hiddenObjective' should be their true, often selfish or controversial, goal. This is the key to strategic gameplay. Avoid generic goals; make them specific and compelling.

      Be creative, insightful, and strategic in your design. The quality of the game depends on the rich conflict you build into this setup.
    `;
    return { prompt, schema: buildGameSetupSchema(desiredAI) };
};

/**
 * OPTIMIZED: Combined AI turn - generates options AND chooses actions in one LLM call
 * This replaces the two-step process (generateActionOptions + generateAIPlayerActions)
 * Reduces LLM calls by 50% for AI players.
 */
export const getAITurnPromptAndSchema = (player: Player, gameState: GameState, previousRoundActions: PlayerRoundActions[] | null) => {
    let previousActionsText = "This is the first round, so no actions have been taken yet.";
    if (previousRoundActions && previousRoundActions.length > 0) {
        previousActionsText = "Here are the actions taken by all roles in the previous round:\n" +
            previousRoundActions.map(pa => {
                const actionTitles = pa.actions.length > 0 ? pa.actions.map(a => a.title).join(", ") : 'Took no action';
                return `  - ${pa.roleName}: ${actionTitles}.`
            }).join("\n");
    }

    const prompt = `
      You are both the Game Master AND an AI player in 'Crisis Command'. You must perform two tasks in sequence:

      TASK 1: GENERATE OPTIONS (as Game Master)
      Generate 5 distinct, strategic action options for this player.

      THE PLAYER YOU'RE GENERATING FOR:
      - Role: ${player.role.name}
      - Public Objective: "${player.role.publicObjective}"
      - HIDDEN Objective: "${player.role.hiddenObjective}"

      THE CURRENT CRISIS:
      - "${gameState.currentEvent?.headline}" - ${gameState.currentEvent?.detail}

      CONTEXT FROM LAST ROUND:
${previousActionsText}

      OPTION DESIGN RULES:
      1. **Create 5 Unique Options:** Genuinely different from each other.
      2. **Ensure Coherence:** Logical evolution from previous round. React to what happened.
      3. **Tailor to Role:** Authentic to this player's capabilities and position.
      4. **Create Strategic Tension:**
         - At least 2 options clearly serve the public objective
         - At least 2 subtly serve the hidden objective
         - 1 could be high-risk/high-reward or unconventional
      5. **Assign Costs:** 1 to ${GAME_CONFIG.ACTION_POINTS_PER_ROUND} points. More impactful = higher cost.
      6. **Clear Descriptions:** Help understand intent without revealing exact outcome.

      TASK 2: CHOOSE ACTIONS (as AI Player)
      Now, role-play as ${player.role.name}. From the 5 options you just generated, choose which actions to take.

      YOUR PERSONA:
      - Publicly, you want: "${player.role.publicObjective}"
      - Secretly, your true goal is: "${player.role.hiddenObjective}" ← THIS is your real priority

      YOUR CONSTRAINTS:
      - You have ${GAME_CONFIG.ACTION_POINTS_PER_ROUND} action points total
      - Choose actions that add up to your budget
      - Choose actions that best serve your HIDDEN objective
      - Empty array [] is valid if inaction is most strategic
      - Chosen actions MUST be exact copies from your options list

      Respond with a JSON object containing:
      - 'options': All 5 options you generated
      - 'chosenActions': The specific options you selected (must be from 'options')
      - 'reasoning': 1-2 sentences explaining why these choices advance your hidden goal

      Your response must match the provided schema exactly.
    `;
    return { prompt, schema: AITurnSchema };
};
