import * as sessionClient from '@/services/sessionClient';
import type { ActionOption, GameSetup } from '@/types';

export class SessionService {
  static async create(args: { mode: 'classic' | 'ai_safety' | 'custom'; setup?: GameSetup; maxRounds?: number; aiPlayers?: number }) {
    return sessionClient.createSession(args);
  }

  static async get(sessionId: string, sinceRevision?: number) {
    return sessionClient.getSession(sessionId, sinceRevision);
  }

  static async patch(sessionId: string, patch: { maxRounds?: number; aiPlayers?: number }, expectedRevision: number) {
    return sessionClient.patchSession(sessionId, patch, expectedRevision);
  }

  static async join(sessionId: string, name: string) {
    return sessionClient.joinSession(sessionId, name);
  }

  static async getActionOptions(sessionId: string, playerId: string, playerRoleName: string) {
    return sessionClient.getActionOptions(sessionId, playerId, playerRoleName);
  }

  static async submitActions(sessionId: string, playerId: string, actions: ActionOption[], expectedRevision: number) {
    return sessionClient.submitActions(sessionId, playerId, actions, expectedRevision);
  }

  static async initialize(sessionId: string) {
    return sessionClient.initializeSession(sessionId);
  }

  static async advance(
    sessionId: string,
    expectedRevision: number,
    hostToken: string,
    body?: { humanRoleName?: string; humanPlayerId?: string; humanActions?: ActionOption[]; humanAvailableOptions?: ActionOption[] }
  ) {
    return sessionClient.advance(sessionId, expectedRevision, hostToken, body);
  }

  static createEventSource(sessionId: string): EventSource {
    return new EventSource(`/api/session/${sessionId}/stream`);
  }

  static async healthCheck() {
    return sessionClient.healthCheck();
  }
}

