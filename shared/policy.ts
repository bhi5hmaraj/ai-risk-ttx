/**
 * Policy system types and utilities (CP4)
 * Enum-free file for cross-package compatibility
 */

/**
 * Policy dimension configuration
 * Each dimension has a key, description, and default value
 */
export interface PolicyDimensionConfig {
  readonly key: string;
  readonly description: string;
  readonly defaultValue: number;
}

/**
 * Concrete policy dimensions
 */
export const PRIVACY: PolicyDimensionConfig = {
  key: 'privacy',
  description: 'Data protection and user privacy',
  defaultValue: 0,
};

export const SECURITY: PolicyDimensionConfig = {
  key: 'security',
  description: 'System security and safety',
  defaultValue: 0,
};

export const TRANSPARENCY: PolicyDimensionConfig = {
  key: 'transparency',
  description: 'Openness and disclosure',
  defaultValue: 0,
};

export const ACCOUNTABILITY: PolicyDimensionConfig = {
  key: 'accountability',
  description: 'Responsibility and oversight',
  defaultValue: 0,
};

export const INNOVATION: PolicyDimensionConfig = {
  key: 'innovation',
  description: 'Technological advancement',
  defaultValue: 0,
};

export const REGULATION: PolicyDimensionConfig = {
  key: 'regulation',
  description: 'Government intervention and control',
  defaultValue: 0,
};

/**
 * All policy dimensions as a const array
 */
export const ALL_POLICY_DIMENSIONS = [
  PRIVACY,
  SECURITY,
  TRANSPARENCY,
  ACCOUNTABILITY,
  INNOVATION,
  REGULATION,
] as const;

/**
 * Map of dimension keys to configs for fast lookup
 */
export const POLICY_DIMENSION_MAP: Record<string, PolicyDimensionConfig> = {
  [PRIVACY.key]: PRIVACY,
  [SECURITY.key]: SECURITY,
  [TRANSPARENCY.key]: TRANSPARENCY,
  [ACCOUNTABILITY.key]: ACCOUNTABILITY,
  [INNOVATION.key]: INNOVATION,
  [REGULATION.key]: REGULATION,
};

/**
 * Individual policy stance with description and numeric value
 */
export interface PolicyStance {
  description: string; // Explanation of the stance
  value: number; // Numeric value in range [-100, 100], sign indicates direction
}

/**
 * Player policy (CP4)
 * Immutable template-based policy system
 * All modifications must go through PolicyManager
 */
export interface Policy {
  stances: Record<string, PolicyStance>;
}

/**
 * Create a new policy from the default template
 */
export function createDefaultPolicy(): Policy {
  const stances: Record<string, PolicyStance> = {};

  for (const dimension of ALL_POLICY_DIMENSIONS) {
    stances[dimension.key] = {
      description: dimension.description,
      value: dimension.defaultValue,
    };
  }

  return { stances };
}

/**
 * Update a specific policy stance value
 * Returns true if successful, false if invalid
 */
export function updatePolicyStance(
  policy: Policy,
  dimensionKey: string,
  value: number,
  description?: string,
): boolean {
  if (value < -100 || value > 100) return false;
  const dimensionConfig = POLICY_DIMENSION_MAP[dimensionKey];
  if (!dimensionConfig) return false;

  const existingStance = policy.stances[dimensionKey];
  policy.stances[dimensionKey] = {
    description:
      description ?? existingStance?.description ?? dimensionConfig.description,
    value,
  };
  return true;
}

/**
 * Get a specific policy stance
 */
export function getPolicyStance(
  policy: Policy,
  dimensionKey: string,
): PolicyStance | null {
  return policy.stances[dimensionKey] || null;
}

/**
 * Validate policy structure and values
 */
export function validatePolicy(policy: Policy): boolean {
  for (const dimension of ALL_POLICY_DIMENSIONS) {
    if (!policy.stances[dimension.key]) return false;
  }
  return Object.values(policy.stances).every(
    (stance) =>
      stance &&
      typeof stance.value === 'number' &&
      stance.value >= -100 &&
      stance.value <= 100 &&
      typeof stance.description === 'string' &&
      stance.description.length > 0,
  );
}

