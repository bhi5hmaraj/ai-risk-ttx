import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let shared: any;
try {
  // Use built CommonJS artifact from root dist/
  shared = require('../../../dist/shared/policy.js');
} catch (e) {
  const err = e as Error;
  throw new Error(
    `Policy runtime not built. Run \"pnpm -w run build:server\" first.\n` +
      `Underlying error: ${err?.message || err}`,
  );
}

export const { ALL_POLICY_DIMENSIONS, updatePolicyStance, createDefaultPolicy } = shared;

