import React from 'react';
import type { GameSetup, RoleData } from '../types';
import { ROLES } from '../constants';
import { AI_SAFETY_SCENARIO } from '../presets';
import { BeakerIcon } from '../components/Icons';
import { RoleCard } from '../components/game';

interface LobbyScreenProps {
  selectedRoleName: string | null;
  setSelectedRoleName: (role: string | null) => void;
  gamePath: 'classic' | 'custom' | 'ai_safety' | null;
  setGamePath: (path: 'classic' | 'custom' | 'ai_safety' | null) => void;
  customScenario: string;
  setCustomScenario: (value: string) => void;
  gameSetup: GameSetup | null;
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
}> = ({ scenarioTitle, scenarioDescription, roles, selectedRoleName, onSelect, onStart, cta }) => (
  <div className="max-w-7xl mx-auto">
    <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-lg p-6 mb-10 border border-gray-700 text-center">
      <h2 className="text-3xl font-bold text-purple-300 mb-2">{scenarioTitle}</h2>
      <p className="text-gray-300">{scenarioDescription}</p>
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
  isLoading,
  handleCustomGameStart,
  handleStartGame,
}) => (
  <div className="min-h-screen bg-gray-900 text-white p-8">
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

    {!gamePath ? (
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
      <PresetRoleSelection
        scenarioTitle={gameSetup.scenarioTitle}
        scenarioDescription={gameSetup.scenarioDescription}
        roles={mapStakeholdersToRoles(gameSetup.stakeholders)}
        selectedRoleName={selectedRoleName}
        onSelect={setSelectedRoleName}
        onStart={handleStartGame}
        cta="Start Custom Simulation"
      />
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
