/**
 * Client for Session API (server-authoritative state).
 * Consolidated under /api/session/[[...parts]] to stay under Vercel limits.
 */

import type { GameSetup, ActionOption } from '../types/core';

const BASE = '/api/session';

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const rid = res.headers?.get('x-req-id') || undefined;
  try {
    console.log('[SessionClient]', init?.method || 'GET', url, 'status=', res.status, rid ? `rid=${rid}` : '');
  } catch {}
  if (res.status === 304) return { res, body: null } as const;
  const body = await res.json().catch(() => ({ success: false, error: 'Invalid JSON' }));
  return { res, body } as const;
}

export async function createSession(args: { mode: 'classic' | 'ai_safety' | 'custom'; setup?: GameSetup; maxRounds?: number; aiPlayers?: number; }) {
  const { res, body } = await fetchJson(`${BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  return body.data as { id: string; revision: number; hostToken: string; state: any };
}

export async function getSession(id: string, sinceRevision?: number) {
  const headers: Record<string, string> = {};
  if (sinceRevision != null) headers['If-None-Match'] = String(sinceRevision);
  const { res, body } = await fetchJson(`${BASE}/${id}`, { headers });
  if (res.status === 304) return null;
  if (!body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  return body.data as { id: string; state: any; revision: number; deadlineAt?: string | null; submitted?: Record<string, boolean> };
}

export async function patchSession(id: string, patch: { maxRounds?: number; aiPlayers?: number }, expectedRevision: number) {
  const { res, body } = await fetchJson(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'If-Match': String(expectedRevision) },
    body: JSON.stringify({ patch }),
  });
  if (!body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  return body.data as { id: string; state: any; revision: number };
}

export async function joinSession(id: string, name: string) {
  const { res, body } = await fetchJson(`${BASE}/${id}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  return body.data as { playerToken: string };
}

export async function getActionOptions(id: string, playerId: string, playerRoleName?: string) {
  const { res, body } = await fetchJson(`${BASE}/${id}/action-options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, playerRoleName }),
  });
  if (!body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  return body.data as { options: ActionOption[] };
}

export async function submitActions(id: string, playerId: string, actions: ActionOption[], expectedRevision: number) {
  const { res, body } = await fetchJson(`${BASE}/${id}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'If-Match': String(expectedRevision) },
    body: JSON.stringify({ playerId, actions }),
  });
  if (!body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  return body.data as { id: string; state: any; revision: number; submitted: Record<string, boolean> };
}

export async function advance(
  id: string,
  expectedRevision: number,
  hostToken: string,
  bodyPayload?: { humanRoleName?: string; humanPlayerId?: string; humanActions?: ActionOption[]; humanAvailableOptions?: ActionOption[] }
) {
  const { res, body } = await fetchJson(`${BASE}/${id}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'If-Match': String(expectedRevision), 'x-host-token': hostToken },
    body: JSON.stringify(bodyPayload ?? {}),
  });
  if (!body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  return body.data as { id: string; state: any; revision: number };
}

export async function initializeSession(id: string) {
  const { res, body } = await fetchJson(`${BASE}/${id}/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  return body.data as { id: string; state: any; revision: number };
}

export async function debrief(id: string) {
  const { res, body } = await fetchJson(`${BASE}/${id}/debrief`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  if (!body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  return body.data as { summary: string; keyEvents: any[]; userActions: any[] };
}
