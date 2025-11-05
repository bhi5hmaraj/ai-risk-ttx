'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { ActionTreePortal, FeedbackModal } from '@/components/game';
import { EndScreen } from '@/screens';
import { useGame } from '@/hooks/useGame';
import { useLobby } from '@/hooks/useLobby';
import { useUI } from '@/hooks/useUI';
import { useSession } from '@/hooks/useSession';
import { GamePhase } from '@/types';

export default function EndPage() {
  const router = useRouter();
  const { gameState, players, latestLogEntry, resetGame } = useGame();
  const { gameSetup, gamePath, customScenario } = useLobby();
  const { resetUI } = useUI();
  const { clear: clearSession } = useSession();
  const [isActionTreeOpen, setIsActionTreeOpen] = React.useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);
  const selectedLogEntry = latestLogEntry;

  // Route decisions are owned by RouteOrchestrator. If not END, render nothing
  // and let the orchestrator navigate.
  if (gameState.phase !== GamePhase.END) return null;

  const actionTree = (
    <ActionTreePortal
      isOpen={isActionTreeOpen}
      onClose={() => setIsActionTreeOpen(false)}
      logEntry={selectedLogEntry}
      eventLog={gameState.eventLog}
    />
  );

  return (
    <>
      <Navigation
        onNavigateHome={() => {
          resetGame();
          resetUI();
          clearSession();
          router.push('/');
        }}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onOpenAbout={() => router.push('/about')}
        onOpenUpdates={() => router.push('/updates')}
        showFeedback={false}
      />
      {actionTree}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        gameMetadata={{
          model: process.env.NEXT_PUBLIC_LLM_MODEL || process.env.VITE_LLM_MODEL || 'unknown',
          scenarioType: gamePath === 'ai_safety' ? 'ai_safety' : gamePath === 'custom' ? 'custom' : 'classic',
          rolePlayed: players.find((p) => p.isHuman)?.role.name || 'Unknown',
          roundsCompleted: gameState.round,
          finalPublicScore: gameState.coreMetric.value,
          customPromptUsed: gamePath === 'custom' && !!customScenario,
          customPrompt: gamePath === 'custom' ? (customScenario || '') : undefined,
        }}
      />
      <EndScreen
        gameState={gameState}
        players={players}
        onReset={() => {
          resetGame();
          resetUI();
          clearSession();
          router.push('/');
        }}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        gameSetup={gameSetup}
      />
    </>
  );
}
