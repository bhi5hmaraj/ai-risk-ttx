import { describe, it, beforeEach, vi } from 'vitest';
import * as client from '../../services/sessionClient';

const ok = (data: any, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ success: true, data }), { status, headers: { 'Content-Type': 'application/json', ...headers } });

/**
 * Learning test: headers and payloads. Fill in the commented assertions.
 */
describe('Learning: sessionClient headers (incomplete asserts)', () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as any).fetch = vi.fn();
  });

  it('submitActions sends correct headers and body fields', async () => {
    (fetch as any).mockResolvedValueOnce(ok({ id: 'sess_x', state: {}, revision: 3, submitted: { human: true } }));

    await client.submitActions('sess_x', 'human', [], 2);

    const call = (fetch as any).mock.calls[0];
    const url = call[0];
    const init = call[1];

    // TODO: Fill expected values
    // expect(url).toBe(/* '/api/session/.../actions' */);
    // expect(init.headers['If-Match']).toBe(/* expected revision as string */);
    // const body = JSON.parse(init.body);
    // expect(body.playerId).toBe(/* 'human' */);
    // expect(Array.isArray(body.actions)).toBe(/* true */);
  });

  it('advance sends host token and If-Match', async () => {
    (fetch as any).mockResolvedValueOnce(ok({ id: 'sess_x', state: {}, revision: 4 }));

    await client.advance('sess_x', 3, 'host_abc');

    const call = (fetch as any).mock.calls[0];
    const init = call[1];

    // TODO: Fill expected values
    // expect(init.headers['If-Match']).toBe(/* '3' */);
    // expect(init.headers['x-host-token']).toBe(/* 'host_abc' */);
  });
});

