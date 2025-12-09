import React from 'react';
import type { RoleData } from '../../types';
import { CheckCircleIcon } from '../Icons';
import { Button } from '@/components/ui/Button';

interface RoleCardProps {
  role: RoleData;
  onSelect: () => void;
  isSelected: boolean;
}

export const RoleCard: React.FC<RoleCardProps> = ({ role, onSelect, isSelected }) => (
  <div
    className={
      `bg-card rounded-lg p-6 border transition-all duration-200 ${
        isSelected ? 'border-accent shadow-md' : 'border-border hover:border-accent'
      }`
    }
  >
    <div className="flex items-center mb-4">
      <span className="w-2 h-2 rounded-full bg-accent mr-3" />
      <h3 className="text-xl font-semibold text-text">{role.name}</h3>
    </div>
    <p className="text-muted mb-2 text-sm">Public: {role.publicObjective}</p>
    <Button onClick={onSelect} disabled={isSelected} className="w-full mt-4">
      {isSelected ? (
        <>
          <CheckCircleIcon className="h-5 w-5 mr-2" /> Selected
        </>
      ) : (
        'Select Role'
      )}
    </Button>
  </div>
);
