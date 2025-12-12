'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { GameRulesScreen } from '@/screens';
import MatrixBackground from '@/components/ui/MatrixBackground';
import { Button } from '@/components/ui/Button';
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
      <main className="relative mt-16 bg-bg text-text">
        {/* Subtle Matrix background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <MatrixBackground opacity={0.14} />
        </div>
        <section className="px-6 py-16">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl font-extrabold text-accent">Simulacra</h1>
            <p className="mt-3 text-lg text-muted max-w-3xl mx-auto">
              AI-powered tabletop exercise for complex, high-stakes decision making.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                className="h-11 px-8 text-base"
                onClick={() => {
                  resetState();
                  try { setStartIntent(false); } catch {}
                  router.push('/lobby');
                }}
              >
                Start Simulation
              </Button>
              <Button
                variant="outline"
                className="h-11 px-6 text-base"
                onClick={() => router.push('/updates')}
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Existing Rules content, tokenized container */}
        <section className="px-6 pb-24">
          <div className="max-w-5xl mx-auto bg-card border border-border rounded-md p-6">
            <GameRulesScreen
              onNavigateToLobby={() => {
                resetState();
                try { setStartIntent(false); } catch {}
                router.push('/lobby');
              }}
            />
          </div>
        </section>
      </main>
    </>
  );
}
