/**
 * Colyseus metrics instrumentation
 *
 * Tracks game-specific metrics for monitoring and alerting
 * Exports to Cloud Run metrics (shows up in Cloud Console)
 */

import { Room } from '@colyseus/core';

interface Metrics {
  // Connection metrics
  activeConnections: number;
  totalConnections: number;
  reconnections: number;
  disconnections: number;

  // Game metrics
  activeRooms: number;
  totalRooms: number;
  averagePlayersPerRoom: number;

  // Performance metrics
  averageRoundDuration: number;
  aiCallDuration: number;
  stateUpdateSize: number;

  // Error metrics
  errors: number;
  llmFailures: number;
  connectionFailures: number;
}

class MetricsCollector {
  private metrics: Metrics = {
    activeConnections: 0,
    totalConnections: 0,
    reconnections: 0,
    disconnections: 0,
    activeRooms: 0,
    totalRooms: 0,
    averagePlayersPerRoom: 0,
    averageRoundDuration: 0,
    aiCallDuration: 0,
    stateUpdateSize: 0,
    errors: 0,
    llmFailures: 0,
    connectionFailures: 0,
  };

  // Track connection events
  onConnection() {
    this.metrics.activeConnections++;
    this.metrics.totalConnections++;
  }

  onDisconnection() {
    this.metrics.activeConnections--;
    this.metrics.disconnections++;
  }

  onReconnection() {
    this.metrics.reconnections++;
  }

  // Track room events
  onRoomCreated() {
    this.metrics.activeRooms++;
    this.metrics.totalRooms++;
  }

  onRoomDisposed() {
    this.metrics.activeRooms--;
  }

  // Track performance
  recordRoundDuration(duration: number) {
    // Exponential moving average
    this.metrics.averageRoundDuration =
      this.metrics.averageRoundDuration * 0.9 + duration * 0.1;
  }

  recordAICallDuration(duration: number) {
    this.metrics.aiCallDuration =
      this.metrics.aiCallDuration * 0.9 + duration * 0.1;
  }

  recordStateUpdateSize(bytes: number) {
    this.metrics.stateUpdateSize =
      this.metrics.stateUpdateSize * 0.9 + bytes * 0.1;
  }

  // Track errors
  recordError(type: 'general' | 'llm' | 'connection') {
    this.metrics.errors++;
    if (type === 'llm') this.metrics.llmFailures++;
    if (type === 'connection') this.metrics.connectionFailures++;
  }

  // Get current metrics
  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  // Export to Cloud Run metrics (structured log)
  exportMetrics() {
    console.log(JSON.stringify({
      severity: 'INFO',
      message: 'Colyseus metrics',
      metrics: this.metrics,
      timestamp: new Date().toISOString(),
    }));
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

// Export metrics every 60 seconds
if (process.env.NODE_ENV === 'production') {
  setInterval(() => metrics.exportMetrics(), 60000);
}

/**
 * Colyseus Room instrumentation wrapper
 * Add this to your GameRoom to automatically track metrics
 */
export function instrumentRoom<T>(RoomClass: any) {
  const originalOnCreate = RoomClass.prototype.onCreate;
  const originalOnJoin = RoomClass.prototype.onJoin;
  const originalOnLeave = RoomClass.prototype.onLeave;
  const originalOnDispose = RoomClass.prototype.onDispose;

  RoomClass.prototype.onCreate = async function (...args: any[]) {
    metrics.onRoomCreated();
    return originalOnCreate.apply(this, args);
  };

  RoomClass.prototype.onJoin = async function (client: any, ...args: any[]) {
    metrics.onConnection();
    return originalOnJoin.apply(this, [client, ...args]);
  };

  RoomClass.prototype.onLeave = async function (client: any, ...args: any[]) {
    metrics.onDisconnection();
    return originalOnLeave.apply(this, [client, ...args]);
  };

  RoomClass.prototype.onDispose = async function (...args: any[]) {
    metrics.onRoomDisposed();
    return originalOnDispose.apply(this, args);
  };

  return RoomClass;
}

/**
 * Usage in GameRoom:
 *
 * import { instrumentRoom, metrics } from '../lib/metrics';
 *
 * @instrumentRoom
 * export class GameRoom extends Room<GameState> {
 *   async handleAdvanceRound(...) {
 *     const start = Date.now();
 *     // ... game logic ...
 *     metrics.recordRoundDuration(Date.now() - start);
 *   }
 * }
 */
