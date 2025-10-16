import React, { useState, useEffect } from 'react';
import type { GameSetup, RoleData } from '../types';
import { ROLES } from '../constants';
import { AI_SAFETY_SCENARIO } from '../presets';
import { BeakerIcon } from '../components/Icons';
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

interface LobbyScreenProps {
  selectedRoleName: string | null;
  setSelectedRoleName: (role: string | null) => void;
  gamePath: 'classic' | 'custom' | 'ai_safety' | null;
  setGamePath: (path: 'classic' | 'custom' | 'ai_safety' | null) => void;
  customScenario: string;
  setCustomScenario: (value: string) => void;
  gameSetup: GameSetup | null;
  setGameSetup: (setup: GameSetup | null) => void;
  isLoading: boolean;
  handleCustomGameStart: () => void;
  handleStartGame: () => void;
}

const LobbyExperienceCard: React.FC<{
  title: string;
  description: string;
  onSelect: () => void;
  cta: string;
}> = ({ title, description, onSelect, cta }) => (
  <button
    onClick={onSelect}
    className="w-full md:w-auto bg-gray-800 border border-gray-700 rounded-lg p-6 text-left hover:border-blue-500 transition-colors"
  >
    <h3 className="text-xl font-bold text-blue-300 mb-2">{title}</h3>
    <p className="text-sm text-gray-400 mb-4">{description}</p>
    <span className="inline-flex items-center text-blue-400 font-semibold">{cta}</span>
  </button>
);

const ScenarioCard: React.FC<{
  scenario: PublicScenario;
  onSelect: () => void;
  onVote: (scenarioId: string) => void;
  hasVoted: boolean;
}> = ({ scenario, onSelect, onVote, hasVoted }) => {
  const gameSetup = scenario.gameSetup;

  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection when clicking vote
    onVote(scenario.id);
  };

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-purple-500 transition-colors group cursor-pointer"
      onClick={onSelect}
    >
      <h4 className="text-lg font-bold text-purple-300 mb-2 group-hover:text-purple-200">
        {gameSetup.scenarioTitle}
      </h4>
      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
        {gameSetup.scenarioDescription}
      </p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{scenario.submitterName || 'Anonymous'}</span>
        <button
          onClick={handleVote}
          disabled={hasVoted}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            hasVoted
              ? 'text-purple-400 cursor-not-allowed'
              : 'text-gray-400 hover:text-purple-300 hover:bg-gray-700'
          }`}
          title={hasVoted ? 'Already voted' : 'Upvote this scenario'}
        >
          <span>👍</span>
          <span className="font-medium">{scenario.voteCount}</span>
        </button>
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
}> = ({ roles, selectedRoleName, onSelect, onStart, cta }) => (
  <div className="max-w-7xl mx-auto">
    <div className="text-center mb-10">
      <h2 className="text-3xl font-bold">Choose Your Role</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
        disabled={!selectedRoleName}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {cta}
      </button>
    </div>
  </div>
);

const mapStakeholdersToRoles = (stakeholders: RoleData[] | any[]): RoleData[] =>
  stakeholders.map((role: any) => ({
    name: role.name,
    publicObjective: role.publicObjective,
    hiddenObjective: role.hiddenObjective,
    resources: role.resources ?? [],
    constraints: role.constraints ?? [],
    icon: (props: React.SVGProps<SVGSVGElement>) => <BeakerIcon {...props} />,
  }));

const PresetRoleSelection: React.FC<{
  scenarioTitle: string;
  scenarioDescription: string;
  roles: RoleData[];
  selectedRoleName: string | null;
  onSelect: (role: string) => void;
  onStart: () => void;
  cta: string;
  onMakePublic?: () => void;
}> = ({ scenarioTitle, scenarioDescription, roles, selectedRoleName, onSelect, onStart, cta, onMakePublic }) => (
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
  isLoading,
  handleCustomGameStart,
  handleStartGame,
}) => {
  const [isMakePublicModalOpen, setIsMakePublicModalOpen] = useState(false);
  const [publicScenarios, setPublicScenarios] = useState<PublicScenario[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<PublicScenario | null>(null);
  const [votedScenarios, setVotedScenarios] = useState<Set<string>>(() => {
    // Load voted scenarios from localStorage on mount
    const stored = localStorage.getItem('votedScenarios');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Generate or retrieve user fingerprint for voting
  const getUserFingerprint = () => {
    let fingerprint = localStorage.getItem('userFingerprint');
    if (!fingerprint) {
      fingerprint = `fp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      localStorage.setItem('userFingerprint', fingerprint);
    }
    return fingerprint;
  };

  // Fetch public scenarios on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      setScenariosLoading(true);
      try {
        const response = await fetch('/api/scenarios?sortBy=votes&limit=6');
        const data = await response.json();
        if (data.success) {
          setPublicScenarios(data.scenarios);
        }
      } catch (error) {
        console.error('Failed to fetch scenarios:', error);
      } finally {
        setScenariosLoading(false);
      }
    };
    fetchScenarios();
  }, []);

  const handleSelectPublicScenario = (scenario: PublicScenario) => {
    setSelectedScenario(scenario);
    // Set the gameSetup and gamePath so the game controller can use it
    setGameSetup(scenario.gameSetup);
    setGamePath('custom'); // Mark as custom to use preset scenario initialization
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
        localStorage.setItem('votedScenarios', JSON.stringify(Array.from(newVotedScenarios)));

        // Update vote count in local state
        setPublicScenarios(prev =>
          prev.map(s =>
            s.id === scenarioId
              ? { ...s, voteCount: s.voteCount + 1 }
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
      <h1 className="text-5xl font-extrabold text-blue-400">Crisis Command</h1>
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

    {!gamePath && !selectedScenario ? (
      <>
      <div className="max-w-4xl mx-auto grid gap-4 md:grid-cols-3">
        <LobbyExperienceCard
          title="Classic Scenario"
          description="The original election security simulation that pits cross-sector leaders against cascading crises."
          onSelect={() => setGamePath('classic')}
          cta="Play Classic"
        />
        <LobbyExperienceCard
          title="AI Safety Scenario"
          description="Step into a geopolitically charged frontier where AGI mishaps threaten global stability."
          onSelect={() => setGamePath('ai_safety')}
          cta="Play AI Safety"
        />
        <LobbyExperienceCard
          title="Create Your Own"
          description="Describe any crisis and let the AI Game Master craft a bespoke simulation with tailored roles."
          onSelect={() => setGamePath('custom')}
          cta="Generate Scenario"
        />
      </div>

      {/* Browse Community Scenarios */}
      {publicScenarios.length > 0 && (
        <div className="max-w-6xl mx-auto mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-purple-300">Community Scenarios</h2>
            <p className="text-gray-400 mt-2">Play scenarios created by the community</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onSelect={() => handleSelectPublicScenario(scenario)}
                onVote={handleVote}
                hasVoted={votedScenarios.has(scenario.id)}
              />
            ))}
          </div>
        </div>
      )}
      </>
    ) : selectedScenario ? (
      <PresetRoleSelection
        scenarioTitle={selectedScenario.gameSetup.scenarioTitle}
        scenarioDescription={selectedScenario.gameSetup.scenarioDescription}
        roles={mapStakeholdersToRoles(selectedScenario.gameSetup.stakeholders)}
        selectedRoleName={selectedRoleName}
        onSelect={setSelectedRoleName}
        onStart={handleStartGame}
        cta="Start Community Scenario"
      />
    ) : gamePath === 'classic' ? (
      <RoleSelection
        roles={Object.values(ROLES)}
        selectedRoleName={selectedRoleName}
        onSelect={setSelectedRoleName}
        onStart={handleStartGame}
        cta="Start Simulation"
      />
    ) : gamePath === 'ai_safety' ? (
      <PresetRoleSelection
        scenarioTitle={AI_SAFETY_SCENARIO.scenarioTitle}
        scenarioDescription={AI_SAFETY_SCENARIO.scenarioDescription}
        roles={mapStakeholdersToRoles(AI_SAFETY_SCENARIO.stakeholders)}
        selectedRoleName={selectedRoleName}
        onSelect={setSelectedRoleName}
        onStart={handleStartGame}
        cta="Start AI Safety Simulation"
      />
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
          onMakePublic={() => setIsMakePublicModalOpen(true)}
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
            onClick={handleCustomGameStart}
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
