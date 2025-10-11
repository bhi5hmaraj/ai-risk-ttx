import { RoleName } from './types';
import type { GameState, Player, ActionOption, PlayerRoundActions } from './types';
import { GAME_CONFIG, ROLES } from "./constants";

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
      minItems: Object.keys(ROLES).length,
      maxItems: Object.keys(ROLES).length,
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

const GameSetupSchema = {
    type: "object",
    properties: {
        scenarioTitle: { type: "string", description: "A short, catchy title for the scenario." },
        scenarioDescription: { type: "string", description: "A brief, one-paragraph overview of the starting situation." },
        coreMetric: {
            type: "object",
            properties: {
                name: { type: "string", description: "The name of the central score for this scenario (e.g., 'Public Trust', 'Market Stability')." },
                description: { type: "string", description: "A brief explanation of what this score represents." },
                initialValue: { type: "number", description: "The starting value for the score, typically between 70 and 100." }
            },
            required: ['name', 'description', 'initialValue']
        },
        stakeholders: {
            type: "array",
            description: "A list of 4 to 6 relevant and distinct stakeholder roles for this scenario.",
            minItems: 4,
            maxItems: 6,
            items: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The title of the stakeholder role (e.g., 'Lead Cyberneticist', 'Chief Medical Officer')." },
                    publicObjective: { type: "string", description: "The stated, public-facing goal of this role." },
                    hiddenObjective: { type: "string", description: "The secret, personal, or institutional goal that this role is trying to achieve." }
                },
                required: ['name', 'publicObjective', 'hiddenObjective']
            }
        }
    },
    required: ['scenarioTitle', 'scenarioDescription', 'coreMetric', 'stakeholders']
} as const;


/**
 * Generates the prompt for creating the initial game scenario.
 * This prompt asks the AI to act as a Game Master and set the stage.
 */
export const getInitialScenarioPromptAndSchema = () => {
    const prompt = `
      You are a master storyteller and the Game Master for 'Crisis Command', a serious simulation game.
      Your primary task is to establish a tense, realistic, and thought-provoking starting scenario.
      The game begins with the 'Democratic Legitimacy' score at a fragile 100.

      Tell the story in a way that players can scan quickly:
      - Use the 'roundSummary' field for a tight plain-language recap (no more than 3 sentences).
      - Populate the 'outcomeTimeline' array with 3 to 4 chronological beats. Each beat should have a short title, a couple of sentences, and an explicit "impact" line tying back to how the crisis affects Democratic Legitimacy or the players.
      - The 'counterfactualNote' should begin with "If no one had acted..." and briefly explain the expected score change (remember, this is the first round so reference the escalating crisis rather than player decisions).

      Here are your strict instructions for the response:
      1.  Generate that structured summary plus a specific, actionable crisis event.
      2.  The 'publicScoreUpdate' field MUST be a significant negative integer. A value between -15 and -25 is ideal to create immediate tension. The game will start at (100 + this value).
      3.  For the 'hiddenScoreUpdates', every role MUST be present. Each must have an 'update' of 0 and a 'justification' of 'Game start.'. This is a non-negotiable setup requirement.

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
 */
export const getConsequencesPromptAndSchema = (gameState: GameState, players: Player[], counterfactualScoreChange: number) => {
    const playerActionsText = players.map(p => {
        const actionTitles = p.actions.length > 0 ? p.actions.map(a => a.title).join(", ") : 'Took no action';
        return `  - ${p.role.name} (Secret Goal: ${p.role.hiddenObjective}): ${actionTitles}.`
    }).join("\n");

    const prompt = `
      You are the Game Master for 'Crisis Command', and you are the impartial arbiter of consequences.
      Your task is to analyze the players' actions in response to the crisis and return a crisp, structured recap. The world reacts to their choices.

      CURRENT SITUATION:
      - Round: ${gameState.round}
      - ${gameState.coreMetric.name}: ${gameState.coreMetric.value}
      - The Crisis: "${gameState.currentEvent?.headline}" - ${gameState.currentEvent?.detail}

      PLAYER ACTIONS TAKEN:
      ${playerActionsText}

      Now, determine the outcome. Your response must be logical and fair.
      1.  **Round Summary:** Populate the 'roundSummary' field with 2-3 sentences that clearly explain what happened and why the ${gameState.coreMetric.name} score changed, explicitly naming the most important player actions.
      2.  **Outcome Timeline:** Fill the 'outcomeTimeline' array with 3-5 chronological beats. Each beat needs a short headline (title), 1-2 sentences of description, and an "impact" string that connects the beat back to the core metric or a player objective.
      3.  **Counterfactual Note:** In the 'counterfactualNote' field, start with "If no one had acted..." and explain that the score would have changed by ${counterfactualScoreChange} points and why.
      4.  **Public Score Update:** Provide an integer change to the public score. This should be a direct result of the summary and timeline.
      5.  **Hidden Score Updates:** For EACH player, provide a hidden score update. The justification MUST be incisive and directly reference how their actions moved them closer to or further from their secret objective.
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
      4.  **Create Strategic Tension:** Design the options to create a difficult choice.
          - At least two options should clearly serve the public objective.
          - At least two should subtly serve the hidden objective.
          - One option could be a high-risk/high-reward gamble, a compromise, or an unconventional idea.
      5.  **Assign Logical Costs:** Each action must have a cost from 1 to ${GAME_CONFIG.ACTION_POINTS_PER_ROUND}. More impactful or complex actions should cost more.
      6.  **Write Clear Descriptions:** The description should help the player understand the action's intent and potential effects without revealing the exact mechanical outcome.

      Respond ONLY with a valid JSON object matching the provided schema.
    `;
    return { prompt, schema: AIActionOptionsResponseSchema };
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

export const getCustomScenarioPromptAndSchema = (scenarioDescription: string) => {
    const prompt = `
      You are a world-class Game Designer and Storyteller. Your task is to take a user's idea for a crisis and transform it into a complete, playable setup for a strategic simulation game.

      USER'S SCENARIO IDEA:
      "${scenarioDescription}"

      Based on this idea, you must design all the core components of the game. Your response must be a single, valid JSON object that conforms to the provided schema.

      Here are your design instructions:
      1.  **Scenario Title & Description:** Invent a catchy, evocative title and write a compelling one-paragraph description that sets the scene and establishes the stakes.
      2.  **Core Metric:**
          -   Invent a central game score that is thematic to the scenario. Instead of "Democratic Legitimacy," it could be "Global Economic Stability," "Public Health Confidence," or "Inter-species Trust."
          -   The 'initialValue' MUST be an integer between 70 and 100. This represents a high but fragile starting point.
      3.  **Stakeholders (4-6 Roles):**
          -   Create a cast of 4 to 6 distinct, believable stakeholder roles. These should be the key players in the crisis.
          -   **Crucially, their objectives must create tension and potential conflict.** Give them reasons to disagree and compete.
          -   The 'publicObjective' should be what they say they want in press conferences.
          -   The 'hiddenObjective' should be their true, often selfish or controversial, goal. This is the key to strategic gameplay. Avoid generic goals; make them specific and compelling.

      Be creative, insightful, and strategic in your design. The quality of the game depends on the rich conflict you build into this setup.
    `;
    return { prompt, schema: GameSetupSchema };
};
