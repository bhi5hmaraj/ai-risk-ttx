/**
 * Vitest setup file
 * Runs before all tests
 *
 * IMPORTANT: Environment variables must be set BEFORE imports
 */

// Set environment variables FIRST (before any imports)
process.env.LITELLM_API_KEY = 'test-api-key';
process.env.LITELLM_BASE_URL = 'https://test.example.com';
process.env.LLM_MODEL = 'test-model';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
