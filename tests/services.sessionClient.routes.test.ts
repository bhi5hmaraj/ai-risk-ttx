import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as client from '../services/sessionClient';

const ok = (data: any, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ success: true, data }), { status, headers: { 'Content-Type': 'application/json', ...headers } });

describe('services/sessionClient (routes & headers)', () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as any).fetch = vi.fn();
  });

  it('createSession POSTs to /api/session', async () => {
    (fetch as any).mockResolvedValueOnce(ok({ id: 'sess_1', revision: 1, hostToken: 'host', state: {} }, 201));
    const res = await client.createSession({ mode: 'classic' });
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/session');
    expect(call[1].method).toBe('POST');
    expect(res.id).toBe('sess_1');
  });

  it('getSession sends If-None-Match when sinceRevision provided and handles 304', async () => {
    (fetch as any).mockResolvedValueOnce(new Response(null, { status: 304, headers: { ETag: '1' } }));
    const res = await client.getSession('sess_x', 1);
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/session/sess_x');
    expect(call[1].headers['If-None-Match']).toBe('1');
    expect(res).toBeNull();
  });

  it('patchSession sends If-Match header', async () => {
    (fetch as any).mockResolvedValueOnce(ok({ id: 'sess_x', state: {}, revision: 2 }));
    await client.patchSession('sess_x', { maxRounds: 6 }, 1);
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/session/sess_x');
    expect(call[1].method).toBe('PATCH');
    expect(call[1].headers['If-Match']).toBe('1');
  });

  it('submitActions sends If-Match and playerId/actions', async () => {
    (fetch as any).mockResolvedValueOnce(ok({ id: 'sess_x', state: {}, revision: 3, submitted: { human: true } }));
    await client.submitActions('sess_x', 'human', [], 2);
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/session/sess_x/actions');
    expect(call[1].headers['If-Match']).toBe('2');
    const sent = JSON.parse(call[1].body);
    expect(sent.playerId).toBe('human');
    expect(Array.isArray(sent.actions)).toBe(true);
  });

  it('getActionOptions POSTs to /api/session/:id/action-options (with roleName)', async () => {
    (fetch as any).mockResolvedValueOnce(ok({ options: [] }));
    await client.getActionOptions('sess_x', 'human', 'Tech CEO');
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/session/sess_x/action-options');
    expect(call[1].method).toBe('POST');
    const sent = JSON.parse(call[1].body);
    expect(sent.playerRoleName).toBe('Tech CEO');
  });

  it('advance sends If-Match and host header', async () => {
    (fetch as any).mockResolvedValueOnce(ok({ id: 'sess_x', state: { round: 1 }, revision: 4 }));
    await client.advance('sess_x', 3, 'host_abc');
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/session/sess_x/advance');
    expect(call[1].headers['If-Match']).toBe('3');
    expect(call[1].headers['x-host-token']).toBe('host_abc');
  });
});
