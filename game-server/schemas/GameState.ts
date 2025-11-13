import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

/**
 * Player in the game
 * Maps to your existing Player type
 */
export class Player extends Schema {
  @type('string') id: string = '';
  @type('string') roleName: string = '';
  @type('boolean') isHuman: boolean = false;
  @type('number') hiddenScore: number = 0;
  @type('number') actionPoints: number = 3;
  @type('boolean') hasSubmitted: boolean = false;
}

/**
 * Action option or selected action
 */
export class Action extends Schema {
  @type('string') title: string = '';
  @type('string') description: string = '';
  @type('number') cost: number = 1;
}

/**
 * Event log entry
 */
export class LogEntry extends Schema {
  @type('number') round: number = 0;
  @type('string') text: string = '';
  @type('number') timestamp: number = 0;
}

/**
 * Chat message
 */
export class Message extends Schema {
  @type('string') from: string = '';
  @type('string') text: string = '';
  @type('number') timestamp: number = 0;
}

/**
 * Main game state
 * This is automatically synchronized to all connected clients
 */
export class GameState extends Schema {
  @type('string') phase: string = 'LOBBY';
  @type('number') round: number = 0;
  @type('number') revision: number = 0;

  // Core metric (e.g., "Democratic Legitimacy")
  @type('string') coreMetricName: string = 'Democratic Legitimacy';
  @type('string') coreMetricDescription: string = '';
  @type('number') coreMetricValue: number = 50;

  // Players
  @type({ map: Player }) players = new MapSchema<Player>();

  // Event log (simplified for sync)
  @type([LogEntry]) eventLog = new ArraySchema<LogEntry>();

  // Chat messages
  @type([Message]) messages = new ArraySchema<Message>();

  // Submitted tracking
  @type({ map: 'boolean' }) submitted = new MapSchema<boolean>();

  // Game settings
  @type('number') maxRounds: number = 5;
  @type('number') actionPointsPerRound: number = 3;
}
