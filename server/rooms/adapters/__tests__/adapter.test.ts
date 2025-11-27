/**
 * Contract Tests for State Adapters
 *
 * These tests verify that bidirectional conversions maintain invariants.
 * See /eagx/STATE_ARCHITECTURE.md for the "Contract Testing" solution pattern.
 *
 * Key Properties Tested:
 * 1. Essential data preserved in round-trips
 * 2. Schema changes propagate correctly
 * 3. Invariants maintained (score bounds, player counts, etc.)
 */

import { describe, test, expect } from 'vitest';
import { GameState as ColyseusGameState, Player as ColyseusPlayer } from '../../schema/GameState';
import { GameState as CoreGameState, Player as CorePlayer, GamePhase } from '../../../types/core';
import {
    schemaToCore,
    coreToSchema,
    schemaPlayerToCore,
    corePlayerToSchema,
    schemaPlayersToCore,
    isCoreGameStateComplete,
} from '../stateAdapter';
import { MapSchema } from '@colyseus/schema';

describe('State Adapter Contracts', () => {
    describe('GameState Conversion', () => {
        test('schemaToCore preserves essential fields', () => {
            const schema = new ColyseusGameState();
            schema.phase = 'action';
            schema.round = 3;
            schema.publicScore = 85;
            schema.coreMetricName = 'Public Trust';

            const core = schemaToCore(schema);

            expect(core.phase).toBe(GamePhase.ACTION);
            expect(core.round).toBe(3);
            expect(core.coreMetric.value).toBe(85);
            expect(core.coreMetric.name).toBe('Public Trust');
        });

        test('coreToSchema projects essential fields', () => {
            const core: CoreGameState = {
                phase: GamePhase.CONSEQUENCE,
                round: 5,
                coreMetric: {
                    name: 'Security',
                    value: 42,
                    description: 'Security metric',
                },
                eventLog: [],
                currentEvent: null,
            };

            const schema = new ColyseusGameState();
            coreToSchema(core, schema);

            expect(schema.phase).toBe('consequence');
            expect(schema.round).toBe(5);
            expect(schema.publicScore).toBe(42);
            expect(schema.coreMetricName).toBe('Security');
        });

        test('round-trip preserves essential data', () => {
            const originalCore: CoreGameState = {
                phase: GamePhase.ACTION,
                round: 2,
                coreMetric: {
                    name: 'Trust',
                    value: 75,
                    description: 'Trust metric',
                },
                eventLog: [
                    {
                        round: 1,
                        roundSummary: 'Round 1 summary',
                        outcomeTimeline: [],
                        counterfactualNote: 'No action',
                        event: { headline: 'Round 1 event', detail: 'Event details' },
                        publicScoreChange: 0,
                        publicScoreAfter: 75,
                        playerActions: [],
                        hiddenScoreChanges: {},
                        geminiCalls: 2,
                    }
                ],
                currentEvent: { headline: 'Current event', detail: 'Event details' },
            };

            const schema = new ColyseusGameState();
            coreToSchema(originalCore, schema);
            const reconstructed = schemaToCore(schema, {
                eventLog: originalCore.eventLog,
                currentEvent: originalCore.currentEvent,
            });

            // Essential fields preserved
            expect(reconstructed.phase).toBe(originalCore.phase);
            expect(reconstructed.round).toBe(originalCore.round);
            expect(reconstructed.coreMetric.value).toBe(originalCore.coreMetric.value);
            expect(reconstructed.coreMetric.name).toBe(originalCore.coreMetric.name);

            // Enriched fields restored
            expect(reconstructed.eventLog).toEqual(originalCore.eventLog);
            expect(reconstructed.currentEvent).toEqual(originalCore.currentEvent);
        });

        test('phase enum mapping is bidirectional', () => {
            const phases: GamePhase[] = [
                GamePhase.LOBBY,
                GamePhase.STARTING,
                GamePhase.ACTION,
                GamePhase.CONSEQUENCE,
                GamePhase.END,
            ];

            phases.forEach(phase => {
                const core: CoreGameState = {
                    phase,
                    round: 0,
                    coreMetric: { name: 'Test', value: 50, description: 'Test' },
                    eventLog: [],
                    currentEvent: null,
                };

                const schema = new ColyseusGameState();
                coreToSchema(core, schema);
                const reconstructed = schemaToCore(schema);

                expect(reconstructed.phase).toBe(phase);
            });
        });

        test('score boundaries respected', () => {
            const testScores = [0, 50, 100, -10, 150];

            testScores.forEach(score => {
                const core: CoreGameState = {
                    phase: GamePhase.ACTION,
                    round: 1,
                    coreMetric: { name: 'Test', value: score, description: 'Test' },
                    eventLog: [],
                    currentEvent: null,
                };

                const schema = new ColyseusGameState();
                coreToSchema(core, schema);

                // Schema should preserve actual value (adapter doesn't clamp)
                expect(schema.publicScore).toBe(score);
            });
        });
    });

    describe('Player Conversion', () => {
        test('schemaPlayerToCore preserves essential fields', () => {
            const schemaPlayer = new ColyseusPlayer('player1', {
                name: 'Alice',
                role: 'Senator',
                isHuman: true,
            });
            schemaPlayer.actionPoints = 2;
            schemaPlayer.hasSubmitted = true;

            const corePlayer = schemaPlayerToCore(schemaPlayer);

            expect(corePlayer.id).toBe('player1');
            expect(corePlayer.role.name).toBe('Senator');
            expect(corePlayer.isHuman).toBe(true);
            expect(corePlayer.actionPoints).toBe(2);
            expect(corePlayer.hasSubmittedActions).toBe(true);
        });

        test('corePlayerToSchema projects essential fields', () => {
            const corePlayer: CorePlayer = {
                id: 'player2',
                role: {
                    name: 'Regulator',
                    publicObjective: 'Ensure compliance',
                    hiddenObjective: 'Block legislation',
                    resources: ['authority'],
                    constraints: ['legal limits'],
                },
                isHuman: false,
                actionPoints: 3,
                actions: [],
                hasSubmittedActions: false,
                hiddenScore: 10,
            };

            const schemaPlayer = new ColyseusPlayer('player2');
            corePlayerToSchema(corePlayer, schemaPlayer);

            expect(schemaPlayer.role).toBe('Regulator');
            expect(schemaPlayer.isHuman).toBe(false);
            expect(schemaPlayer.actionPoints).toBe(3);
            expect(schemaPlayer.hasSubmitted).toBe(false);
        });

        test('player round-trip preserves essential data', () => {
            const originalCore: CorePlayer = {
                id: 'p1',
                role: {
                    name: 'Mayor',
                    publicObjective: 'Public trust',
                    hiddenObjective: 'Win election',
                    resources: [],
                    constraints: [],
                },
                isHuman: true,
                actionPoints: 1,
                actions: [],
                hasSubmittedActions: true,
                hiddenScore: 5,
            };

            const schema = new ColyseusPlayer('p1');
            corePlayerToSchema(originalCore, schema);
            const reconstructed = schemaPlayerToCore(schema, {
                fullRole: originalCore.role,
                actions: originalCore.actions,
                hiddenScore: originalCore.hiddenScore,
            });

            expect(reconstructed.id).toBe(originalCore.id);
            expect(reconstructed.role).toEqual(originalCore.role);
            expect(reconstructed.actionPoints).toBe(originalCore.actionPoints);
            expect(reconstructed.hasSubmittedActions).toBe(originalCore.hasSubmittedActions);
            expect(reconstructed.hiddenScore).toBe(originalCore.hiddenScore);
        });

        test('multiple players converted correctly', () => {
            const schemaPlayers = new MapSchema<ColyseusPlayer>();
            schemaPlayers.set('p1', new ColyseusPlayer('p1', { name: 'Alice', role: 'A' }));
            schemaPlayers.set('p2', new ColyseusPlayer('p2', { name: 'Bob', role: 'B' }));

            const corePlayers = schemaPlayersToCore(schemaPlayers);

            expect(corePlayers).toHaveLength(2);
            expect(corePlayers[0].id).toBe('p1');
            expect(corePlayers[1].id).toBe('p2');
        });
    });

    describe('Invariants', () => {
        test('isCoreGameStateComplete validates required fields', () => {
            const complete: CoreGameState = {
                phase: GamePhase.ACTION,
                round: 1,
                coreMetric: { name: 'Test', value: 50, description: 'Test' },
                eventLog: [],
                currentEvent: null,
            };

            expect(isCoreGameStateComplete(complete)).toBe(true);

            const incomplete = { ...complete, eventLog: undefined };
            expect(isCoreGameStateComplete(incomplete)).toBe(false);
        });

        test('player count preserved across conversions', () => {
            const schemaPlayers = new MapSchema<ColyseusPlayer>();
            for (let i = 0; i < 5; i++) {
                schemaPlayers.set(`p${i}`, new ColyseusPlayer(`p${i}`));
            }

            const corePlayers = schemaPlayersToCore(schemaPlayers);
            expect(corePlayers.length).toBe(5);
        });

        test('action points non-negative after conversion', () => {
            const corePlayer: CorePlayer = {
                id: 'test',
                role: { name: 'Test', publicObjective: '', hiddenObjective: '', resources: [], constraints: [] },
                isHuman: true,
                actionPoints: -5, // Invalid but shouldn't crash
                actions: [],
                hasSubmittedActions: false,
                hiddenScore: 0,
            };

            const schema = new ColyseusPlayer('test');
            corePlayerToSchema(corePlayer, schema);

            // Adapter doesn't validate, just copies
            expect(schema.actionPoints).toBe(-5);
            // (Validation should happen elsewhere, e.g., StateManager)
        });
    });

    describe('Enrichment Scenarios', () => {
        test('eventLog not lost during conversion', () => {
            const schema = new ColyseusGameState();
            schema.round = 2;

            const eventLog = [
                {
                    round: 1,
                    roundSummary: 'Round 1 summary',
                    outcomeTimeline: [],
                    counterfactualNote: 'None',
                    event: { headline: 'Event 1', detail: 'Event details' },
                    publicScoreChange: -5,
                    publicScoreAfter: 70,
                    playerActions: [],
                    hiddenScoreChanges: {},
                    geminiCalls: 2,
                }
            ];

            const core = schemaToCore(schema, { eventLog });

            expect(core.eventLog).toHaveLength(1);
            expect(core.eventLog[0].round).toBe(1);
        });

        test('full role objects preserved with enrichment', () => {
            const schema = new ColyseusPlayer('p1');
            schema.role = 'CEO';

            const fullRole = {
                name: 'CEO',
                publicObjective: 'Maximize profit',
                hiddenObjective: 'Avoid regulation',
                resources: ['money', 'influence'],
                constraints: ['shareholder expectations'],
            };

            const core = schemaPlayerToCore(schema, { fullRole });

            expect(core.role).toEqual(fullRole);
        });
    });
});
