import React, { useState } from 'react';
import type { Player, GameLogEntry } from '../../types';
import { EyeIcon, EyeSlashIcon } from '../Icons';

interface PlayerInfoPanelProps {
  player: Player;
  eventLog?: GameLogEntry[]; // kept optional for future use
}

export const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({ player }) => {
  const [showHidden, setShowHidden] = useState(false);

  return (
    <div className="sticky top-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="bg-gray-700 p-3 rounded-md mr-4">
            {player.role.icon({ className: 'h-10 w-10 text-blue-400' })}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{player.role.name}</h2>
            <span className="text-sm text-blue-400 font-semibold">Your Role</span>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <p>
            <strong className="text-blue-300">Public Objective:</strong> {player.role.publicObjective}
          </p>
          <div className="bg-gray-900 p-3 rounded-md border border-gray-700">
            <button
              type="button"
              onClick={() => setShowHidden((prev) => !prev)}
              className="flex justify-between items-center w-full cursor-pointer"
            >
              <strong className="text-amber-300">Hidden Objective</strong>
              {showHidden ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
            </button>
            {showHidden && <p className="mt-2 text-amber-200 italic">{player.role.hiddenObjective}</p>}
          </div>
          {player.role.resources.length > 0 && (
            <div>
              <strong className="text-blue-300">Resources:</strong>
              <ul className="mt-1 text-gray-300 list-disc list-inside space-y-1">
                {player.role.resources.map((resource) => (
                  <li key={resource}>{resource}</li>
                ))}
              </ul>
            </div>
          )}
          {player.role.constraints.length > 0 && (
            <div>
              <strong className="text-blue-300">Constraints:</strong>
              <ul className="mt-1 text-gray-300 list-disc list-inside space-y-1">
                {player.role.constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </div>
          )}
          <p>
            <strong className="text-blue-300">Personal Score:</strong> {player.hiddenScore}
          </p>
        </div>
      </div>
    </div>
  );
};

