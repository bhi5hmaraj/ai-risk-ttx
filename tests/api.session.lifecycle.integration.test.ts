import { describe, it, expect } from 'vitest'
import { handleSessionRequest, makeTestRouterDeps } from '@/server/api/session-router'

function headers(h: Record<string, string>): Record<string, string> { return h }

async function json(res: Response) { return await res.json() as any }

describe('Session lifecycle (integration, pure router)', () => {
  it('create → initialize → options → actions → advance → debrief', async () => {
    const deps = makeTestRouterDeps()

    const setup = {
      scenarioTitle: 'Election Security Crisis',
      scenarioDescription: 'Crisis threatens democratic legitimacy',
      coreMetric: { name: 'Trust', description: 'desc', value: 75 },
      stakeholders: [
        { name: 'Tech CEO', icon: '💻', publicObjective: 'Integrity', hiddenObjective: 'Valuation', resources: ['Infra'], constraints: ['PR'] },
        { name: 'Journalist', icon: '📰', publicObjective: 'Truth', hiddenObjective: 'Career', resources: ['Media'], constraints: ['Verification'] },
        { name: 'Regulator', icon: '⚖️', publicObjective: 'Law', hiddenObjective: 'Authority', resources: ['Legal'], constraints: ['Oversight'] },
        { name: 'Cybersec', icon: '🛡️', publicObjective: 'Security', hiddenObjective: 'Reputation', resources: ['Tools'], constraints: ['Resources'] },
      ],
      maxRounds: null,
      maxAIPlayers: null,
    }

    // Create
    const createRes = await handleSessionRequest('POST', [], headers({ 'content-type': 'application/json' }), { mode: 'classic', setup }, deps)
    expect(createRes.status).toBe(201)
    const createBody = await json(createRes)
    expect(createBody.success).toBe(true)
    const { id, revision } = createBody.data
    expect(revision).toBe(1)

    // Initialize
    const initRes = await handleSessionRequest('POST', [id, 'initialize'], headers({ 'content-type': 'application/json' }), {}, deps)
    expect(initRes.status).toBe(200)
    const initBody = await json(initRes)
    expect(initBody.success).toBe(true)
    const rev2 = initBody.data.revision
    expect(rev2).toBeGreaterThan(revision)

    // Options for human
    const optRes = await handleSessionRequest('POST', [id, 'action-options'], headers({ 'content-type': 'application/json' }), { playerId: 'human_player', playerRoleName: 'Tech CEO' }, deps)
    expect(optRes.status).toBe(200)
    const optBody = await json(optRes)
    expect(optBody.success).toBe(true)
    expect(Array.isArray(optBody.data.options)).toBe(true)

    // Submit actions with If-Match: latest revision
    const actRes = await handleSessionRequest('POST', [id, 'actions'], headers({ 'content-type': 'application/json', 'if-match': String(rev2) }), { playerId: 'human_player', actions: [] }, deps)
    expect(actRes.status).toBe(200)
    const actBody = await json(actRes)
    const rev3 = actBody.data.revision
    expect(rev3).toBeGreaterThan(rev2)

    // Advance with host header
    const host = createBody.data.hostToken as string
    const advRes = await handleSessionRequest('POST', [id, 'advance'], headers({ 'content-type': 'application/json', 'if-match': String(rev3), 'x-host-token': host }), {}, deps)
    expect(advRes.status).toBe(200)
    const advBody = await json(advRes)
    expect(advBody.success).toBe(true)
    expect(advBody.data.state.round).toBeGreaterThanOrEqual(2)

    // Debrief
    const debriefRes = await handleSessionRequest('POST', [id, 'debrief'], headers({ 'content-type': 'application/json' }), {}, deps)
    expect(debriefRes.status).toBe(200)
    const debriefBody = await json(debriefRes)
    expect(debriefBody.success).toBe(true)
    expect(typeof debriefBody.data.summary).toBe('string')
  })
})

