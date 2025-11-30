import { describe, it, expect } from 'vitest';
import { MapSchema } from '@colyseus/schema';
import { Player as SchemaPlayer } from '@/server/rooms/schema/GameState';
import { buildRosterFromStakeholders } from '@/server/rooms/adapters/stateAdapter';

describe('buildRosterFromStakeholders', () => {
  it('assigns humans by selected role and fills remaining with AI', () => {
    const stakeholders = [
      { name: 'Tech CEO', publicObjective: '', hiddenObjective: '', resources: [], constraints: [] },
      { name: 'Journalist', publicObjective: '', hiddenObjective: '', resources: [], constraints: [] },
    ];

    const schemaPlayers = new MapSchema<SchemaPlayer>();
    const human = new SchemaPlayer('sess1', { name: 'Alice', role: 'Tech CEO', isHuman: true });
    schemaPlayers.set('sess1', human);

    const roster = buildRosterFromStakeholders(stakeholders as any, schemaPlayers);

    expect(roster.length).toBe(2);
    const humanSeat = roster.find(p => p.isHuman);
    const aiSeat = roster.find(p => !p.isHuman);

    expect(humanSeat?.id).toBe('sess1');
    expect(humanSeat?.role.name).toBe('Tech CEO');
    expect(aiSeat?.id.startsWith('ai_')).toBe(true);
    expect(aiSeat?.role.name).toBe('Journalist');
  });
});

