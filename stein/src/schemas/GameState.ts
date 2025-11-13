import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

export class Player extends Schema {
  @type('string') id: string = '';
  @type('string') roleName: string = '';
  @type('boolean') isHuman: boolean = false;
  @type('boolean') hasSubmitted: boolean = false;
  @type('number') hiddenScore: number = 0;
  @type('number') actionPoints: number = 0;
}

export class Message extends Schema {
  @type('string') from: string = '';
  @type(['string']) to: string[] = [];
  @type('string') body: string = '';
  @type('number') timestamp: number = 0;
}

export class GameState extends Schema {
  @type('string') phase: string = 'LOBBY';
  @type('number') round: number = 0;
  @type('number') revision: number = 0;

  @type('string') coreMetricName: string = '';
  @type('number') coreMetricValue: number = 0;

  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Message]) messages = new ArraySchema<Message>();

  // Submitted tracking
  @type({ map: 'boolean' }) submitted = new MapSchema<boolean>();
}
