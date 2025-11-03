'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { ActionTreePortal, FeedbackModal } from '@/components/game';
import { EndScreen } from '@/screens';
import { useGameController } from '@/hooks/useGameController';
import { GamePhase } from '@/types';

export default function EndPage() {
  const router = useRouter();
  const {
    state: {
      gameState,
      players,
      gameSetup,
      isActionTreeOpen,
      selectedLogEntry,
    },
    actions: { resetState, setIsActionTreeOpen },
  } = useGameController();

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
          resetState();
          router.push('/');
        }}
        onOpenFeedback={() => {}}
        onOpenAbout={() => router.push('/about')}
        onOpenUpdates={() => router.push('/updates')}
        showFeedback={false}
      />
      {actionTree}
      <FeedbackModal isOpen={false} onClose={() => {}} gameMetadata={{
        model: process.env.NEXT_PUBLIC_LLM_MODEL || process.env.VITE_LLM_MODEL || 'unknown',
        scenarioType: gameSetup ? 'custom' : 'classic',
        rolePlayed: 'Unknown',
        roundsCompleted: gameState.round,
        finalPublicScore: gameState.coreMetric.value,
        customPromptUsed: false,
        customPrompt: undefined,
      }} />
      <EndScreen
        gameState={gameState}
        players={players}
        onReset={() => {
          resetState();
          router.push('/');
        }}
        onOpenFeedback={() => {}}
        gameSetup={gameSetup}
      />
    </>
  );
}
