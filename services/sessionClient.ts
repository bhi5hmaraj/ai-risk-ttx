/**
 * Client for Session API (server-authoritative state).
 * Consolidated under /api/session/[[...parts]] to stay under Vercel limits.
 */

import type { GameSetup, ActionOption } from '../types/core';
import { api } from './http';

const BASE = '/api/session';
const DEFAULT_TIMEOUT = 30000; // 30 seconds for normal operations
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds for health checks (Redis cold start can take 6s)

async function fetchJson(url: string, init?: RequestInit, timeoutMs: number = DEFAULT_TIMEOUT) {
  try {
    const res = await api(url, { ...init, timeout: timeoutMs });
    const rid = res.headers?.get('x-req-id') || undefined;
    try { console.log('[SessionClient]', init?.method || 'GET', url, 'status=', res.status, rid ? `rid=${rid}` : ''); } catch {}
    if (res.status === 304) return { res, body: null } as const;
    const body = await res.json().catch(() => ({ success: false, error: 'Invalid JSON response from server' }));
    return { res, body } as const;
  } catch (err: any) {
    // Ky throws for network/timeout; normalize messages
    const msg = err?.message || 'Unknown error';
    if (/Timeout/i.test(msg)) {
      throw new Error(`Backend connection timeout after ${timeoutMs / 1000}s. Please check your network connection and try again.`);
    }
    throw new Error(`Network error: ${msg}`);
  }
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
  const doPost = () =>
    fetchJson(`${BASE}/${id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'If-Match': String(expectedRevision) },
      body: JSON.stringify({ playerId, actions }),
    });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // First attempt
  let { res, body } = await doPost();
  if (body?.success) {
    return body.data as { id: string; state: any; revision: number; submitted: Record<string, boolean> };
  }

  // Stop-gap: warm + retry once on Not Found (cold instance or read-after-write race)
  const isNotFound = res.status === 404 || (res.status === 500 && /not\s*found/i.test(String(body?.error || '')));
  if (isNotFound) {
    try {
      // Warm the instance cache and retry once with a tiny backoff
      await getSession(id).catch(() => null);
      await sleep(120);
      const retry = await doPost();
      res = retry.res;
      body = retry.body;
      if (body?.success) {
        return body.data as { id: string; state: any; revision: number; submitted: Record<string, boolean> };
      }
    } catch {
      // fallthrough to throw below
    }
  }

  // If we’re here, either it wasn’t retryable or retry failed
  throw new Error(body?.error || `HTTP ${res.status}`);
}

export async function advance(
  id: string,
  expectedRevision: number,
  hostToken: string,
  bodyPayload?: { humanRoleName?: string; humanPlayerId?: string; humanActions?: ActionOption[]; humanAvailableOptions?: ActionOption[] }
) {
  // Use 5-minute timeout for advance (LLM calls can take 60s+)
  const { res, body } = await fetchJson(`${BASE}/${id}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'If-Match': String(expectedRevision), 'x-host-token': hostToken },
    body: JSON.stringify(bodyPayload ?? {}),
  }, 300000); // 5 minutes
  if (!body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  return body.data as { id: string; state: any; revision: number; players?: any[]; setup?: any; submitted?: Record<string, boolean> };
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

/**
 * Health check - tests backend infrastructure (API + session store)
 * Returns detailed health status including latency metrics
 */
export async function healthCheck(): Promise<{
  success: boolean;
  api: boolean;
  store: string;
  storeLatency: number;
  timestamp: number;
  error?: string;
}> {
  try {
    const { res, body } = await fetchJson(`${BASE}/health`, { method: 'GET' }, HEALTH_CHECK_TIMEOUT);

    if (res.status === 200 && body?.success) {
      return {
        success: true,
        api: body.data.api,
        store: body.data.store,
        storeLatency: body.data.storeLatency,
        timestamp: body.data.timestamp,
      };
    }

    // 503 means backend is up but store is down
    if (res.status === 503) {
      return {
        success: false,
        api: true,
        store: body?.data?.store || 'error',
        storeLatency: body?.data?.storeLatency || 0,
        timestamp: body?.data?.timestamp || Date.now(),
        error: body?.data?.storeError || 'Session store unavailable',
      };
    }

    throw new Error(`Health check failed: HTTP ${res.status}`);
  } catch (err: any) {
    return {
      success: false,
      api: false,
      store: 'unknown',
      storeLatency: 0,
      timestamp: Date.now(),
      error: err.message || 'Health check failed',
    };
  }
}
