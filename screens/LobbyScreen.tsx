import React, { useState, useEffect } from 'react';
import type { GameSetup, RoleData } from '../types';
import { RoleCard, MakePublicModal } from '../components/game';

interface PublicScenario {
  id: string;
  customPrompt: string;
  gameSetup: GameSetup;
  initialEvent: { headline: string; detail: string };
  submitterName: string | null;
  voteCount: number;
  createdAt: string;
}

// Catalog item for combined list (official + contributed)
interface ScenarioCatalogItem {
  id: string;
  source: 'official' | 'contributed';
  gameSetup: GameSetup;
  initialEvent: { headline: string; detail: string };
  submitterName?: string | null;
  voteCount?: number;
  createdAt?: string;
}

interface LobbyScreenProps {
  selectedRoleName: string | null;
  setSelectedRoleName: (role: string | null) => void;
  gamePath: 'classic' | 'custom' | 'ai_safety' | null;
  setGamePath: (path: 'classic' | 'custom' | 'ai_safety' | null) => void;
  customScenario: string;
  setCustomScenario: (value: string) => void;
  gameSetup: GameSetup | null;
  setGameSetup: (setup: GameSetup | null) => void;
  // New: client-selectable setup
  maxAIPlayers?: number;
  setMaxAIPlayers?: (n: number) => void;
  maxRounds?: number;
  setMaxRounds?: (n: number) => void;
  isFromPublicCatalog: boolean;
  setIsFromPublicCatalog: (value: boolean) => void;
  isLoading: boolean;
  handleCustomGameStart: () => void;
  handleStartGame: () => void;
  onNavigateToCustomScenario?: () => void;
}

const LobbyExperienceCard: React.FC<{
  title: string;
  description: string;
  onSelect: () => void;
  cta: string;
  accent?: 'blue' | 'cyan' | 'purple';
}> = ({ title, description, onSelect, cta, accent = 'blue' }) => {
  const titleClass = accent === 'purple' ? 'text-purple-300' : accent === 'cyan' ? 'text-cyan-300' : 'text-blue-300';
  const ctaClass = accent === 'purple' ? 'text-purple-300' : accent === 'cyan' ? 'text-cyan-400' : 'text-blue-400';
  const hoverBorder = accent === 'purple' ? 'hover:border-purple-500' : accent === 'cyan' ? 'hover:border-cyan-500' : 'hover:border-blue-500';
  const borderBase = accent === 'purple' ? 'border-purple-700/50' : 'border-gray-700';
  const bgBase = accent === 'purple' ? 'bg-purple-900/20' : 'bg-gray-800';
  return (
    <button
      onClick={onSelect}
      className={`w-full md:w-auto ${bgBase} border ${borderBase} rounded-lg p-6 text-left ${hoverBorder} transition-colors`}
    >
      <h3 className={`text-xl font-bold ${titleClass} mb-2`}>{title}</h3>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      <span className={`inline-flex items-center ${ctaClass} font-semibold`}>{cta}</span>
    </button>
  );
};

const ScenarioCard: React.FC<{
  scenario: ScenarioCatalogItem;
  onSelect: () => void;
  onVote: (scenarioId: string) => Promise<void>;
  hasVoted: boolean;
}> = ({ scenario, onSelect, onVote, hasVoted }) => {
  const gameSetup = scenario.gameSetup;
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection when clicking vote
    if (isVoting || hasVoted) return;

    setIsVoting(true);
    try {
      await onVote(scenario.id);
    } finally {
      setIsVoting(false);
    }
  };

  const isOfficial = scenario.source === 'official';

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-purple-500 transition-colors group cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-lg font-bold text-purple-300 group-hover:text-purple-200">
          {gameSetup.scenarioTitle}
        </h4>
        <span
          className={`ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${
            isOfficial ? 'bg-blue-900/40 text-blue-200 border border-blue-700/40' : 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/40'
          }`}
          title={isOfficial ? 'Official scenario' : 'Contributed by the community'}
        >
          {isOfficial ? 'Official' : 'Contributed'}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
        {gameSetup.scenarioDescription}
      </p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{isOfficial ? 'Official' : (scenario.submitterName || 'Anonymous')}</span>
        {!isOfficial && (
          <button
            onClick={handleVote}
            disabled={hasVoted || isVoting}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              hasVoted
                ? 'text-purple-400 cursor-not-allowed'
                : isVoting
                ? 'text-gray-500 cursor-wait'
                : 'text-gray-400 hover:text-purple-300 hover:bg-gray-700'
            }`}
            title={hasVoted ? 'Already voted' : isVoting ? 'Voting...' : 'Upvote this scenario'}
          >
            {isVoting ? (
              <>
                <span className="animate-spin">⏳</span>
                <span className="font-medium">{scenario.voteCount || 0}</span>
              </>
            ) : (
              <>
                <span>👍</span>
                <span className="font-medium">{scenario.voteCount || 0}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const RoleSelection: React.FC<{
  roles: RoleData[];
  selectedRoleName: string | null;
  onSelect: (role: string) => void;
  onStart: () => void;
  cta: string;
  isStarting?: boolean;
}> = ({ roles, selectedRoleName, onSelect, onStart, cta, isStarting = false }) => (
  <div className="max-w-7xl mx-auto">
    <div className="text-center mb-10">
      <h2 className="text-3xl font-bold">Choose Your Role</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {roles.map((role) => (
        <RoleCard
          key={role.name}
          role={role}
          onSelect={() => onSelect(role.name)}
          isSelected={selectedRoleName === role.name}
        />
      ))}
    </div>
    <div className="text-center mt-10">
      <button
        onClick={onStart}
        disabled={!selectedRoleName || isStarting}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {isStarting ? 'Starting…' : cta}
      </button>
    </div>
  </div>
);

const mapStakeholdersToRoles = (stakeholders: RoleData[] | any[]): RoleData[] =>
  stakeholders.map((stakeholder: any) => {
    // Handle both emoji strings (from GameSetup) and existing icon functions (from RoleData)
    const emoji = typeof stakeholder.icon === 'string' ? stakeholder.icon : '❓';
    const iconComponent = typeof stakeholder.icon === 'function'
      ? stakeholder.icon
      : (props: React.SVGProps<SVGSVGElement>) => (
          <span className="text-2xl" role="img" aria-label="role icon">
            {emoji}
          </span>
        );

    return {
      name: stakeholder.name,
      publicObjective: stakeholder.publicObjective,
      hiddenObjective: stakeholder.hiddenObjective,
      resources: stakeholder.resources ?? [],
      constraints: stakeholder.constraints ?? [],
      icon: iconComponent,
    };
  });

const PresetRoleSelection: React.FC<{
  scenarioTitle: string;
  scenarioDescription: string;
  roles: RoleData[];
  selectedRoleName: string | null;
  onSelect: (role: string) => void;
  onStart: () => void;
  cta: string;
  onMakePublic?: () => void;
  // New controls (optional)
  maxAIPlayers?: number;
  setMaxAIPlayers?: (n: number) => void;
  maxRounds?: number;
  setMaxRounds?: (n: number) => void;
  minAiPlayers?: number;
  isStarting?: boolean;
}> = ({ scenarioTitle, scenarioDescription, roles, selectedRoleName, onSelect, onStart, cta, onMakePublic, maxAIPlayers, setMaxAIPlayers, maxRounds, setMaxRounds, minAiPlayers = 0, isStarting = false }) => (
  <div className="max-w-7xl mx-auto">
    <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-lg p-6 mb-10 border border-gray-700 text-center">
      <h2 className="text-3xl font-bold text-purple-300 mb-2">{scenarioTitle}</h2>
      <p className="text-gray-300">{scenarioDescription}</p>
      {onMakePublic && (
        <button
          onClick={onMakePublic}
          className="mt-4 px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
        >
          📢 Make This Scenario Public
        </button>
      )}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <label className="block text-sm text-gray-400 mb-1">Max AI Players ({minAiPlayers}–{GAME_CONFIG.MAX_AI_PLAYERS_CUSTOM})</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={minAiPlayers}
              max={GAME_CONFIG.MAX_AI_PLAYERS_CUSTOM}
              value={typeof maxAIPlayers === 'number' ? maxAIPlayers : 5}
              onChange={(e) => setMaxAIPlayers?.(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <input
              type="number"
              min={minAiPlayers}
              max={GAME_CONFIG.MAX_AI_PLAYERS_CUSTOM}
              value={typeof maxAIPlayers === 'number' ? maxAIPlayers : 5}
              onChange={(e) => setMaxAIPlayers?.(parseInt(e.target.value || '0', 10))}
              className="w-16 bg-gray-800 border border-gray-700 rounded p-1 text-center"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">How many AI-controlled roles join you.</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <label className="block text-sm text-gray-400 mb-1">Max Rounds (1–10)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              value={typeof maxRounds === 'number' ? maxRounds : 5}
              onChange={(e) => setMaxRounds?.(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <input
              type="number"
              min={1}
              max={10}
              value={typeof maxRounds === 'number' ? maxRounds : 5}
              onChange={(e) => setMaxRounds?.(parseInt(e.target.value || '1', 10))}
              className="w-16 bg-gray-800 border border-gray-700 rounded p-1 text-center"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Simulation length before debrief.</p>
        </div>
      </div>
    </div>
    <RoleSelection roles={roles} selectedRoleName={selectedRoleName} onSelect={onSelect} onStart={onStart} cta={cta} />
  </div>
);

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  selectedRoleName,
  setSelectedRoleName,
  gamePath,
  setGamePath,
  customScenario,
  setCustomScenario,
  gameSetup,
  setGameSetup,
  maxAIPlayers,
  setMaxAIPlayers,
  maxRounds,
  setMaxRounds,
  isFromPublicCatalog,
  setIsFromPublicCatalog,
  isLoading,
  handleCustomGameStart,
  handleStartGame,
  onNavigateToCustomScenario,
}) => {
  const [isMakePublicModalOpen, setIsMakePublicModalOpen] = useState(false);
  const [publicScenarios, setPublicScenarios] = useState<ScenarioCatalogItem[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [scenariosError, setScenariosError] = useState<string | null>(null);
  const [votedScenarios, setVotedScenarios] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = window.localStorage.getItem('votedScenarios');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Generate or retrieve user fingerprint for voting
  const getUserFingerprint = () => {
    if (typeof window === 'undefined') {
      return 'server-fingerprint';
    }
    let fingerprint = window.localStorage.getItem('userFingerprint');
    if (!fingerprint) {
      fingerprint = `fp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      window.localStorage.setItem('userFingerprint', fingerprint);
    }
    return fingerprint;
  };

  // Fetch scenarios catalog (official + contributed) on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      console.log('[LobbyScreen] Starting to fetch scenarios catalog...');
      setScenariosLoading(true);
      setScenariosError(null);
      try {
        const url = '/api/scenarios/catalog?sortBy=votes&limit=24';
        console.log('[LobbyScreen] Fetching from:', url);

        const response = await fetch(url);
        console.log('[LobbyScreen] Response status:', response.status);

        const data = await response.json();
        console.log('[LobbyScreen] Response data:', data);

        if (data.success) {
          console.log('[LobbyScreen] Successfully fetched scenarios:', data.scenarios.length);
          setPublicScenarios(data.scenarios);
        } else {
          console.error('[LobbyScreen] API returned success=false:', data.error);
          setScenariosError(data.error || 'Failed to fetch scenarios');
        }
      } catch (error) {
        console.error('[LobbyScreen] Failed to fetch scenarios:', error);
        console.error('[LobbyScreen] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        setScenariosError(error instanceof Error ? error.message : 'Network error');
      } finally {
        setScenariosLoading(false);
        console.log('[LobbyScreen] Finished fetching scenarios');
      }
    };
    fetchScenarios();
  }, []);

  const handleSelectPublicScenario = (scenario: ScenarioCatalogItem) => {
    // Set the gameSetup and gamePath so the game controller can use it
    setGameSetup(scenario.gameSetup);
    setGamePath('custom'); // Mark as custom to use preset scenario initialization
    setIsFromPublicCatalog(true); // Mark this scenario as from the public catalog
  };

  const handleVote = async (scenarioId: string) => {
    if (votedScenarios.has(scenarioId)) {
      return; // Already voted
    }

    try {
      const response = await fetch(`/api/scenarios/${scenarioId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFingerprint: getUserFingerprint(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Mark as voted locally and persist to localStorage
        const newVotedScenarios = new Set(votedScenarios).add(scenarioId);
        setVotedScenarios(newVotedScenarios);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('votedScenarios', JSON.stringify(Array.from(newVotedScenarios)));
        }

        // Update vote count in local state
        setPublicScenarios(prev =>
          prev.map(s =>
            s.id === scenarioId
              ? { ...s, voteCount: (s.voteCount || 0) + 1 }
              : s
          )
        );
      } else {
        console.error('Vote failed:', data.error);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 pt-24">
    <div className="text-center mb-10">
      <h1 className="text-5xl font-extrabold text-blue-400">Simulacra</h1>
      <p className="text-lg text-gray-300 mt-2 max-w-4xl mx-auto">
        AI-powered tabletop exercise for complex, high-stakes decision making.
      </p>
    </div>

    <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-lg p-6 mb-10 border border-gray-700">
      <h2 className="text-2xl font-bold text-blue-300 mb-3">How it works</h2>
      <div className="text-gray-300 space-y-4 text-left">
        <p>
          Step into a live crisis as a key decision-maker. Each round, you weigh limited resources against evolving threats, while hidden objectives keep every stakeholder's motives in play.
        </p>
        <p>
          An AI Game Master narrates consequences, adapts the scenario, and role-plays opposing factions—so every session is a fresh test of strategy, coordination, and foresight.
        </p>
      </div>
    </div>

    {!gamePath ? (
      <>
        {scenariosLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-gray-400">Loading scenarios...</p>
          </div>
        ) : scenariosError ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-lg mb-2">Failed to load scenarios</p>
            <p className="text-gray-500 text-sm">{scenariosError}</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid gap-4 md:grid-cols-3">
            {publicScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onSelect={() => handleSelectPublicScenario(scenario)}
                onVote={handleVote}
                hasVoted={votedScenarios.has(scenario.id)}
              />
            ))}
            <LobbyExperienceCard
              title="Create Your Own"
              description="Describe any crisis and let the AI Game Master craft a bespoke simulation with tailored roles."
              onSelect={() => {
                if (onNavigateToCustomScenario) {
                  onNavigateToCustomScenario();
                } else {
                  // Fallback to old behavior
                  setGamePath('custom');
                  setIsFromPublicCatalog(false);
                }
              }}
              cta="Build Scenario"
              accent="purple"
            />
          </div>
        )}
      </>
    ) : gameSetup ? (
      <>
        <PresetRoleSelection
          scenarioTitle={gameSetup.scenarioTitle}
          scenarioDescription={gameSetup.scenarioDescription}
          roles={mapStakeholdersToRoles(gameSetup.stakeholders)}
          selectedRoleName={selectedRoleName}
          onSelect={setSelectedRoleName}
          onStart={handleStartGame}
          cta="Start Custom Simulation"
          onMakePublic={!isFromPublicCatalog ? () => setIsMakePublicModalOpen(true) : undefined}
          maxAIPlayers={maxAIPlayers}
          setMaxAIPlayers={setMaxAIPlayers}
          maxRounds={maxRounds}
          setMaxRounds={setMaxRounds}
          minAiPlayers={0}
          isStarting={isLoading}
        />
        <MakePublicModal
          isOpen={isMakePublicModalOpen}
          onClose={() => setIsMakePublicModalOpen(false)}
          customPrompt={customScenario}
          gameSetup={gameSetup}
          initialEvent={{
            headline: gameSetup.scenarioTitle,
            detail: gameSetup.scenarioDescription,
          }}
        />
      </>
    ) : (
      <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-lg p-6 mb-10 border border-gray-700">
        <h2 className="text-3xl font-bold text-center mb-4">Describe Your Crisis Scenario</h2>
        <textarea
          value={customScenario}
          onChange={(e) => setCustomScenario(e.target.value)}
          placeholder="e.g., A coordinated drone attack takes down a major power grid..."
          className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <div className="text-center mt-6">
          <button
            onClick={() => {
              console.log('[LobbyScreen Button] Generate Scenario button clicked');
              console.log('[LobbyScreen Button] customScenario:', customScenario);
              console.log('[LobbyScreen Button] isLoading:', isLoading);
              console.log('[LobbyScreen Button] Calling handleCustomGameStart...');
              handleCustomGameStart();
            }}
            disabled={!customScenario || isLoading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Scenario & Roles'}
          </button>
        </div>
      </div>
    )}
    </div>
  );
};
import { GAME_CONFIG } from '@/gameConfig';
