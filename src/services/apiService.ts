import { GameState } from '../../types';

const API_BASE_URL = '/api'; // Assuming a proxy is set up in vite.config.ts

export const createGame = async (hostRole: string): Promise<GameState> => {
    const response = await fetch(`${API_BASE_URL}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_role: hostRole }),
    });
    if (!response.ok) throw new Error('Failed to create game');
    return response.json();
};

export const joinGame = async (gameId: string, chosenRole: string): Promise<GameState> => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chosen_role: chosenRole }),
    });
    if (!response.ok) throw new Error('Failed to join game');
    return response.json();
};

export const startGame = async (gameId: string): Promise<GameState> => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/start`, {
        method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to start game');
    return response.json();
};

export const submitActions = async (gameId: string, playerId: string, chosenActionIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, chosen_action_ids: chosenActionIds }),
    });
    if (!response.ok) throw new Error('Failed to submit actions');
    return response.json();
};

export const getActionOptions = async (gameId: string, playerId: string) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/actions/${playerId}`);
    if (!response.ok) throw new Error('Failed to fetch action options');
    return response.json();
};