import { describe, it, expect } from 'vitest';
import { handleSessionRequest, makeTestRouterDeps } from '../lib/api/session-router';
import { createValidGameSetup } from './fixtures/session-data';

async function parse(res: Response) {
  const body = res.status === 304 ? null : await res.json();
  return { res, body } as const;
}

describe('E2E (pure) — session golden path', () => {
  it('create → join → options → actions → advance → debrief', async () => {
    const deps = makeTestRouterDeps();

    // 1) Create session
    const create = await parse(await handleSessionRequest('POST', [], {}, { mode: 'classic', setup: createValidGameSetup() }, deps));
    expect(create.res.status).toBe(201);
    const id = create.body.data.id as string;
    let rev = Number(create.res.headers.get('etag'));
    const hostToken = create.body.data.hostToken as string;

    // 2) Join session
    const join = await parse(await handleSessionRequest('POST', [id, 'join'], {}, { name: 'Alice' }, deps));
    expect(join.res.status).toBe(200);
    const playerToken = join.body.data.playerToken as string;
    expect(playerToken).toMatch(/^player_/);

    // 3) Get action options for the human
    const options = await parse(await handleSessionRequest('POST', [id, 'action-options'], {}, { playerId: 'human' }, deps));
    expect(options.res.status).toBe(200);
    expect(options.body.data.options.length).toBeGreaterThan(0);

    // 4) Submit actions with If-Match: rev
    const submit = await parse(
      await handleSessionRequest('POST', [id, 'actions'], { 'if-match': String(rev) }, { playerId: 'human', actions: [] }, deps)
    );
    expect(submit.res.status).toBe(200);
    rev = Number(submit.res.headers.get('etag'));
    expect(rev).toBeGreaterThan(1);

    // 5) Advance with host token
    const advance = await parse(
      await handleSessionRequest('POST', [id, 'advance'], { 'if-match': String(rev), 'x-host-token': hostToken }, {}, deps)
    );
    expect(advance.res.status).toBe(200);
    expect(advance.body.data.state.round).toBe(1);
    rev = Number(advance.res.headers.get('etag'));

    // 6) Debrief
    const deb = await parse(await handleSessionRequest('POST', [id, 'debrief'], {}, {}, deps));
    expect(deb.res.status).toBe(200);
    expect(deb.body.data.summary).toBeDefined();
  });
});
