import React from 'react';
import { Button } from '@/components/ui/Button';
import { GAME_CONFIG } from '../gameConfig';
import { useLobby } from '@/hooks/useLobby';

interface GameRulesScreenProps {
  onNavigateToLobby: () => void;
}

export const GameRulesScreen: React.FC<GameRulesScreenProps> = ({ onNavigateToLobby }) => {
  const { maxRounds } = useLobby();
  const cap = maxRounds ?? GAME_CONFIG.MAX_ROUNDS;
  const handleContinue = () => {
    onNavigateToLobby();
  };

  return (
    <div className="text-text px-2 md:px-4 py-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-4xl font-bold mb-2 text-accent">
          How to Play Simulacra
        </h1>
        <p className="text-sm md:text-lg text-muted">
          A strategic tabletop exercise in crisis management
        </p>
      </div>

      {/* Game Overview */}
      <section className="mb-4 bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-bold mb-2 text-accent">Game Overview</h2>
        <p className="text-muted text-sm mb-3">
          You are a key stakeholder navigating a complex crisis scenario. Make strategic decisions
          across {cap} rounds to manage the shared public metric while pursuing your secret objectives.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-panel p-3 rounded border border-border">
            <div className="font-semibold text-accent text-sm">5 Minutes per Round</div>
            <div className="text-xs text-muted">Choose your actions wisely</div>
          </div>
          <div className="bg-panel p-3 rounded border border-border">
            <div className="font-semibold text-accent text-sm">{cap} Rounds Total</div>
            <div className="text-xs text-muted">Navigate the evolving crisis</div>
          </div>
          <div className="bg-panel p-3 rounded border border-border">
            <div className="font-semibold text-accent text-sm">AI-Powered NPCs</div>
            <div className="text-xs text-muted">Compete against dynamic opponents</div>
          </div>
        </div>
      </section>

      {/* Dual Objectives */}
      <section className="mb-4 bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-bold mb-2 text-accent">Dual Objectives</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-panel p-3 rounded border border-border">
            <h3 className="text-sm font-bold mb-2 text-accent">Shared Objective</h3>
            <p className="text-muted text-xs mb-2">
              Maintain the <strong>Core Metric</strong> representing the collective outcome (e.g., public trust, system stability).
            </p>
            <div className="text-xs text-muted bg-panel p-2 rounded border border-border">
              If the core metric drops to 0 or below, the crisis escalates catastrophically and everyone loses.
            </div>
          </div>
          <div className="bg-panel p-3 rounded border border-border">
            <h3 className="text-sm font-bold mb-2 text-accent">Hidden Objective</h3>
            <p className="text-muted text-xs mb-2">
              Each role has a <strong>secret goal</strong> that may conflict with the collective interest.
            </p>
            <div className="text-xs text-muted bg-panel p-2 rounded border border-border">
              Your hidden score determines your personal success at game end.
            </div>
          </div>
        </div>
      </section>

      {/* Action System */}
      <section className="mb-4 bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-bold mb-2 text-accent">Action System</h2>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-1 h-1 mt-1.5 rounded-full bg-accent flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Action Points</h3>
              <p className="text-muted text-xs">
                Each round you have <strong className="text-accent">{GAME_CONFIG.ACTION_POINTS_PER_ROUND} action points</strong>.
                Actions cost 1-3 points based on their impact and complexity.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1 h-1 mt-1.5 rounded-full bg-accent flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Strategic Choices</h3>
              <p className="text-muted text-xs">
                The AI Game Master generates 5 unique action options based on your role, the current crisis,
                and previous events. Choose wisely—your choices affect both scores!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scenario Types */}
      <section className="mb-4 bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-bold mb-2 text-accent">Scenario Types</h2>
        <div className="space-y-2">
          <div className="bg-panel p-3 rounded border border-border">
            <h3 className="font-bold text-blue-300 text-sm mb-1">🗳️ Classic: Election Crisis</h3>
            <p className="text-xs text-muted">
              Navigate an AI-driven election interference scenario with roles like Election Commissioner, Tech CEO, Journalist, and more.
            </p>
          </div>
          <div className="bg-panel p-3 rounded border border-border">
            <h3 className="font-bold text-purple-300 text-sm mb-1">AI Safety Scenario</h3>
            <p className="text-xs text-muted">
              Explore a pre-built crisis focused on AI alignment, safety governance, and existential risk management.
            </p>
          </div>
          <div className="bg-panel p-3 rounded border border-border">
            <h3 className="font-bold text-green-300 text-sm mb-1">Custom Scenarios</h3>
            <p className="text-xs text-muted">
              Create your own crisis scenario! Describe any situation and the AI will generate appropriate roles, objectives, and narrative events.
            </p>
          </div>
        </div>
      </section>

      {/* Winning & Losing */}
      <section className="mb-4 bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-bold mb-2 text-accent">Winning & Losing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-panel p-3 rounded border border-border">
            <h3 className="font-bold text-sm mb-1 text-success">✅ Victory</h3>
            <ul className="text-muted text-xs space-y-1">
              <li>• Survive all {cap} rounds with core metric above 0</li>
              <li>• Maximize your hidden score</li>
            </ul>
          </div>
          <div className="bg-panel p-3 rounded border border-border">
            <h3 className="font-bold text-sm mb-1 text-danger">❌ Defeat</h3>
            <ul className="text-muted text-xs space-y-1">
              <li>• Core metric reaches 0 = Catastrophic failure!</li>
              <li>• All players lose regardless of hidden scores</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center mt-6">
        <Button onClick={handleContinue} className="h-10 px-6 text-sm">
          Enter the Lobby →
        </Button>
        <p className="mt-2 text-muted text-xs">
          Ready to test your strategic skills in a crisis?
        </p>
      </div>
    </div>
  );
};
