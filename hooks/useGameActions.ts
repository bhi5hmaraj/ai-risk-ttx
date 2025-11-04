"use client";

import { useCallback, useRef } from 'react';
import { GamePhase, type ActionOption, type GameSetup, type Player, type GameState } from '@/types';
import { useGame } from '@/hooks/useGame';
import { useUI } from '@/hooks/useUI';
import { useActions } from '@/hooks/useActions';
import { useLobby } from '@/hooks/useLobby';
import { useSession } from '@/hooks/useSession';
import { useUIStore } from '@/stores/uiStore';
import { SessionService } from '@/services/SessionService';
import {
  generateCounterfactualConsequences,
  generateAITurn,
  generateInitialScenarioChat,
  generateConsequencesChat,
} from '@/services/llmApiClient';
import { selectInitialPlayers, createCanonicalSetup } from '@/lib/gameSetup';
import { createInitialGameStateFromScenario, applyConsequences } from '@/lib/gameLogic';
import { GAME_CONFIG } from '@/constants';
import { AI_SAFETY_SCENARIO } from '@/presets';

export function useGameActions() {
  const { gameState, players, setGameState, setPlayers } = useGame();
  const { setLoading, setError } = useUI();
  const { actionOptions, setActionOptions, setAICompletionStatus, updateAICompletion } = useActions();
  const { selectedRoleName, gamePath, gameSetup, setGameSetup } = useLobby();
  const { sessionMeta, isBackendMode, setSessionMeta } = useSession();
  const setStartStep = useUIStore((s) => s.setStartStep);
  const llmCallsThisRoundRef = useRef(0);
  const chatHistoryRef = useRef<any[] | null>(null);

  const runConsequencePhase = useCallback(
    async (currentPlayers: Player[], currentGameState: GameState) => {
      if (isBackendMode) return;
      setLoading(true, 'AI Game Master is assessing the situation...');

      let playersWithActions = [...currentPlayers];
      const aiPlayers = currentPlayers.filter((p) => !p.isHuman);
      setAICompletionStatus(Object.fromEntries(aiPlayers.map((p) => [p.role.name, false])));

      const counterfactualPromise = generateCounterfactualConsequences(currentGameState);
      const prev = currentGameState.eventLog.find((e) => e.round === currentGameState.round - 1);
      const previousRoundActions = prev ? prev.playerActions : null;

      let aiTurnResults: (Awaited<ReturnType<typeof generateAITurn>> | null)[] = [];
      if (aiPlayers.length > 0) {
        const aiTurnPromises = aiPlayers.map((player) =>
          generateAITurn(player, currentGameState, previousRoundActions).then((res) => {
            updateAICompletion(player.role.name, true);
            return res;
          })
        );
        aiTurnResults = await Promise.all(aiTurnPromises);
        if (aiTurnResults.some((r) => r === null)) {
          setError('Failed to generate AI player turns. The simulation cannot continue.');
          setLoading(false);
          return;
        }
        const aiActionsByRole: Record<string, ActionOption[]> = {};
        aiPlayers.forEach((p, i) => (aiActionsByRole[p.role.name] = aiTurnResults[i]?.chosenActions || []));
        playersWithActions = currentPlayers.map((p) => (!p.isHuman && aiActionsByRole[p.role.name] ? { ...p, actions: aiActionsByRole[p.role.name], hasSubmittedActions: true } : p));
      }

      setPlayers(playersWithActions);
      const counterfactual = await counterfactualPromise;
      if (!counterfactual) {
        setError('The AI Game Master failed to calculate the counterfactual.');
        setLoading(false);
        return;
      }

      const setupForChat: GameSetup = gameSetup ?? createCanonicalSetup(currentGameState, currentPlayers);
      const cons = await generateConsequencesChat(
        currentGameState,
        playersWithActions,
        counterfactual.publicScoreUpdate,
        chatHistoryRef.current || [],
        setupForChat
      );
      if (!cons) {
        setError('The AI Game Master failed to process consequences (chat mode).');
        setLoading(false);
        return;
      }
      chatHistoryRef.current = cons.chatHistory;
      const result = cons.consequences;
      const { gameState: nextState, players: nextPlayers } = applyConsequences(
        currentGameState,
        result,
        playersWithActions,
        currentPlayers.filter((p) => !p.isHuman),
        aiTurnResults as any,
        actionOptions,
        llmCallsThisRoundRef.current
      );
      setGameState(nextState);
      setPlayers(nextPlayers);
      setActionOptions([]);
      setLoading(false);
      setAICompletionStatus({});
      llmCallsThisRoundRef.current = 0;
    },
    [isBackendMode, setLoading, setError, setAICompletionStatus, setPlayers, setGameState, gameSetup, actionOptions, setActionOptions]
  );

  const handleConfirmActions = useCallback(
    (actions: ActionOption[]) => {
      const human = players.find((p) => p.isHuman);
      if (!human) return;
      if (isBackendMode) {
        (async () => {
          setLoading(true, 'Locking in your actions...');
          try {
            let meta = sessionMeta;
            if (!meta) {
              const created = await SessionService.create({ mode: (gamePath || 'classic') as any, setup: gameSetup || undefined });
              meta = { id: created.id, revision: created.revision, hostToken: created.hostToken } as any;
              setSessionMeta(meta as any);
            }
            setPlayers((prev) => prev.map((p) => (p.isHuman ? { ...p, actions, hasSubmittedActions: true } : p)));
            const s1 = await SessionService.submitActions(meta!.id, human.id || 'human', actions, meta!.revision);
            setSessionMeta({ id: meta!.id, revision: s1.revision, hostToken: meta!.hostToken } as any);
            SessionService.advance(meta!.id, s1.revision, meta!.hostToken, {
              humanRoleName: human.role.name,
              humanPlayerId: human.id || 'human',
              humanActions: actions,
              humanAvailableOptions: actionOptions,
            }).catch((err) => setError(err?.message || 'Failed to advance round'));
            setActionOptions([]);
          } catch (e: any) {
            setError(e?.message || 'Failed to submit actions to server');
            setPlayers((prev) => prev.map((p) => (p.isHuman ? { ...p, hasSubmittedActions: false } : p)));
          } finally {
            setLoading(false);
          }
        })();
        return;
      }
      const updatedPlayers = players.map((p) => (p.isHuman ? { ...p, actions, hasSubmittedActions: true } : p));
      setPlayers(updatedPlayers);
      runConsequencePhase(updatedPlayers, gameState);
    },
    [players, isBackendMode, sessionMeta, gamePath, gameSetup, setSessionMeta, setPlayers, setLoading, setError, actionOptions, runConsequencePhase, gameState]
  );

  const handleStartGame = useCallback(() => {
    if (!selectedRoleName) return;
    const path = (gamePath ?? 'classic') as 'classic' | 'custom' | 'ai_safety';
    try {
      setStartStep('creatingSession', isBackendMode ? 'running' : 'done');
      setStartStep('buildingPlayers', 'running');
      setStartStep('generatingScenario', 'idle');
      setStartStep('connectingStream', isBackendMode ? 'running' : 'idle');
      setStartStep('ready', 'idle');
    } catch {}
    const { players: initialPlayers, coreMetric } = selectInitialPlayers(selectedRoleName, path, gameSetup, AI_SAFETY_SCENARIO, { name: 'Democratic Legitimacy', description: "Public's trust in the democratic process.", value: 100 });
    setPlayers(initialPlayers);
    setGameState((prev) => ({ ...prev, phase: GamePhase.STARTING, coreMetric, eventLog: prev.phase === GamePhase.LOBBY ? [] : prev.eventLog, round: prev.phase === GamePhase.LOBBY ? 0 : prev.round, currentEvent: null }));
    setLoading(true, 'AI Game Master is generating the initial scenario...');

    if (isBackendMode && !sessionMeta) {
      (async () => {
        try {
          const created = await SessionService.create({ mode: path, setup: path === 'custom' ? gameSetup || undefined : undefined });
          setSessionMeta({ id: created.id, revision: created.revision, hostToken: created.hostToken } as any);
          setStartStep('creatingSession', 'done');
        } catch {
          setStartStep('creatingSession', 'error');
        }
      })();
    }

    (async () => {
      const setup = gameSetup || createCanonicalSetup(gameState, initialPlayers);
      setGameSetup(setup);
      const initChat = await generateInitialScenarioChat(setup, initialPlayers);
      const result = initChat?.scenario;
      if (initChat) chatHistoryRef.current = initChat.chatHistory;
      if (result) {
        const initialGameState = createInitialGameStateFromScenario(gameState, result, llmCallsThisRoundRef.current);
        setGameState(initialGameState);
        setLoading(false);
        setStartStep('generatingScenario', 'done');
        setStartStep('ready', 'done');
      } else {
        setError('The AI Game Master failed to initialize the game.');
        setGameState((prev) => ({ ...prev, phase: GamePhase.LOBBY }));
        setLoading(false);
        setStartStep('generatingScenario', 'error');
      }
    })();
  }, [selectedRoleName, gamePath, gameSetup, isBackendMode, sessionMeta, setSessionMeta, setPlayers, setGameState, setLoading, setError]);

  return { handleStartGame, handleConfirmActions, runConsequencePhase } as const;
}
