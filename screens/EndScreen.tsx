import React from 'react';
import type { GameState, Player } from '../types';

interface EndScreenProps {
  gameState: GameState;
  players: Player[];
  onReset: () => void;
}

export const EndScreen: React.FC<EndScreenProps> = ({ gameState, players, onReset }) => (
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
              className={`flex items-center justify-between p-4 rounded-lg ${p.isHuman ? 'bg-blue-900/50 border border-blue-500' : 'bg-gray-700'}`}
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
    <button onClick={onReset} className="mt-10 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-12 rounded-lg text-xl">
      Play Again
    </button>
  </div>
);

