'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { GameRulesScreen } from '@/screens';
import { useGameController } from '@/hooks/useGameController';
import { GamePhase } from '@/types';
import { useSessionStore } from '@/stores/sessionStore';

export default function HomePage() {
  const router = useRouter();
  const {
    state: { gameState },
    actions: { resetState },
  } = useGameController();

  // Routing handled by RouteOrchestrator centrally

  const { setStartIntent } = useSessionStore();

  return (
    <>
      <Navigation
        onNavigateHome={() => resetState()}
        onOpenFeedback={() => {}}
        onOpenAbout={() => router.push('/about')}
        onOpenUpdates={() => router.push('/updates')}
        showFeedback={false}
      />
      <main className="mt-16">
        <GameRulesScreen
          onNavigateToLobby={() => {
            // Ensure we start fresh in the Lobby: clear stores and intent first
            resetState();
            try { setStartIntent(false); } catch {}
            router.push('/lobby');
          }}
        />
      </main>
    </>
  );
}
