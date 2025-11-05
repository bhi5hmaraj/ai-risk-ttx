import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

/**
 * Get Redis client singleton. Creates connection on first call.
 * TODO: Add retry logic
 * TODO: Add reconnection strategy
 * TODO: Add graceful shutdown
 */
export async function getRedis() {
  if (client?.isOpen) return client;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL not set');

  client = createClient({ url });
  await client.connect();
  console.log('[Redis] Connected');
  return client;
}

/**
 * Check if Redis is connected (for health checks)
 */
export function isRedisConnected(): boolean {
  return client?.isOpen ?? false;
}
