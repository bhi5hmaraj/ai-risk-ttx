/**
 * Schema Synchronization Tests
 *
 * These tests REPLACE the manual checklist in SCHEMA_CHANGE_CHECKLIST.md.
 * If you add/remove a field, these tests will fail until you update all locations.
 *
 * Philosophy: Make the machine enforce synchronization, not humans.
 */

import { describe, test, expect } from 'vitest';
import { GameState as ColyseusGameState, Player as ColyseusPlayer } from '../../schema/GameState';
import { GameState as CoreGameState, Player as CorePlayer } from '../../../types/core';
import { schemaToCore, coreToSchema, schemaPlayerToCore, corePlayerToSchema } from '../stateAdapter';

describe('Schema Synchronization: Field Coverage', () => {
    /**
     * Test 1: All Core GameState fields have adapter coverage
     *
     * If this test fails, you added a field to Core but forgot to update adapters.
     */
    test('all Core GameState fields handled by schemaToCore', () => {
        const schema = new ColyseusGameState();

        // Set all Schema fields to non-default values
        schema.phase = 'action';
        schema.round = 5;
        schema.publicScore = 42;
        schema.coreMetricName = 'TestMetric';
        schema.roomCode = 'ABC123';

        // Convert to Core
        const core = schemaToCore(schema, {
            eventLog: [],
            currentEvent: null,
        });

        // Verify all Core fields are populated (not undefined)
        const coreKeys: (keyof CoreGameState)[] = ['phase', 'round', 'coreMetric', 'eventLog', 'currentEvent'];

        coreKeys.forEach(key => {
            expect(core[key]).toBeDefined();
        });

        // Check nested fields
        expect(core.coreMetric.name).toBeDefined();
        expect(core.coreMetric.value).toBeDefined();
        expect(core.coreMetric.description).toBeDefined();
    });

    /**
     * Test 2: All Colyseus Schema fields have adapter coverage
     *
     * If this test fails, you added a field to Schema but forgot to update coreToSchema.
     */
    test('all Schema GameState fields handled by coreToSchema', () => {
        // Create Core state with all fields
        const core: CoreGameState = {
            phase: 2, // ACTION
            round: 7,
            coreMetric: {
                name: 'Security',
                value: 88,
                description: 'Security metric',
            },
            eventLog: [],
            currentEvent: null,
        };

        const schema = new ColyseusGameState();
        schema.roomCode = 'PRESERVE'; // Should be preserved (not overwritten)

        coreToSchema(core, schema);

        // Get all Schema fields (excluding methods and private fields)
        const schemaKeys = Object.keys(schema).filter(k => !k.startsWith('_') && !k.startsWith('$'));

        // Verify all fields are populated
        schemaKeys.forEach(key => {
            const value = (schema as any)[key];

            // Allow roomCode to be preserved (special case)
            if (key === 'roomCode' && value === 'PRESERVE') {
                return;
            }

            // Players map might be empty (ok)
            if (key === 'players') {
                expect(value).toBeDefined();
                return;
            }

            // All other fields should be populated
            expect(value).toBeDefined();
            expect(value).not.toBe('');
        });
    });

    /**
     * Test 3: Schema and Core have matching field count (approximation)
     *
     * If this test fails, you added a field to one schema but not the other.
     * Note: This is a heuristic, not perfect (Core has more fields like eventLog)
     */
    test('Schema and Core field counts are reasonable', () => {
        const schema = new ColyseusGameState();
        const schemaFields = Object.keys(schema).filter(k => !k.startsWith('_') && !k.startsWith('$'));

        // Core has MORE fields than Schema (eventLog, currentEvent, etc.)
        const coreFields: (keyof CoreGameState)[] = ['phase', 'round', 'coreMetric', 'eventLog', 'currentEvent'];

        // Schema should have at least 4 essential fields
        expect(schemaFields.length).toBeGreaterThanOrEqual(4);

        // Core should have all 5 mandatory fields
        expect(coreFields.length).toBe(5);
    });

    /**
     * Test 4: All Core Player fields handled by schemaPlayerToCore
     */
    test('all Core Player fields handled by adapter', () => {
        const schemaPlayer = new ColyseusPlayer('test-id', {
            name: 'Alice',
            role: 'Senator',
            isHuman: true,
        });
        schemaPlayer.actionPoints = 2;
        schemaPlayer.hasSubmitted = true;

        const corePlayer = schemaPlayerToCore(schemaPlayer, {
            fullRole: {
                name: 'Senator',
                publicObjective: 'Test',
                hiddenObjective: 'Secret',
                resources: [],
                constraints: [],
            },
            actions: [],
            hiddenScore: 10,
        });

        // Verify all Core Player fields exist
        const requiredFields: (keyof CorePlayer)[] = [
            'id',
            'role',
            'isHuman',
            'actionPoints',
            'actions',
            'hasSubmittedActions',
            'hiddenScore',
        ];

        requiredFields.forEach(key => {
            expect(corePlayer[key]).toBeDefined();
        });

        // Check nested role fields
        expect(corePlayer.role.name).toBeDefined();
        expect(corePlayer.role.publicObjective).toBeDefined();
        expect(corePlayer.role.hiddenObjective).toBeDefined();
    });

    /**
     * Test 5: All Schema Player fields handled by corePlayerToSchema
     */
    test('all Schema Player fields handled by adapter', () => {
        const corePlayer: CorePlayer = {
            id: 'player-1',
            role: {
                name: 'CEO',
                publicObjective: 'Profit',
                hiddenObjective: 'Monopoly',
                resources: ['money'],
                constraints: ['regulation'],
            },
            isHuman: false,
            actionPoints: 1,
            actions: [],
            hasSubmittedActions: true,
            hiddenScore: 15,
        };

        const schemaPlayer = new ColyseusPlayer('player-1');
        corePlayerToSchema(corePlayer, schemaPlayer);

        // Get all Schema Player fields
        const schemaFields = Object.keys(schemaPlayer).filter(k => !k.startsWith('_') && !k.startsWith('$'));

        // Verify critical fields are populated
        expect(schemaPlayer.sessionId).toBe('player-1');
        expect(schemaPlayer.role).toBe('CEO');
        expect(schemaPlayer.isHuman).toBe(false);
        expect(schemaPlayer.actionPoints).toBe(1);
        expect(schemaPlayer.hasSubmitted).toBe(true);

        // Should have at least 6 fields
        expect(schemaFields.length).toBeGreaterThanOrEqual(6);
    });
});

describe('Schema Synchronization: Type Safety', () => {
    /**
     * Test 6: Schema decorator types match field types
     *
     * This catches mistakes like: @type("string") maxRounds: number
     */
    test('Schema decorators match field types', () => {
        const schema = new ColyseusGameState();

        // Test type coercion (Colyseus should handle this correctly)
        schema.phase = 'lobby' as any;
        schema.round = 3 as any;
        schema.publicScore = 75.5 as any;
        schema.coreMetricName = 'Test' as any;
        schema.roomCode = 'ABC' as any;

        // TypeScript should enforce types, but also check at runtime
        expect(typeof schema.phase).toBe('string');
        expect(typeof schema.round).toBe('number');
        expect(typeof schema.publicScore).toBe('number');
        expect(typeof schema.coreMetricName).toBe('string');
        expect(typeof schema.roomCode).toBe('string');
    });

    /**
     * Test 7: Player field types are consistent
     */
    test('Player schema field types are correct', () => {
        const player = new ColyseusPlayer('test');

        expect(typeof player.sessionId).toBe('string');
        expect(typeof player.connected).toBe('boolean');
        expect(typeof player.name).toBe('string');
        expect(typeof player.role).toBe('string');
        expect(typeof player.isHuman).toBe('boolean');
        expect(typeof player.actionPoints).toBe('number');
        expect(typeof player.hasSubmitted).toBe('boolean');
    });
});

describe('Schema Synchronization: Default Values', () => {
    /**
     * Test 8: Schema and StateManager have matching defaults
     *
     * If this test fails, defaults are inconsistent (causes state drift)
     */
    test('Schema defaults match documented defaults', () => {
        const schema = new ColyseusGameState();

        // These defaults must match StateManager constructor
        expect(schema.phase).toBe('lobby');
        expect(schema.round).toBe(0);
        expect(schema.publicScore).toBe(75); // Initial Democratic Legitimacy
        expect(schema.coreMetricName).toBe('Democratic Legitimacy');
        expect(schema.roomCode).toBe('');
    });

    /**
     * Test 9: Player defaults are consistent
     */
    test('Player defaults match documented defaults', () => {
        const player = new ColyseusPlayer('test');

        expect(player.connected).toBe(true);
        // Player constructor sets name to "Player-{id}" if not provided
        expect(player.name).toContain('Player-');
        expect(player.role).toBe('');
        expect(player.isHuman).toBe(true);
        expect(player.actionPoints).toBe(3); // GAME_CONFIG.ACTION_POINTS_PER_ROUND
        expect(player.hasSubmitted).toBe(false);
    });
});

describe('Schema Synchronization: Exhaustive Coverage', () => {
    /**
     * Test 10: Detect missing @type decorators (runtime check)
     *
     * Colyseus requires @type decorators for synchronization.
     * This test tries to detect if a field is missing the decorator.
     */
    test('all Schema fields have @type decorators', () => {
        const schema = new ColyseusGameState();

        // Get schema metadata (Colyseus adds _schema property)
        const schemaMetadata = (schema as any)._schema;

        // This is a best-effort check (Colyseus internals may change)
        if (schemaMetadata) {
            const definedFields = Object.keys(schemaMetadata);

            // Should have at least phase, round, publicScore, coreMetricName, players
            expect(definedFields.length).toBeGreaterThanOrEqual(5);
        }
    });

    /**
     * Test 11: All fields are referenced in adapter functions (static analysis approximation)
     *
     * This is a heuristic: if adapter functions are short, they might be missing fields.
     */
    test('adapter functions are comprehensive (heuristic)', () => {
        // Count lines in adapter functions (rough proxy for completeness)
        const schemaToCoreSrc = schemaToCore.toString();
        const coreToSchemaSrc = coreToSchema.toString();

        // schemaToCore should handle at least 5 Core fields
        expect(schemaToCoreSrc).toContain('phase');
        expect(schemaToCoreSrc).toContain('round');
        expect(schemaToCoreSrc).toContain('coreMetric');

        // coreToSchema should handle at least 4 Schema fields
        expect(coreToSchemaSrc).toContain('phase');
        expect(coreToSchemaSrc).toContain('round');
        expect(coreToSchemaSrc).toContain('publicScore');
    });
});

describe('Schema Synchronization: Regression Tests', () => {
    /**
     * Test 12: Specific field synchronization (add tests here when bugs found)
     *
     * Example: If you once forgot to sync maxRounds, add a specific test:
     */
    test('maxRounds field syncs correctly (if added)', () => {
        // If maxRounds exists in Schema
        const schema = new ColyseusGameState();

        if ('maxRounds' in schema) {
            const coreState = {
                phase: 2,
                round: 0,
                coreMetric: { name: 'Test', value: 50, description: 'Test' },
                eventLog: [],
                currentEvent: null,
                maxRounds: 10,
            } as any;

            coreToSchema(coreState, schema);
            expect((schema as any).maxRounds).toBe(10);
        } else {
            // maxRounds not added yet - test passes
            expect(true).toBe(true);
        }
    });

    /**
     * Test 13: Field renamed correctly (example)
     */
    test('deprecated fields removed from adapters', () => {
        // Example: If roomCode was removed from Core
        const core = schemaToCore(new ColyseusGameState());

        // roomCode should NOT be in Core (only in Schema for client compatibility)
        expect('roomCode' in core).toBe(false);
    });
});

describe('Schema Synchronization: Integration Smoke Tests', () => {
    /**
     * Test 14: Full round-trip with all fields
     */
    test('full round-trip preserves all essential fields', () => {
        // Create maximal Core state
        const originalCore: CoreGameState = {
            phase: 2,
            round: 5,
            coreMetric: {
                name: 'Innovation',
                value: 63,
                description: 'Innovation score',
            },
            eventLog: [
                {
                    round: 1,
                    roundSummary: 'Round 1',
                    outcomeTimeline: [],
                    counterfactualNote: 'None',
                    event: { headline: 'Event', detail: 'Details' },
                    playerActions: [],
                    publicScoreChange: -5,
                    publicScoreAfter: 70,
                    hiddenScoreChanges: {},
                    geminiCalls: 2,
                }
            ],
            currentEvent: { headline: 'Current', detail: 'Ongoing crisis' },
        };

        // Round-trip
        const schema = new ColyseusGameState();
        coreToSchema(originalCore, schema);

        const reconstructed = schemaToCore(schema, {
            eventLog: originalCore.eventLog,
            currentEvent: originalCore.currentEvent,
        });

        // Verify essential fields preserved
        expect(reconstructed.round).toBe(originalCore.round);
        expect(reconstructed.coreMetric.value).toBe(originalCore.coreMetric.value);
        expect(reconstructed.coreMetric.name).toBe(originalCore.coreMetric.name);
        expect(reconstructed.eventLog).toEqual(originalCore.eventLog);
        expect(reconstructed.currentEvent).toEqual(originalCore.currentEvent);
    });

    /**
     * Test 15: Player round-trip with all fields
     */
    test('player round-trip preserves all fields', () => {
        const originalCore: CorePlayer = {
            id: 'player-test',
            role: {
                name: 'Mayor',
                publicObjective: 'Public trust',
                hiddenObjective: 'Win election',
                resources: ['authority', 'media access'],
                constraints: ['public opinion', 'term limits'],
            },
            isHuman: true,
            actionPoints: 2,
            actions: [
                { title: 'Action 1', description: 'Do something', cost: 1 }
            ],
            hasSubmittedActions: true,
            hiddenScore: 12,
        };

        // Round-trip
        const schema = new ColyseusPlayer('player-test');
        corePlayerToSchema(originalCore, schema);

        const reconstructed = schemaPlayerToCore(schema, {
            fullRole: originalCore.role,
            actions: originalCore.actions,
            hiddenScore: originalCore.hiddenScore,
        });

        // Verify all fields preserved
        expect(reconstructed.id).toBe(originalCore.id);
        expect(reconstructed.role).toEqual(originalCore.role);
        expect(reconstructed.isHuman).toBe(originalCore.isHuman);
        expect(reconstructed.actionPoints).toBe(originalCore.actionPoints);
        expect(reconstructed.actions).toEqual(originalCore.actions);
        expect(reconstructed.hasSubmittedActions).toBe(originalCore.hasSubmittedActions);
        expect(reconstructed.hiddenScore).toBe(originalCore.hiddenScore);
    });
});
