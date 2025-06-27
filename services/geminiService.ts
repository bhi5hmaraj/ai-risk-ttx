import { GoogleGenAI } from "@google/genai";
import type { GameState, Player, AIConsequenceResponse, ActionOption, AIActionOptionsResponse } from '../types';
import { 
    getInitialScenarioPromptAndSchema,
    getConsequencesPromptAndSchema,
    getAIPlayerActionsPromptAndSchema,
    getActionOptionsPromptAndSchema 
} from '../prompts';


if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set. This application requires a valid Google Gemini API key to function.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const safeJsonParse = <T,>(jsonString: string): T | null => {
  try {
    let cleanString = jsonString;
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanString.match(fenceRegex);
    if (match && match[1]) {
      cleanString = match[1].trim();
    }
    return JSON.parse(cleanString);
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    console.error("Original string:", jsonString);
    return null;
  }
};

export const generateInitialScenario = async (): Promise<AIConsequenceResponse | null> => {
    console.log('[GEMINI_API] Calling generateInitialScenario...');
    const { prompt, schema } = getInitialScenarioPromptAndSchema();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        console.log('[GEMINI_API] Successfully received response for generateInitialScenario.');
        return safeJsonParse<AIConsequenceResponse>(response.text);
    } catch (error) {
        console.error("Error generating initial scenario:", error);
        return null;
    }
};

export const generateConsequences = async (gameState: GameState, players: Player[]): Promise<AIConsequenceResponse | null> => {
    console.log(`[GEMINI_API] Calling generateConsequences for round ${gameState.round}...`);
    const { prompt, schema } = getConsequencesPromptAndSchema(gameState, players);
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        console.log(`[GEMINI_API] Successfully received response for generateConsequences for round ${gameState.round}.`);
        return safeJsonParse<AIConsequenceResponse>(response.text);
    } catch (error) {
        console.error("Error generating consequences:", error);
        return null;
    }
};

export const generateAIPlayerActions = async (player: Player, gameState: GameState): Promise<ActionOption[] | null> => {
    console.log(`[GEMINI_API] Calling generateAIPlayerActions for ${player.role.name} in round ${gameState.round}...`);
    const { prompt, schema } = getAIPlayerActionsPromptAndSchema(player, gameState);
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        console.log(`[GEMINI_API] Successfully received response for generateAIPlayerActions for ${player.role.name}.`);
        const parsed = safeJsonParse<{actions: ActionOption[]}>(response.text);
        return parsed ? parsed.actions : [];
    } catch (error) {
        console.error(`Error generating actions for AI player ${player.role.name}:`, error);
        return null;
    }
};

export const generateActionOptions = async (player: Player, gameState: GameState): Promise<AIActionOptionsResponse | null> => {
    console.log(`[GEMINI_API] Calling generateActionOptions for ${player.role.name} in round ${gameState.round}...`);
    const { prompt, schema } = getActionOptionsPromptAndSchema(player, gameState);
    try {
         const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        console.log(`[GEMINI_API] Successfully received response for generateActionOptions for ${player.role.name}.`);
        return safeJsonParse<AIActionOptionsResponse>(response.text);
    } catch(error) {
        console.error("Error generating action options:", error);
        return null;
    }
}