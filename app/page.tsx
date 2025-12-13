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
        <section className="px-4 py-6 md:px-6 md:py-16">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold text-accent">Simulacra</h1>
            <p className="mt-2 md:mt-3 text-base md:text-lg text-muted max-w-3xl mx-auto">
              AI-powered tabletop exercise for complex, high-stakes decision making.
            </p>
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
              <Button
                className="h-11 px-8 text-base w-full sm:w-auto"
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
                className="h-11 px-6 text-base w-full sm:w-auto"
                onClick={() => router.push('/about')}
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Existing Rules content */}
        <section className="pb-8 md:pb-16">
          <div className="max-w-4xl mx-auto">
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
