/**
 * Common validation utilities for CLI commands
 * Throws ValidationError with user-friendly messages
 */

import type { CommandContext } from './CommandContext.js';
import { ALL_POLICY_DIMENSIONS, updatePolicyStance, createDefaultPolicy } from '../policy-runtime.js';

/**
 * Custom error for validation failures
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate minimum number of arguments
 */
export function validateArgs(args: string[], minArgs: number, usage: string): void {
  if (args.length < minArgs) {
    throw new ValidationError(usage);
  }
}

/**
 * Parse and validate a positive integer
 */
export function parsePositiveInt(input: string, fieldName: string = 'number'): number {
  const num = parseInt(input, 10);
  if (isNaN(num) || num < 1) {
    throw new ValidationError(`Invalid ${fieldName}. Please provide a number from the list.`);
  }
  return num;
}

/**
 * Validate array index is within bounds (1-indexed input)
 */
export function validateIndex(userNumber: number, arrayLength: number, itemName: string): number {
  const index = userNumber - 1;
  if (index < 0 || index >= arrayLength) {
    throw new ValidationError(`Invalid ${itemName} number. Choose 1-${arrayLength}`);
  }
  return index;
}

/**
 * Require PhaseHandler to exist
 */
export function requirePhaseHandler(ctx: CommandContext, itemName: string): void {
  if (!ctx.phaseHandler) {
    throw new ValidationError(`${itemName} selection not available.`);
  }
}

/**
 * Require array to exist and have items
 */
export function requireArray<T>(array: T[] | undefined, itemName: string): T[] {
  if (!array || array.length === 0) {
    throw new ValidationError(`No ${itemName}s available yet.`);
  }
  return array;
}

/**
 * Parse comma-separated numbers (e.g., "1,2,3")
 */
export function parseCommaSeparatedNumbers(args: string[]): number[] {
  const input = args.join('').replace(/\s/g, ''); // Remove all spaces
  const numbers = input.split(',').map(n => parseInt(n, 10));

  // Validate all parsed numbers
  for (const num of numbers) {
    if (isNaN(num)) {
      throw new ValidationError(`Invalid number in input: ${args.join(' ')}`);
    }
  }

  return numbers;
}

/**
 * Validate data structure has required property
 */
export function requireProperty<T>(
  obj: T | undefined,
  propertyPath: string,
  itemName: string
): void {
  if (!obj) {
    throw new ValidationError(`Invalid ${itemName} data`);
  }

  const props = propertyPath.split('.');
  let current: any = obj;

  for (const prop of props) {
    if (!current || !current[prop]) {
      throw new ValidationError(`Invalid ${itemName} data`);
    }
    current = current[prop];
  }
}

/**
 * Parse and validate policy input JSON
 * Supports both simple format: {"privacy": 80}
 * And complex format: {"privacy": {"value": 80, "description": "..."}}
 *
 * Uses centralized PolicyManager validation
 * Returns stances ready to send to server
 */
export function validatePolicyInput(jsonStr: string): Record<string, { value: number; description?: string }> {
  const VALID_DIMENSION_KEYS = ALL_POLICY_DIMENSIONS.map(d => d.key);

  // Parse JSON
  let input: Record<string, any>;
  try {
    input = JSON.parse(jsonStr);
  } catch (e) {
    throw new ValidationError('Invalid JSON format');
  }

  // Validate structure
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ValidationError('Policy must be an object with dimension-value pairs');
  }

  if (Object.keys(input).length === 0) {
    throw new ValidationError('Policy must have at least one stance dimension');
  }

  // Build and validate stances using centralized PolicyManager
  const tempPolicy = createDefaultPolicy();
  const stances: Record<string, { value: number; description?: string }> = {};

  for (const [dimensionKey, valueOrObj] of Object.entries(input)) {
    // Validate dimension
    if (!VALID_DIMENSION_KEYS.includes(dimensionKey)) {
      throw new ValidationError(`Invalid dimension "${dimensionKey}". Allowed: ${VALID_DIMENSION_KEYS.join(', ')}`);
    }

    // Parse value and description
    let value: number;
    let description: string | undefined;

    if (typeof valueOrObj === 'number') {
      // Simple format: {"privacy": 80}
      value = valueOrObj;
    } else if (typeof valueOrObj === 'object' && valueOrObj !== null) {
      // Complex format: {"privacy": {"value": 80, "description": "..."}}
      if (typeof valueOrObj.value !== 'number') {
        throw new ValidationError(`Missing or invalid "value" for "${dimensionKey}"`);
      }
      value = valueOrObj.value;
      description = valueOrObj.description;
    } else {
      throw new ValidationError(`Invalid format for "${dimensionKey}". Use number or {value, description}`);
    }

    // Use centralized validator
    const success = updatePolicyStance(
      tempPolicy,
      dimensionKey,
      value,
      description
    );

    if (!success) {
      throw new ValidationError(`Value for "${dimensionKey}" must be in range [-100, 100], got ${value}`);
    }

    // Build stances for server message
    stances[dimensionKey] = { value, ...(description && { description }) };
  }

  return stances;
}
