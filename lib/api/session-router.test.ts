import { describe, it, expect } from 'vitest';
import { handleSessionRequest, makeTestRouterDeps } from './session-router';

async function parse(res: Response) {
  const body = res.status === 304 ? null : await res.json();
  return { res, body } as const;
}

describe('session-router (pure)', () => {
  it('POST /session creates a new session', async () => {
    const deps = makeTestRouterDeps();
    const { res, body } = await parse(await handleSessionRequest('POST', [], {}, { mode: 'classic' }, deps));
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toMatch(/^sess_/);
    expect(res.headers.get('etag')).toBe('1');
  });

  it('POST /session tolerates invalid setup and still creates', async () => {
    const deps = makeTestRouterDeps();
    const badSetup = { scenarioTitle: 't', coreMetric: { name: 'Trust', description: 'desc' } }; // missing value
    const { res, body } = await parse(await handleSessionRequest('POST', [], {}, { mode: 'classic', setup: badSetup }, deps));
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toMatch(/^sess_/);
  });

  it('GET /session/:id returns 304 with If-None-Match', async () => {
    const deps = makeTestRouterDeps();
    const created = await parse(await handleSessionRequest('POST', [], {}, { mode: 'classic' }, deps));
    const id = created.body.data.id;
    const res = await handleSessionRequest('GET', [id], { 'if-none-match': '1' }, null, deps);
    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe('1');
  });

  it('PATCH /session/:id bumps revision with If-Match', async () => {
    const deps = makeTestRouterDeps();
    const created = await parse(await handleSessionRequest('POST', [], {}, { mode: 'classic' }, deps));
    const id = created.body.data.id;
    const { res, body } = await parse(await handleSessionRequest('PATCH', [id], { 'if-match': '1' }, { patch: { maxRounds: 6 } }, deps));
    expect(res.status).toBe(200);
    expect(body.data.revision).toBe(2);
    expect(res.headers.get('etag')).toBe('2');
  });

  it('POST /session/:id/join returns a player token', async () => {
    const deps = makeTestRouterDeps();
    const created = await parse(await handleSessionRequest('POST', [], {}, { mode: 'classic' }, deps));
    const id = created.body.data.id;
    const { res, body } = await parse(await handleSessionRequest('POST', [id, 'join'], {}, { name: 'Alice' }, deps));
    expect(res.status).toBe(200);
    expect(body.data.playerToken).toMatch(/^player_/);
  });

  it('POST /session/:id/action-options returns options', async () => {
    const deps = makeTestRouterDeps();
    const created = await parse(await handleSessionRequest('POST', [], {}, { mode: 'classic' }, deps));
    const id = created.body.data.id;
    const { res, body } = await parse(await handleSessionRequest('POST', [id, 'action-options'], {}, { playerId: 'human' }, deps));
    expect(res.status).toBe(200);
    expect(body.data.options.length).toBeGreaterThan(0);
  });

  it('POST actions then advance (host only) increments round and sets ETag', async () => {
    const deps = makeTestRouterDeps();
    const created = await parse(await handleSessionRequest('POST', [], {}, { mode: 'classic' }, deps));
    const id = created.body.data.id;
    // submit actions with If-Match 1
    const s1 = await parse(await handleSessionRequest('POST', [id, 'actions'], { 'if-match': '1' }, { playerId: 'human', actions: [] }, deps));
    expect(s1.res.status).toBe(200);
    expect(s1.res.headers.get('etag')).toBe('2');
    // advance with host token and If-Match 2
    const hostToken = created.body.data.hostToken;
    const adv = await parse(await handleSessionRequest('POST', [id, 'advance'], { 'if-match': '2', 'x-host-token': hostToken }, {}, deps));
    expect(adv.res.status).toBe(200);
    expect(adv.body.data.state.round).toBe(1);
    expect(adv.res.headers.get('etag')).toBe('3');
    // Snapshot only stable fields to avoid random ids/tokens
    expect({
      status: adv.res.status,
      etag: adv.res.headers.get('etag'),
      revision: adv.body.data.revision,
      round: adv.body.data.state.round,
    }).toMatchInlineSnapshot({
      etag: '3',
      revision: 3,
      round: 1,
      status: 200,
    }, `
      {
        "etag": "3",
        "revision": 3,
        "round": 1,
        "status": 200,
      }
    `);
  });

  it('debrief returns summary (snapshot)', async () => {
    const deps = makeTestRouterDeps();
    const created = await parse(await handleSessionRequest('POST', [], {}, { mode: 'classic' }, deps));
    const id = created.body.data.id;
    const resp = await parse(await handleSessionRequest('POST', [id, 'debrief'], {}, {}, deps));
    expect(resp.res.status).toBe(200);
    expect(resp.body).toMatchInlineSnapshot({
      data: { keyEvents: [], summary: 'ok', userActions: [] },
      success: true,
    }, `
      {
        "data": {
          "keyEvents": [],
          "summary": "ok",
          "userActions": [],
        },
        "success": true,
      }
    `);
  });
});
