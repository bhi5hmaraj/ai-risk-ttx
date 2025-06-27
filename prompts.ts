import { Type } from "@google/genai";
import { RoleName } from './types';
import type { GameState, Player } from './types';
import { GAME_CONFIG, ROLES } from "./constants";

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


export const getInitialScenarioPromptAndSchema = () => {
    const prompt = `
      You are the Game Master for 'AI Election Crisis', a serious tabletop simulation game.
      Your goal is to create a realistic, challenging, and educational starting scenario for an election crisis simulation.
      The game starts with a 'Democratic Legitimacy' score of 100.
      Generate an initial narrative and an opening crisis event.
      This opening event should cause an initial drop in the score.
      The 'publicScoreUpdate' field must be a negative integer (e.g., -15, -20) representing this initial drop from 100. A value of -20 is recommended to start the game at a score of 80.
      For the 'hiddenScoreUpdates', every role must be included with an update of 0 and a justification of 'Game start.'.
      Respond ONLY with a valid JSON object matching the provided schema.
    `;
    return { prompt, schema: AIConsequenceResponseSchema };
}

export const getConsequencesPromptAndSchema = (gameState: GameState, players: Player[]) => {
    const playerActionsText = players.map(p => {
        const actionTitles = p.actions.map(a => a.title).join(", ");
        return ` - ${p.role.name} (Hidden Objective: ${p.role.hiddenObjective}): took actions "${actionTitles || 'No action'}"`
    }).join("\n");
    
    const prompt = `
      You are the Game Master for 'AI Election Crisis'.
      Analyze the players' actions in response to the current crisis and generate the consequences.

      Current State:
      - Round: ${gameState.round}
      - Democratic Legitimacy Score: ${gameState.publicScore}
      - Current Crisis Event: ${gameState.currentEvent?.headline} - ${gameState.currentEvent?.detail}

      Player Actions this round:
      ${playerActionsText}

      Based on the actions and the crisis, determine the outcome. Your response must include:
      1.  A compelling narrative of what happened as a result of the players' actions (or inaction). This narrative MUST explicitly explain why the 'Democratic Legitimacy' score changed, linking specific player actions (or inactions) to the public perception outcome.
      2.  An update to the public 'Democratic Legitimacy' score (a relative integer, e.g., -5, 10, 0).
      3.  An update for EACH player's hidden score, including a brief justification based on their secret objective.
      4.  A new, escalating crisis event for the next round. The game must end if the public score is 0.

      Respond ONLY with a valid JSON object matching the provided schema.
    `;
    return { prompt, schema: AIConsequenceResponseSchema };
};

export const getAIPlayerActionsPromptAndSchema = (player: Player, gameState: GameState) => {
    const prompt = `
      You are an AI simulating a player in the 'AI Election Crisis' game.
      Choose a set of actions that best achieves your objectives (especially your hidden one) in response to the current crisis.
      The total action cost cannot exceed ${GAME_CONFIG.ACTION_POINTS_PER_ROUND}. An empty array [] is a valid response if no action is optimal.

      Your Role: ${player.role.name}
      Public Objective: ${player.role.publicObjective}
      HIDDEN Objective: ${player.role.hiddenObjective}

      Current State:
      - Crisis: ${gameState.currentEvent?.headline} - ${gameState.currentEvent?.detail}

      Respond ONLY with a valid JSON object matching the provided schema.
    `;
    return { prompt, schema: AIPlayerActionsSchema };
};

export const getActionOptionsPromptAndSchema = (player: Player, gameState: GameState) => {
    const prompt = `
      You are the Game Master for 'AI Election Crisis'.
      Generate a set of 5 distinct, strategic action options for the player based on their role and the current crisis.
      Each action must have a 'cost' between 1 and ${GAME_CONFIG.ACTION_POINTS_PER_ROUND}. More powerful or complex actions should cost more.
      
      Player Role: ${player.role.name}
      Public Objective: ${player.role.publicObjective}
      HIDDEN Objective: ${player.role.hiddenObjective}
      Current Crisis: ${gameState.currentEvent?.headline} - ${gameState.currentEvent?.detail}

      Tailor the actions to the player's role. For example, a Tech CEO can take technical actions, a Journalist can publish stories, etc.
      Some actions should align with the public objective, and some with the hidden objective.

      Respond ONLY with a valid JSON object matching the provided schema.
    `;
    return { prompt, schema: AIActionOptionsResponseSchema };
};