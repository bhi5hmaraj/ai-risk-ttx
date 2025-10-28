/**
 * Frontend types - extends core types with React-specific properties
 * IMPORTANT: API routes should import from './types/core' instead to avoid React dependencies
 */

import React from 'react';

// Re-export all core types (backend-safe)
export * from './types/core';

// Override RoleData with React-specific version
export interface RoleData {
  name: string;
  publicObjective: string;
  hiddenObjective: string;
  resources: string[];
  constraints: string[];
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
}

// Re-export Player with React-aware RoleData
export interface Player {
  id: string;
  role: RoleData; // Use React-aware RoleData in frontend
  isHuman: boolean;
  hiddenScore: number;
  actionPoints: number;
  actions: import('./types/core').ActionOption[];
  hasSubmittedActions: boolean;
}

// All other types are re-exported from core above

// Re-export feedback types
export * from './types/feedback';

// Re-export public scenario types
export * from './types/publicScenario';
