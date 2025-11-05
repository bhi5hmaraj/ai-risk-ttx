/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

import { useGameStore } from '@/stores/gameStore'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useActionStore } from '@/stores/actionStore'

// Mock Session hook to force backend mode
vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    sessionMeta: { id: 'sess_test', revision: 1, hostToken: 'host' },
    isBackendMode: true,
    setSessionMeta: vi.fn(),
    clear: vi.fn(),
  }),
}))

// Mock SessionService calls and record invocations
vi.mock('@/services/SessionService', () => {
  const initialize = vi.fn(async () => ({ id: 'sess_test', state: {}, revision: 2 }))
  const create = vi.fn(async () => ({ id: 'sess_test', revision: 1, hostToken: 'host', state: {} }))
  const getActionOptions = vi.fn(async () => ({ options: [{ title: 'A', description: 'd', cost: 1 }] }))
  const submitActions = vi.fn(async (_id: string, _pid: string, _a: any[], rev: number) => ({ id: 'sess_test', state: {}, revision: rev + 1, submitted: { human: true } }))
  const advance = vi.fn(async (_id: string, rev: number) => ({ id: 'sess_test', state: {}, revision: rev + 1 }))
  return {
    SessionService: { create, initialize, getActionOptions, submitActions, advance },
  }
})

// Mock llm client: ensure no chat-mode path is called in backend mode
vi.mock('@/services/llmApiClient', () => ({
  generateInitialScenarioChat: vi.fn(),
  generateActionOptions: vi.fn(),
  generateCounterfactualConsequences: vi.fn(),
  generateAITurn: vi.fn(),
  generateConsequencesChat: vi.fn(),
}))

import * as llm from '@/services/llmApiClient'
import { useGameActions } from '@/hooks/useGameActions'

describe('useGameActions in backend mode', () => {
  beforeEach(() => {
    // Reset stores
    useGameStore.setState({
      gameState: { phase: 0, round: 0, coreMetric: { name: 'Trust', description: 'desc', value: 75 }, eventLog: [], currentEvent: null } as any,
      players: [],
      gameSetup: null,
    })
    useLobbyStore.setState({ selectedRoleName: 'Tech CEO' as any, gamePath: 'classic' as any } as any)
    useActionStore.setState({ actionOptions: [], aiCompletionStatus: {} })
    vi.clearAllMocks()
  })

  it('does not call chat-mode LLM paths and uses session endpoints for start/confirm', async () => {
    const { result } = renderHook(() => useGameActions())

    // Start game (will create+initialize session in backend mode)
    act(() => { result.current.handleStartGame() })

    await waitFor(() => {
      const state = useGameStore.getState().gameState
      expect(state.phase).toBeDefined()
    })

    // Confirm with 1 action
    const action = { title: 'A', description: 'd', cost: 1 }
    act(() => { result.current.handleConfirmActions([action as any]) })

    // Ensure no client chat-mode calls were made
    expect((llm as any).generateConsequencesChat).not.toHaveBeenCalled()
    expect((llm as any).generateAITurn).not.toHaveBeenCalled()
  })
})

