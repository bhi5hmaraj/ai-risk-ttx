"use client";

/**
 * RoleSelector - Shows available roles before connecting to a game room
 *
 * Displays a grid of role cards for players to choose from before joining.
 * Used for both host (creating game) and joining players.
 */

import React from 'react';
import { UserCircleIcon } from '../Icons';

interface Role {
  name: string;
  icon?: string;
  description?: string;
  isTaken?: boolean; // dynamically frozen role
}

interface RoleSelectorProps {
  availableRoles: Role[];
  selectedRole: string | null;
  onSelectRole: (roleName: string) => void;
  playerName?: string;
  onNameChange?: (name: string) => void;
  onConfirm: () => void;
  isConnecting?: boolean; // legacy name
  disabled?: boolean;     // preferred: when true, inputs + confirm are disabled
}

export function RoleSelector({
  availableRoles,
  selectedRole,
  onSelectRole,
  playerName = '',
  onNameChange,
  onConfirm,
  isConnecting = false,
  disabled,
}: RoleSelectorProps) {
  const busy = disabled ?? isConnecting;
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-700 p-8">
        <h1 className="text-4xl font-bold text-white text-center mb-2">Select Your Role</h1>
        <p className="text-gray-400 text-center mb-8">
          Choose a stakeholder role to play in this simulation
        </p>

        {/* Name Input */}
        {onNameChange && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter your name..."
              disabled={busy}
              className={`
                w-full px-4 py-3 rounded-lg border-2 bg-gray-700 text-white
                focus:outline-none focus:border-blue-500 transition-colors
                ${busy ? 'opacity-50 cursor-not-allowed border-gray-600' : 'border-gray-600'}
              `}
            />
          </div>
        )}

        {/* Role Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {availableRoles.map((role) => (
            <button
              key={role.name}
              onClick={() => onSelectRole(role.name)}
              disabled={busy || role.isTaken}
              className={`
                p-6 rounded-lg border-2 transition-all duration-200
                ${selectedRole === role.name
                  ? 'border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-500/20'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700'
                }
                ${busy || role.isTaken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex flex-col items-center text-center">
                <div className="text-4xl mb-2">{role.icon || '👤'}</div>
                <h3 className="text-lg font-bold text-white mb-1">{role.name}</h3>
                {role.description && (
                  <p className="text-sm text-gray-400">{role.description}</p>
                )}
                {role.isTaken && (
                  <p className="text-xs mt-2 text-red-300 font-semibold">Taken</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Confirm Button */}
        <div className="flex justify-center">
          <button
            onClick={onConfirm}
            disabled={!selectedRole || (onNameChange && !playerName.trim()) || busy}
            className={`
              px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200
              ${selectedRole && (!onNameChange || playerName.trim()) && !busy
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {busy ? 'Joining...' : 'Join Game'}
          </button>
        </div>

        {selectedRole && (
          <p className="text-center text-gray-400 text-sm mt-4">
            Selected: <span className="text-white font-semibold">{selectedRole}</span>
            {onNameChange && playerName && (
              <> as <span className="text-white font-semibold">{playerName}</span></>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
