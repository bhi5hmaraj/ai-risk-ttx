/**
 * Test fixtures for game data
 */

import type { Player, GameState, RoleData } from '../../types';

export const mockRole: RoleData = {
  name: 'Tech CEO',
  publicObjective: 'Ensure election security and protect democratic processes',
  hiddenObjective: 'Maximize market share and avoid costly security regulations',
  resources: ['AI detection tools', 'Platform moderation team'],
  constraints: ['Shareholders demand profits', 'Limited regulatory compliance budget'],
  icon: (() => null) as any, // Simplified for testing
};

export const mockPlayer: Player = {
  id: 'test-player-1',
  role: mockRole,
  isHuman: false,
  hiddenScore: 0,
  actions: [],
  hasSubmittedActions: false,
};

export const mockGameState: GameState = {
  phase: 'ACTION' as const,
  round: 1,
  coreMetric: {
    name: 'Democratic Legitimacy',
    description: 'Public trust in democratic institutions',
    value: 80,
  },
  eventLog: [],
  currentEvent: {
    headline: 'Deepfake Video of Candidate Goes Viral',
    detail: 'A sophisticated AI-generated video showing a major candidate making inflammatory statements has spread across social media.',
  },
};

export const mockActionOptions = [
  {
    title: 'Deploy AI Detection Tools',
    description: 'Roll out automated deepfake detection across the platform',
    cost: 2,
  },
  {
    title: 'Issue Public Statement',
    description: 'Reassure users about platform integrity',
    cost: 1,
  },
  {
    title: 'Collaborate with Fact-Checkers',
    description: 'Partner with independent organizations',
    cost: 2,
  },
  {
    title: 'Implement Content Warnings',
    description: 'Add warning labels to suspicious content',
    cost: 1,
  },
  {
    title: 'Temporary Content Freeze',
    description: 'Pause viral content spread while investigating',
    cost: 3,
  },
];

export const mockAITurnResponse = {
  options: mockActionOptions,
  chosenActions: [
    mockActionOptions[0], // Deploy AI Detection Tools
    mockActionOptions[3], // Implement Content Warnings
  ],
  reasoning: 'Deploying AI tools shows innovation while warnings avoid regulatory backlash. Total cost: 3 points.',
};

export const mockCounterfactualResponse = {
  publicScoreUpdate: -15,
};

export const mockConsequenceResponse = {
  roundSummary: 'The Tech CEO deployed AI detection tools while implementing content warnings...',
  outcomeTimeline: [
    {
      title: 'AI Tools Deployed',
      description: 'Detection systems flagged thousands of suspicious videos.',
      impact: 'Public confidence increased slightly (+5)',
    },
    {
      title: 'Warning Labels Applied',
      description: 'Users saw warnings on viral content.',
      impact: 'Reduced panic and misinformation spread (+3)',
    },
    {
      title: 'Regulatory Response',
      description: 'Government officials praised proactive measures.',
      impact: 'Avoided immediate regulatory action (+2)',
    },
  ],
  counterfactualNote: 'If no one had acted, Democratic Legitimacy would have dropped by -15 points as the deepfake continued to spread unchecked.',
  publicScoreUpdate: 10,
  hiddenScoreUpdates: [
    {
      roleName: 'Tech CEO',
      update: 5,
      justification: 'Successfully demonstrated innovation while avoiding regulation.',
    },
  ],
  nextEvent: {
    headline: 'Foreign Actors Exploit Detection Loopholes',
    detail: 'Sophisticated actors have found ways around the AI detection systems...',
  },
};
