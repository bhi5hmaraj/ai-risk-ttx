import { Redis } from '@upstash/redis';

/**
 * Singleton Redis client for session storage (Edge Runtime compatible)
 *
 * Environment variables required:
 * - REDIS_URL: Upstash Redis REST URL
 * - REDIS_TOKEN: Upstash Redis REST token
 *
 * Usage:
 *   const redis = await getRedis();
 *   await redis.set('key', 'value');
 */

let client: Redis | null = null;

/**
 * Get Redis client singleton. Creates client on first call.
 * Upstash uses REST API, so no persistent connection needed.
 */
export async function getRedis() {
  if (client) {
    return client;
  }

  // Support both Upstash standard names and custom names
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Redis environment variables required. Set either:\n' +
      '  - UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or\n' +
      '  - REDIS_URL and REDIS_TOKEN'
    );
  }

  console.log('[Redis] Creating Upstash client:', url.substring(0, 30) + '...');

  client = new Redis({
    url,
    token,
    // Enable automatic retries for transient failures
    retry: {
      retries: 3,
      backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 3000)
    }
  });

  console.log('[Redis] Upstash client created successfully (Edge Runtime compatible)');

  return client;
}

/**
 * Check if Redis client is initialized (for health checks)
 */
export function isRedisConnected(): boolean {
  return client !== null;
}
