import React from 'react';
import type { RoleData } from '../../types';
import { CheckCircleIcon } from '../Icons';

interface RoleCardProps {
  role: RoleData;
  onSelect: () => void;
  isSelected: boolean;
}

export const RoleCard: React.FC<RoleCardProps> = ({ role, onSelect, isSelected }) => (
  <div className={`bg-gray-800 rounded-lg p-6 border-2 transition-all duration-300 ease-in-out ${isSelected ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-700 hover:border-blue-600'}`}>
    <div className="flex items-center mb-4">
      <div className="bg-gray-700 p-2 rounded-md mr-4">
        {role.icon({ className: 'h-8 w-8 text-blue-400' })}
      </div>
      <h3 className="text-2xl font-bold text-white">{role.name}</h3>
    </div>
    <p className="text-gray-400 mb-2 text-sm">Public: {role.publicObjective}</p>
    <button
      onClick={onSelect}
      disabled={isSelected}
      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:bg-gray-600 disabled:cursor-not-allowed"
    >
      {isSelected ? (
        <>
          <CheckCircleIcon className="h-5 w-5 mr-2" /> Selected
        </>
      ) : (
        'Select Role'
      )}
    </button>
  </div>
);

