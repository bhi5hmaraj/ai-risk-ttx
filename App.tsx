import React, { useMemo } from 'react';
import { LoadingSpinner, BeakerIcon } from './components/Icons';
import {
  RoundSnapshotCard,
  EventLog,
  ActionSelection,
  PlayerInfoPanel,
  GameStatusPanel,
  ActionTreeModal,
  RoleCard,
} from './components/game';
import { ACTION_TREE_STYLESHEET, buildActionTreeData } from './services/gameHelpers';
import { useGameController } from './hooks/useGameController';
import { GamePhase, RoleData, GameLogEntry } from './types';
import { ROLES } from './constants';
import { AI_SAFETY_SCENARIO } from './presets';

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

const LobbyScreen: React.FC<{
  selectedRoleName: string | null;
  setSelectedRoleName: (name: string | null) => void;
  gamePath: 'classic' | 'custom' | 'ai_safety' | null;
  setGamePath: (path: 'classic' | 'custom' | 'ai_safety' | null) => void;
  customScenario: string;
  setCustomScenario: (value: string) => void;
  gameSetup: any;
  isLoading: boolean;
  handleCustomGameStart: () => void;
  handleStartGame: () => void;
}> = ({
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
      <h1 className="text-5xl font-extrabold text-blue-400">AI Election Crisis</h1>
      <p className="text-lg text-gray-300 mt-2 max-w-4xl mx-auto">
        A Tabletop Exercise in Strategic Decision-Making
      </p>
    </div>

    <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-lg p-6 mb-10 border border-gray-700">
      <h2 className="text-2xl font-bold text-blue-300 mb-3">What is this?</h2>
      <div className="text-gray-300 space-y-4 text-left">
        <p>
          This is a <strong className="text-white">Tabletop Exercise (TTX)</strong>: a simulated crisis where you role-play as a key decision-maker. Think of it as a serious game designed to test your strategic thinking and reveal how complex systems respond to pressure.
        </p>
        <p>
          In this AI-powered simulation, you'll choose a role and face an escalating scenario. You must make tough choices with limited resources to advance your secret objectives while maintaining public trust. An <strong className="text-white">AI Game Master</strong> generates the story, controls the other characters, and shapes the consequences of your actions, ensuring a unique challenge every time.
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
    <RoleSelection
      roles={roles}
      selectedRoleName={selectedRoleName}
      onSelect={onSelect}
      onStart={onStart}
      cta={cta}
    />
  </div>
);

const ActionTreePortal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  logEntry: GameLogEntry | null;
  eventLog: GameLogEntry[];
}> = ({ isOpen, onClose, logEntry, eventLog }) => {
  const { elements } = useMemo(() => buildActionTreeData(eventLog), [eventLog]);

  return (
    <ActionTreeModal
      isOpen={isOpen}
      onClose={onClose}
      logEntry={logEntry}
      stylesheet={ACTION_TREE_STYLESHEET}
      elements={elements}
    />
  );
};

const mapStakeholdersToRoles = (stakeholders: RoleData[] | any[]): RoleData[] =>
  stakeholders.map((role: any) => ({
    name: role.name,
    publicObjective: role.publicObjective,
    hiddenObjective: role.hiddenObjective,
    resources: role.resources ?? [],
    constraints: role.constraints ?? [],
    icon: (props: React.SVGProps<SVGSVGElement>) => <BeakerIcon {...props} />,
  }));

export default function App() {
  const {
    state: {
      gameState,
      players,
      selectedRoleName,
      gamePath,
      gameSetup,
      customScenario,
      isLoading,
      loadingMessage,
      error,
      timer,
      isPaused,
      actionOptions,
      aiCompletionStatus,
      isActionTreeOpen,
      isHistoryOpen,
      expandedRound,
      latestLogEntry,
      canViewActionTree,
    },
    actions: {
      setSelectedRoleName,
      setGamePath,
      setCustomScenario,
      setExpandedRound,
      setIsActionTreeOpen,
      setIsPaused,
      handleCustomGameStart,
      handleStartGame,
      handleConfirmActions,
      resetState,
      handleOpenActionTree,
      handleToggleHistory,
    },
    derived: { humanPlayer, handlePauseToggle },
  } = useGameController();

  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <>
        <ActionTreePortal isOpen={isActionTreeOpen} onClose={() => setIsActionTreeOpen(false)} logEntry={latestLogEntry} eventLog={gameState.eventLog} />
        <LobbyScreen
          selectedRoleName={selectedRoleName}
          setSelectedRoleName={setSelectedRoleName}
          gamePath={gamePath}
          setGamePath={setGamePath}
          customScenario={customScenario}
          setCustomScenario={setCustomScenario}
          gameSetup={gameSetup}
          isLoading={isLoading}
          handleCustomGameStart={handleCustomGameStart}
          handleStartGame={handleStartGame}
        />
      </>
    );
  }

  if (isLoading && gameState.phase !== GamePhase.ACTION) {
    return (
      <>
        <ActionTreePortal isOpen={isActionTreeOpen} onClose={() => setIsActionTreeOpen(false)} logEntry={latestLogEntry} eventLog={gameState.eventLog} />
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
          <LoadingSpinner />
          <p className="text-xl mt-4 text-blue-300">{loadingMessage}</p>
          {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
      </>
    );
  }

  if (gameState.phase === GamePhase.END) {
    return (
      <>
        <ActionTreePortal isOpen={isActionTreeOpen} onClose={() => setIsActionTreeOpen(false)} logEntry={latestLogEntry} eventLog={gameState.eventLog} />
        <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center">
          <h1 className="text-5xl font-extrabold text-blue-400 mb-4">Simulation Over</h1>
          <p className="text-lg text-gray-300 mb-8">
            Final {gameState.coreMetric.name}:{' '}
            <span className="text-2xl font-bold text-green-400">{gameState.coreMetric.value}%</span>
          </p>
          <div className="bg-gray-800 rounded-lg p-8 w-full max-w-4xl">
            <h2 className="text-3xl font-bold mb-6 text-center">Final Scores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {players
                .slice()
                .sort((a, b) => b.hiddenScore - a.hiddenScore)
                .map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      p.isHuman ? 'bg-blue-900/50 border border-blue-500' : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      {p.role.icon({ className: 'h-8 w-8 mr-4 text-blue-300' })}
                      <span className="font-bold">{p.role.name}</span>
                    </div>
                    <span className="text-xl font-mono">{p.hiddenScore > 0 ? '+' : ''}{p.hiddenScore}</span>
                  </div>
                ))}
            </div>
          </div>
          <button onClick={resetState} className="mt-10 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-12 rounded-lg text-xl">
            Play Again
          </button>
        </div>
      </>
    );
  }

  if (humanPlayer) {
    return (
      <>
        <ActionTreePortal isOpen={isActionTreeOpen} onClose={() => setIsActionTreeOpen(false)} logEntry={latestLogEntry} eventLog={gameState.eventLog} />
        <div className="min-h-screen bg-gray-900 p-4 md:p-6 lg:p-8">
          <div className="max-w-8xl mx-auto">
            {error && (
              <div className="bg-red-800/50 border border-red-500 text-red-300 p-4 rounded-lg mb-4 text-center">{error}</div>
            )}
            <GameStatusPanel gameState={gameState} timer={timer} isPaused={isPaused} onPauseClick={handlePauseToggle} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-3">
                <PlayerInfoPanel player={humanPlayer} />
              </div>
              <div className="lg:col-span-6 space-y-6">
                <RoundSnapshotCard
                  gameState={gameState}
                  latestLogEntry={latestLogEntry}
                  onToggleHistory={handleToggleHistory}
                  isHistoryOpen={isHistoryOpen}
                  onViewActionTree={handleOpenActionTree}
                  canViewActionTree={canViewActionTree}
                />
                {isHistoryOpen && (
                  <EventLog
                    gameState={gameState}
                    players={players}
                    onViewActionTree={handleOpenActionTree}
                    canViewActionTree={canViewActionTree}
                    expandedRound={expandedRound}
                    setExpandedRound={setExpandedRound}
                  />
                )}
              </div>
              <div className="lg:col-span-3">
                <ActionSelection
                  key={gameState.round}
                  options={actionOptions}
                  onConfirm={handleConfirmActions}
                  isLoading={isLoading && !humanPlayer.hasSubmittedActions}
                  hasSubmitted={humanPlayer.hasSubmittedActions}
                  isPaused={isPaused}
                  players={players}
                  aiCompletionStatus={aiCompletionStatus}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ActionTreePortal isOpen={isActionTreeOpen} onClose={() => setIsActionTreeOpen(false)} logEntry={latestLogEntry} eventLog={gameState.eventLog} />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <p className="text-red-500 text-2xl font-bold mb-4">{error || 'An unexpected error occurred.'}</p>
        <button onClick={resetState} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
          Back to Home
        </button>
      </div>
    </>
  );
}
