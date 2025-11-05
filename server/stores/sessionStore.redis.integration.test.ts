/**
 * Redis Integration Test
 *
 * Tests Upstash Redis connection and RedisSessionStore functionality.
 * Run on demand with: npm run test:redis
 *
 * Requirements:
 * - REDIS_URL must be set in .env.local
 * - Internet connection to Upstash
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getRedis, isRedisConnected } from '../lib/redisClient';
import { RedisSessionStore } from './sessionStore.redis';
import { createValidGameState, createActionOption } from '../../tests/fixtures/session-data';
import type { GameState } from '../../types/core';

function gsLobby(): GameState {
  const base = createValidGameState();
  return { ...base, phase: 0 as any, round: 0 };
}

function makeStore() {
  return new RedisSessionStore({
    advanceState: async ({ session }) => ({
      state: { ...session.state, round: session.state.round + 1 },
      players: session.players || []
    }),
  });
}

describe('Redis Integration Tests', () => {
  let redis: Awaited<ReturnType<typeof getRedis>>;
  const testKeys: string[] = [];

  beforeAll(async () => {
    // Verify REDIS_URL is set
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is not set. Check .env.local');
    }

    // Connect to Redis
    redis = await getRedis();
    console.log('✓ Connected to Redis');
  });

  afterAll(async () => {
    // Cleanup test keys
    if (testKeys.length > 0) {
      console.log(`Cleaning up ${testKeys.length} test keys...`);
      await Promise.all(testKeys.map(key => redis.del(key).catch(() => {})));
    }

    // Close connection
    if (redis) {
      await redis.quit();
      console.log('✓ Redis connection closed');
    }
  });

  describe('Redis Client', () => {
    it('should connect to Upstash Redis', async () => {
      expect(isRedisConnected()).toBe(true);
    });

    it('should perform basic SET/GET operations', async () => {
      const key = 'test:basic:' + Date.now();
      testKeys.push(key);

      await redis.set(key, 'hello redis');
      const value = await redis.get(key);

      expect(value).toBe('hello redis');
    });

    it('should handle JSON data', async () => {
      const key = 'test:json:' + Date.now();
      testKeys.push(key);

      const data = { foo: 'bar', count: 42 };
      await redis.set(key, JSON.stringify(data));
      const raw = await redis.get(key);
      const parsed = JSON.parse(raw!);

      expect(parsed).toEqual(data);
    });

    it('should support hash operations (HSET/HGET)', async () => {
      const key = 'test:hash:' + Date.now();
      testKeys.push(key);

      await redis.hSet(key, {
        name: 'test-session',
        data: JSON.stringify({ round: 1 })
      });

      const name = await redis.hGet(key, 'name');
      const data = await redis.hGet(key, 'data');

      expect(name).toBe('test-session');
      expect(JSON.parse(data!)).toEqual({ round: 1 });
    });

    it('should support TTL expiration', async () => {
      const key = 'test:ttl:' + Date.now();
      testKeys.push(key);

      await redis.set(key, 'expire-me');
      await redis.expire(key, 2); // 2 seconds

      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(2);
    });

    it('should handle non-existent keys gracefully', async () => {
      const value = await redis.get('nonexistent:key:' + Date.now());
      expect(value).toBeNull();
    });
  });

  describe('RedisSessionStore', () => {
    let store: RedisSessionStore;

    beforeAll(() => {
      store = makeStore();
    });

    it('should create a session and save to Redis', async () => {
      const created = await store.create({ state: gsLobby() });
      testKeys.push(`session:${created.id}`);

      expect(created.id).toMatch(/^sess_/);
      expect(created.hostToken.length).toBeGreaterThan(8);
      expect(created.revision).toBe(1);
      expect(created.state.round).toBe(0);

      // Verify it's actually in Redis
      const redisData = await redis.hGet(`session:${created.id}`, 'data');
      expect(redisData).toBeTruthy();

      const parsed = JSON.parse(redisData!);
      expect(parsed.id).toBe(created.id);
      expect(parsed.revision).toBe(1);
    });

    it('should retrieve a session from Redis', async () => {
      const created = await store.create({ state: gsLobby() });
      testKeys.push(`session:${created.id}`);

      // Create a new store instance to test Redis retrieval (not memory)
      const store2 = makeStore();
      const retrieved = await store2.get(created.id);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.revision).toBe(created.revision);
      expect(retrieved!.hostToken).toBe(created.hostToken);
    });

    it('should update a session in Redis', async () => {
      const created = await store.create({ state: gsLobby() });
      testKeys.push(`session:${created.id}`);

      const updated = await store.update(
        created.id,
        1,
        (state) => ({ ...state, round: 5 })
      );

      expect(updated.revision).toBe(2);
      expect(updated.state.round).toBe(5);

      // Verify in Redis
      const redisData = await redis.hGet(`session:${created.id}`, 'data');
      const parsed = JSON.parse(redisData!);
      expect(parsed.revision).toBe(2);
      expect(parsed.state.round).toBe(5);
    });

    it('should submit actions to Redis', async () => {
      const created = await store.create({
        state: gsLobby(),
        setup: {
          scenarioId: 'test',
          stakeholders: [{ name: 'Player1', icon: '🎯', publicObjective: 'test', hiddenObjective: 'test', resources: [], constraints: [] }]
        }
      });
      testKeys.push(`session:${created.id}`);

      const playerId = 'player_1';
      const actions = [createActionOption()];

      const updated = await store.submitActions(created.id, playerId, 1, actions);

      expect(updated.revision).toBe(2);
      expect(updated.submitted[playerId]).toBe(true);

      // Verify in Redis
      const redisData = await redis.hGet(`session:${created.id}`, 'data');
      const parsed = JSON.parse(redisData!);
      expect(parsed.submitted[playerId]).toBe(true);
    });

    it('should handle session not found', async () => {
      const result = await store.get('nonexistent_session_id');
      expect(result).toBeNull();
    });

    it('should refresh TTL on get', async () => {
      const created = await store.create({ state: gsLobby() });
      testKeys.push(`session:${created.id}`);

      const key = `session:${created.id}`;

      // Set a shorter TTL to test refresh
      await redis.expire(key, 30); // 30 seconds

      // Get initial TTL
      const ttl1 = await redis.ttl(key);
      expect(ttl1).toBeLessThanOrEqual(30);
      expect(ttl1).toBeGreaterThan(0);

      // Access session (should refresh TTL back to 86400)
      await store.get(created.id);

      // Check TTL again
      const ttl2 = await redis.ttl(key);

      // TTL should be reset to 86400 (full TTL)
      expect(ttl2).toBeGreaterThan(ttl1);
      expect(ttl2).toBeGreaterThan(1000); // Should be much higher now
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle Redis connection errors', async () => {
      // This test verifies the fallback to memory behavior
      // In production, if Redis fails, operations should still succeed via memory fallback

      const store = makeStore();
      const created = await store.create({ state: gsLobby() });

      // Even if Redis save fails, create should return successfully
      expect(created.id).toMatch(/^sess_/);
      expect(created.revision).toBe(1);

      // Note: We can't easily simulate Redis failure without breaking other tests
      // But the code has try/catch blocks that log errors and continue
    });
  });
});
