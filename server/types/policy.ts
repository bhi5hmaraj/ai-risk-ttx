// Re-export runtime policy utilities from shared/
export type {
  PolicyDimensionConfig,
  PolicyStance,
  Policy,
} from '../../shared/policy';

export {
  PRIVACY,
  SECURITY,
  TRANSPARENCY,
  ACCOUNTABILITY,
  INNOVATION,
  REGULATION,
  ALL_POLICY_DIMENSIONS,
  POLICY_DIMENSION_MAP,
  createDefaultPolicy,
  updatePolicyStance,
  getPolicyStance,
  validatePolicy,
} from '../../shared/policy';
