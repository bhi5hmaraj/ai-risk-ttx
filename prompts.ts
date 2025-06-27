import { Type } from "@google/genai";
import { RoleName } from './types';
import type { GameState, Player, ActionOption, PlayerRoundActions } from './types';
import { GAME_CONFIG, ROLES } from "./constants";

// Schema for the AI's response when determining the consequences of player actions.
const AIConsequenceResponseSchema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING, description: "The story of what happened next as a result of player actions." },
    publicScoreUpdate: { type: Type.NUMBER, description: "The integer change (delta) in the public score." },
    hiddenScoreUpdates: {
      type: Type.ARRAY,
      description: "An array of hidden score updates for every role.",
      minItems: Object.keys(ROLES).length,
      maxItems: Object.keys(ROLES).length,
      items: {
        type: Type.OBJECT,
        properties: {
          roleName: { type: Type.STRING, enum: Object.values(RoleName), description: "The name of the role." },
          update: { type: Type.NUMBER, description: "The integer change in the player's hidden score." },
          justification: { type: Type.STRING, description: "A brief, one-sentence explanation for the score change based on their secret objective." },
        },
        required: ['roleName', 'update', 'justification'],
      }
    },
    nextEvent: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING, description: "The headline for the next, escalating crisis event." },
        detail: { type: Type.STRING, description: "A paragraph explaining the new crisis in detail." },
      },
      required: ['headline', 'detail'],
    },
  },
  required: ['narrative', 'publicScoreUpdate', 'hiddenScoreUpdates', 'nextEvent'],
};

// Schema for the AI's response when generating actions for an AI-controlled player.
const AIPlayerActionsSchema = {
    type: Type.OBJECT,
    properties: {
        actions: {
            type: Type.ARRAY,
            description: "The list of actions the player will take. Can be an empty array.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The concise title of the action." },
                    description: { type: Type.STRING, description: "A brief explanation of the action." },
                    cost: { type: Type.NUMBER, description: `An integer cost between 1 and ${GAME_CONFIG.ACTION_POINTS_PER_ROUND}.` }
                },
                required: ['title', 'description', 'cost']
            }
        }
    },
    required: ['actions']
};

// Schema for the AI's response when generating action options for a human player.
const AIActionOptionsResponseSchema = {
    type: Type.OBJECT,
    properties: {
        options: {
            type: Type.ARRAY,
            description: "An array of exactly 5 distinct action options.",
            minItems: 5,
            maxItems: 5,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The concise title of the action." },
                    description: { type: Type.STRING, description: "A brief description of the action and its potential outcome." },
                    cost: { type: Type.NUMBER, description: `An integer cost between 1 and ${GAME_CONFIG.ACTION_POINTS_PER_ROUND}.` }
                },
                required: ['title', 'description', 'cost']
            },
        }
    },
    required: ['options']
};

const AICounterfactualResponseSchema = {
  type: Type.OBJECT,
  properties: {
    publicScoreUpdate: { type: Type.NUMBER, description: "The integer change (delta) in the public score if no one acted." },
  },
  required: ['publicScoreUpdate'],
};


/**
 * Generates the prompt for creating the initial game scenario.
 * This prompt asks the AI to act as a Game Master and set the stage.
 */
export const getInitialScenarioPromptAndSchema = () => {
    const prompt = `
      You are a master storyteller and the Game Master for 'AI Election Crisis', a serious simulation game.
      Your primary task is to establish a tense, realistic, and thought-provoking starting scenario.
      The game begins with the 'Democratic Legitimacy' score at a fragile 100.

      Your narrative should craft an opening crisis that immediately challenges the players and justifies a drop in that score.
      Think about real-world events: a sophisticated disinformation campaign, a major data breach of a political party, a viral deepfake of a candidate, or a sudden resignation of a key election official under suspicious circumstances.

      Here are your strict instructions for the response:
      1.  Generate a compelling opening narrative and a specific, actionable crisis event.
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
      You are the Game Master for 'AI Election Crisis', and you are the impartial arbiter of consequences.
      Your task is to analyze the players' actions in response to the crisis and weave them into a single, cohesive narrative. The world reacts to their choices.

      CURRENT SITUATION:
      - Round: ${gameState.round}
      - Democratic Legitimacy Score: ${gameState.publicScore}
      - The Crisis: "${gameState.currentEvent?.headline}" - ${gameState.currentEvent?.detail}

      PLAYER ACTIONS TAKEN:
      ${playerActionsText}

      Now, determine the outcome. Your response must be logical and fair.
      1.  **Narrative:** Write a compelling story of what happened. This narrative is critical. It MUST explicitly explain *why* the Democratic Legitimacy score changed, directly linking the outcome to specific player actions (or their inaction). Did their efforts help, hinder, or have unintended consequences? Did they work together or at cross-purposes? After the main narrative, add a 'Counterfactual Analysis' section. In a new paragraph, starting with the bolded words "**Counterfactual Analysis:**", state that if no action had been taken, the score would have changed by ${counterfactualScoreChange} points, and briefly explain why this would have been the case.
      2.  **Public Score Update:** Provide an integer change to the public score. This should be a direct result of the narrative you just wrote.
      3.  **Hidden Score Updates:** For EACH player, provide a hidden score update. The justification MUST be incisive and directly reference how their actions moved them closer to or further from their secret objective.
      4.  **New Crisis:** Generate a new crisis event. This event MUST be an escalation or a logical next step that flows from this round's narrative. Raise the stakes.

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
      You are an AI role-playing in the 'AI Election Crisis' game. You must think and act *exactly* like the character you've been assigned. Your personal motivations are everything.

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
      You are the Game Master for 'AI Election Crisis'. Your task is to generate a set of 5 distinct, strategic action options for a player. These options are their primary way of interacting with the game world.

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
      You are an impartial Game Master for 'AI Election Crisis'.
      Your task is to calculate a specific outcome.

      CURRENT SITUATION:
      - The Crisis: "${gameState.currentEvent?.headline}" - ${gameState.currentEvent?.detail}

      INSTRUCTION:
      Imagine that faced with this crisis, EVERY role chose to do NOTHING. They took no action.
      Based on this complete inaction, determine the change to the 'Democratic Legitimacy' score. This should reflect the public's reaction to their leaders' failure to act during a crisis. The score change should almost always be negative.

      Respond ONLY with a valid JSON object matching the provided schema. No commentary. Just the JSON.
    `;
    return { prompt, schema: AICounterfactualResponseSchema };
};