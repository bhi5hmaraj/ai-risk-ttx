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
    <div className="min-h-screen bg-bg text-text p-8 pt-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-accent">
            How to Play Simulacra
          </h1>
          <p className="text-xl text-muted">
            A strategic tabletop exercise in crisis management
          </p>
        </div>

        {/* Game Overview */}
        <section className="mb-10 bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold mb-4 text-accent">Game Overview</h2>
          <p className="text-muted leading-relaxed mb-4">
            You are a key stakeholder navigating a complex crisis scenario. Make strategic decisions
            across {cap} rounds to manage the shared public metric while pursuing your secret objectives.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-panel p-4 rounded-lg border border-border">
              <div className="font-semibold text-accent">5 Minutes per Round</div>
              <div className="text-sm text-muted">Choose your actions wisely</div>
            </div>
            <div className="bg-panel p-4 rounded-lg border border-border">
              <div className="font-semibold text-accent">{cap} Rounds Total</div>
              <div className="text-sm text-muted">Navigate the evolving crisis</div>
            </div>
            <div className="bg-panel p-4 rounded-lg border border-border">
              <div className="font-semibold text-accent">AI-Powered NPCs</div>
              <div className="text-sm text-muted">Compete against dynamic opponents</div>
            </div>
          </div>
        </section>

        {/* Dual Objectives */}
        <section className="mb-10 bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold mb-4 text-accent">Dual Objectives</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-panel p-5 rounded-lg border border-border">
              <h3 className="text-lg font-bold mb-3 text-accent">Shared Objective</h3>
              <p className="text-muted mb-3">
                Maintain the <strong>Core Metric</strong> representing the collective outcome (e.g., public trust, system stability).
              </p>
              <div className="text-sm text-muted bg-panel p-3 rounded border border-border">
                If the core metric drops to 0 or below, the crisis escalates catastrophically and everyone loses.
              </div>
            </div>
            <div className="bg-panel p-5 rounded-lg border border-border">
              <h3 className="text-lg font-bold mb-3 text-accent">Hidden Objective</h3>
              <p className="text-muted mb-3">
                Each role has a <strong>secret goal</strong> that may conflict with the collective interest.
              </p>
              <div className="text-sm text-muted bg-panel p-3 rounded border border-border">
                Your hidden score determines your personal success at game end.
              </div>
            </div>
          </div>
        </section>

        {/* Action System */}
        <section className="mb-10 bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold mb-4 text-accent">Action System</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-1.5 h-1.5 mt-2 rounded-full bg-accent" />
              <div>
                <h3 className="font-bold text-lg mb-2">Action Points</h3>
                <p className="text-muted">
                  Each round you have <strong className="text-accent">{GAME_CONFIG.ACTION_POINTS_PER_ROUND} action points</strong>.
                  Actions cost 1-3 points based on their impact and complexity.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-1.5 h-1.5 mt-2 rounded-full bg-accent" />
              <div>
                <h3 className="font-bold text-lg mb-2">Strategic Choices</h3>
                <p className="text-muted">
                  The AI Game Master generates 5 unique action options based on your role, the current crisis,
                  and previous events. Choose wisely—your choices affect both scores!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-1.5 h-1.5 mt-2 rounded-full bg-accent" />
              <div>
                <h3 className="font-bold text-lg mb-2">Time Pressure</h3>
                <p className="text-muted">
                  You have {GAME_CONFIG.ACTION_PHASE_SECONDS / 60} minutes to decide. The timer can be paused,
                  but choose before time runs out or you'll be forced to pass.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Scenario Types */}
        <section className="mb-10 bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold mb-4 text-accent">Scenario Types</h2>
          <p className="text-muted mb-4">
            Choose from pre-built scenarios or create your own custom crisis:
          </p>
          <div className="space-y-3">
            <div className="bg-panel p-4 rounded-lg border border-border">
              <h3 className="font-bold text-blue-300 mb-2">🗳️ Classic: Election Crisis</h3>
              <p className="text-sm text-muted">
                Navigate an AI-driven election interference scenario with roles like Election Commissioner, Tech CEO, Journalist, and more.
                Manage democratic legitimacy while pursuing hidden agendas.
              </p>
            </div>
            <div className="bg-panel p-4 rounded-lg border border-border">
              <h3 className="font-bold text-purple-300 mb-2">AI Safety Scenario</h3>
              <p className="text-sm text-muted">
                Explore a pre-built crisis focused on AI alignment, safety governance, and existential risk management.
                Different roles and challenges than the election scenario.
              </p>
            </div>
            <div className="bg-panel p-4 rounded-lg border border-border">
              <h3 className="font-bold text-green-300 mb-2">Custom Scenarios</h3>
              <p className="text-sm text-muted">
                Create your own crisis scenario! Describe any situation (climate emergency, pandemic response, corporate crisis, etc.)
                and the AI will generate appropriate roles, objectives, and narrative events. <strong>Unlimited possibilities!</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Roles & Gameplay */}
        <section className="mb-10 bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold mb-4 text-accent">Example Roles</h2>
          <p className="text-muted mb-4">
            Here are the stakeholder roles from the Classic Election Crisis scenario. Each scenario has its own unique roles:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-panel p-3 rounded-lg flex items-center gap-3 border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-accent"/>
              <span className="font-semibold">Election Commissioner</span>
            </div>
            <div className="bg-panel p-3 rounded-lg flex items-center gap-3 border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-accent"/>
              <span className="font-semibold">Tech CEO</span>
            </div>
            <div className="bg-panel p-3 rounded-lg flex items-center gap-3 border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-accent"/>
              <span className="font-semibold">Journalist</span>
            </div>
            <div className="bg-panel p-3 rounded-lg flex items-center gap-3 border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-accent"/>
              <span className="font-semibold">Federal Regulator</span>
            </div>
            <div className="bg-panel p-3 rounded-lg flex items-center gap-3 border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-accent"/>
              <span className="font-semibold">Campaign Manager</span>
            </div>
            <div className="bg-panel p-3 rounded-lg flex items-center gap-3 border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-accent"/>
              <span className="font-semibold">Cybersecurity Expert</span>
            </div>
          </div>
        </section>

        {/* Winning & Losing */}
        <section className="mb-10 bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold mb-4 text-accent">Winning & Losing</h2>
          <div className="space-y-4">
            <div className="bg-panel p-4 rounded-lg border border-border">
              <h3 className="font-bold text-lg mb-2 text-success">✅ Victory Conditions</h3>
              <ul className="text-muted space-y-2 ml-4">
                <li>• Survive all {cap} rounds with the core metric above 0</li>
                <li>• Maximize your <strong>hidden score</strong> to achieve personal objectives</li>
                <li>• Balance self-interest with collective survival</li>
              </ul>
            </div>
            <div className="bg-panel p-4 rounded-lg border border-border">
              <h3 className="font-bold text-lg mb-2 text-danger">❌ Defeat Conditions</h3>
              <ul className="text-muted space-y-2 ml-4">
                <li>• Core metric reaches 0 or below = <strong>Catastrophic failure!</strong></li>
                <li>• All players lose if this happens, regardless of hidden scores</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Special Features */}
        <section className="mb-10 bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold mb-4 text-accent">Special Features</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 mt-2 rounded-full bg-accent" />
              <div>
                <strong>Action Tree Visualization:</strong>
                <span className="text-muted ml-2">
                  After each round, view all players' available options and chosen actions in an interactive graph.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 mt-2 rounded-full bg-accent" />
              <div>
                <strong>Counterfactual Analysis:</strong>
                <span className="text-muted ml-2">
                  See what would have happened if nobody acted—understand the baseline crisis progression.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 mt-2 rounded-full bg-accent" />
              <div>
                <strong>Event Log:</strong>
                <span className="text-muted ml-2">
                  Review all previous rounds, consequences, and decisions in the history panel.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Button onClick={handleContinue} className="h-11 px-8 text-base">
            Enter the Lobby →
          </Button>
          <p className="mt-4 text-muted text-sm">
            Ready to test your strategic skills in a crisis?
          </p>
        </div>
      </div>
    </div>
  );
};
