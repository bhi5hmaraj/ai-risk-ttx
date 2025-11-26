/**
 * Schema Backward Compatibility Tests
 *
 * Tests that old public scenarios (created before schema changes) still validate correctly.
 * This test suite prevents regressions when adding new required fields to schemas.
 *
 * Issue: Schema drift caused "The Great Milady Convergence" and other old scenarios to fail
 * validation when icon, resources, and constraints fields were added.
 */

import { describe, it, expect } from 'vitest';
import {
  StakeholderSchema,
  CanonicalGameSetupSchema,
  type Stakeholder,
  type CanonicalGameSetup
} from '@/server/types/scenario';

describe('Schema Backward Compatibility', () => {
  describe('StakeholderSchema', () => {
    it('should accept old stakeholder format without icon field', () => {
      const oldStakeholder = {
        name: 'The Press',
        publicObjective: 'Report on the crisis',
        hiddenObjective: 'Get exclusive scoops',
        resources: ['Press credentials', 'Media connections'],
        constraints: ['Ethics code', 'Deadline pressure']
      };

      const result = StakeholderSchema.safeParse(oldStakeholder);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should apply default icon
        expect(result.data.icon).toBe('🎯');
        expect(result.data.name).toBe('The Press');
      }
    });

    it('should accept old stakeholder format without resources field', () => {
      const oldStakeholder = {
        name: 'Campaign Manager',
        icon: '📊',
        publicObjective: 'Win the election',
        hiddenObjective: 'Maximize donations',
        constraints: ['Campaign finance laws']
      };

      const result = StakeholderSchema.safeParse(oldStakeholder);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should apply default empty array
        expect(result.data.resources).toEqual([]);
        expect(result.data.constraints).toEqual(['Campaign finance laws']);
      }
    });

    it('should accept old stakeholder format without constraints field', () => {
      const oldStakeholder = {
        name: 'Tech CEO',
        icon: '💼',
        publicObjective: 'Maintain platform integrity',
        hiddenObjective: 'Protect company reputation',
        resources: ['Engineering team', 'PR department']
      };

      const result = StakeholderSchema.safeParse(oldStakeholder);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should apply default empty array
        expect(result.data.constraints).toEqual([]);
        expect(result.data.resources).toEqual(['Engineering team', 'PR department']);
      }
    });

    it('should accept old stakeholder format missing ALL optional fields', () => {
      const oldStakeholder = {
        name: 'Election Commissioner',
        publicObjective: 'Ensure fair elections',
        hiddenObjective: 'Maintain bipartisan support'
      };

      const result = StakeholderSchema.safeParse(oldStakeholder);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should apply all defaults
        expect(result.data.icon).toBe('🎯');
        expect(result.data.resources).toEqual([]);
        expect(result.data.constraints).toEqual([]);
      }
    });

    it('should accept null values for resources and constraints', () => {
      const stakeholder: Stakeholder = {
        name: 'Federal Regulator',
        icon: '⚖️',
        publicObjective: 'Enforce regulations',
        hiddenObjective: 'Expand agency authority',
        resources: null,
        constraints: null
      };

      const result = StakeholderSchema.safeParse(stakeholder);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resources).toBeNull();
        expect(result.data.constraints).toBeNull();
      }
    });

    it('should still require core fields (name, objectives)', () => {
      const invalidStakeholder = {
        icon: '🎯',
        resources: [],
        constraints: []
      };

      const result = StakeholderSchema.safeParse(invalidStakeholder);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.errors.map(e => e.path[0]);
        expect(errors).toContain('name');
        expect(errors).toContain('publicObjective');
        expect(errors).toContain('hiddenObjective');
      }
    });
  });

  describe('CanonicalGameSetupSchema (Full Scenario)', () => {
    it('should accept old scenario format with stakeholders missing optional fields', () => {
      const oldScenario = {
        scenarioTitle: 'The Great Milady Convergence',
        scenarioDescription: 'A mysterious AI-driven social movement threatens election integrity',
        coreMetric: {
          name: 'Democratic Legitimacy',
          description: 'Public trust in the democratic process',
          value: 100
        },
        stakeholders: [
          {
            name: 'Election Commissioner',
            publicObjective: 'Ensure fair elections',
            hiddenObjective: 'Maintain bipartisan support'
            // Missing: icon, resources, constraints
          },
          {
            name: 'Tech CEO',
            publicObjective: 'Platform integrity',
            hiddenObjective: 'Protect reputation'
            // Missing: icon, resources, constraints
          }
        ],
        maxRounds: null,
        maxAIPlayers: null
      };

      const result = CanonicalGameSetupSchema.safeParse(oldScenario);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should apply defaults to all stakeholders
        expect(result.data.stakeholders[0].icon).toBe('🎯');
        expect(result.data.stakeholders[0].resources).toEqual([]);
        expect(result.data.stakeholders[0].constraints).toEqual([]);
        expect(result.data.stakeholders[1].icon).toBe('🎯');
        expect(result.data.stakeholders[1].resources).toEqual([]);
        expect(result.data.stakeholders[1].constraints).toEqual([]);
      }
    });

    it('should accept mix of old and new stakeholder formats', () => {
      const mixedScenario: CanonicalGameSetup = {
        scenarioTitle: 'Mixed Format Scenario',
        scenarioDescription: 'Some stakeholders have new fields, some dont',
        coreMetric: {
          name: 'Public Trust',
          description: 'Overall trust score',
          value: 75
        },
        stakeholders: [
          // New format (all fields)
          {
            name: 'Journalist',
            icon: '📰',
            publicObjective: 'Report truth',
            hiddenObjective: 'Win Pulitzer',
            resources: ['Press pass', 'Sources'],
            constraints: ['Ethics code']
          },
          // Old format (missing optional fields)
          {
            name: 'Campaign Manager',
            publicObjective: 'Win election',
            hiddenObjective: 'Get promoted'
          } as any // Cast to bypass TS checking for this test
        ],
        maxRounds: 5,
        maxAIPlayers: 3
      };

      const result = CanonicalGameSetupSchema.safeParse(mixedScenario);
      expect(result.success).toBe(true);
      if (result.success) {
        // New format preserved
        expect(result.data.stakeholders[0].icon).toBe('📰');
        expect(result.data.stakeholders[0].resources).toEqual(['Press pass', 'Sources']);

        // Old format got defaults
        expect(result.data.stakeholders[1].icon).toBe('🎯');
        expect(result.data.stakeholders[1].resources).toEqual([]);
      }
    });

    it('should validate stakeholder array has minimum 2 entries', () => {
      const invalidScenario = {
        scenarioTitle: 'Invalid Scenario',
        scenarioDescription: 'Not enough stakeholders',
        coreMetric: {
          name: 'Trust',
          description: 'Trust level',
          value: 50
        },
        stakeholders: [
          {
            name: 'Single Stakeholder',
            publicObjective: 'Do something',
            hiddenObjective: 'Do something else'
          }
        ],
        maxRounds: null,
        maxAIPlayers: null
      };

      const result = CanonicalGameSetupSchema.safeParse(invalidScenario);
      expect(result.success).toBe(false);
      if (!result.success) {
        const arrayError = result.error.errors.find(e =>
          e.path.includes('stakeholders') && e.message.includes('At least 2')
        );
        expect(arrayError).toBeDefined();
      }
    });
  });

  describe('Real-World Scenario: "The Great Milady Convergence"', () => {
    it('should successfully parse the actual failing scenario data', () => {
      // This is the actual data structure that was failing in production
      const miladyScenario = {
        scenarioTitle: 'The Great Milady Convergence',
        scenarioDescription: 'A coordinated AI-driven social movement using deepfakes and memetic warfare to influence the election. Multiple stakeholders must navigate between security, free speech, and electoral integrity.',
        coreMetric: {
          name: 'Democratic Legitimacy',
          description: "Public's trust in the democratic process.",
          value: 100
        },
        stakeholders: [
          {
            name: 'Election Commissioner',
            publicObjective: 'Maintain election integrity and public trust',
            hiddenObjective: 'Ensure bipartisan approval for reappointment'
            // These fields were missing, causing validation to fail
          },
          {
            name: 'Tech Platform CEO',
            publicObjective: 'Balance free speech with platform safety',
            hiddenObjective: 'Avoid regulatory crackdown while maintaining user growth'
          },
          {
            name: 'Investigative Journalist',
            publicObjective: 'Expose the truth about the AI influence campaign',
            hiddenObjective: 'Win a Pulitzer Prize'
          },
          {
            name: 'Federal Cybersecurity Director',
            publicObjective: 'Protect election infrastructure from threats',
            hiddenObjective: 'Secure increased budget and authority'
          }
        ],
        maxRounds: null,
        maxAIPlayers: null
      };

      const result = CanonicalGameSetupSchema.safeParse(miladyScenario);

      // This test would have FAILED before the backward-compatibility fix
      // Now it should PASS with default values applied
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.stakeholders).toHaveLength(4);

        // Verify all stakeholders got default values
        result.data.stakeholders.forEach(stakeholder => {
          expect(stakeholder.icon).toBe('🎯');
          expect(stakeholder.resources).toEqual([]);
          expect(stakeholder.constraints).toEqual([]);
          expect(stakeholder.name).toBeTruthy();
          expect(stakeholder.publicObjective).toBeTruthy();
          expect(stakeholder.hiddenObjective).toBeTruthy();
        });
      }
    });
  });

  describe('Regression Tests', () => {
    it('should not break new scenarios with all fields present', () => {
      const newScenario: CanonicalGameSetup = {
        scenarioTitle: 'Modern Scenario',
        scenarioDescription: 'Created with latest schema',
        coreMetric: {
          name: 'Security Score',
          description: 'Overall security posture',
          value: 80
        },
        stakeholders: [
          {
            name: 'Security Analyst',
            icon: '🔒',
            publicObjective: 'Identify threats',
            hiddenObjective: 'Advance career',
            resources: ['Security tools', 'Intel feeds'],
            constraints: ['Budget limits', 'Legal restrictions']
          },
          {
            name: 'Policy Maker',
            icon: '📋',
            publicObjective: 'Create effective policy',
            hiddenObjective: 'Build political capital',
            resources: ['Legislative power', 'Staff support'],
            constraints: ['Public opinion', 'Lobby pressure']
          }
        ],
        maxRounds: 7,
        maxAIPlayers: 4
      };

      const result = CanonicalGameSetupSchema.safeParse(newScenario);
      expect(result.success).toBe(true);
      if (result.success) {
        // All values should be preserved exactly as provided
        expect(result.data.stakeholders[0].icon).toBe('🔒');
        expect(result.data.stakeholders[0].resources).toEqual(['Security tools', 'Intel feeds']);
        expect(result.data.stakeholders[0].constraints).toEqual(['Budget limits', 'Legal restrictions']);
        expect(result.data.stakeholders[1].icon).toBe('📋');
      }
    });
  });
});
