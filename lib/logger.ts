/**
 * Structured logging for Cloud Run
 *
 * Uses Google Cloud Logging format automatically detected by Cloud Run
 * Shows up in Cloud Console with proper severity levels and request correlation
 */

interface LogEntry {
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  component?: string;
  sessionId?: string;
  userId?: string;
  roomId?: string;
  duration?: number;
  [key: string]: any;
}

class Logger {
  constructor(private component: string = 'app') {}

  private log(entry: LogEntry) {
    // Cloud Run automatically parses this JSON format
    console.log(JSON.stringify({
      severity: entry.severity,
      message: entry.message,
      component: this.component,
      timestamp: new Date().toISOString(),
      ...entry,
    }));
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log({ severity: 'DEBUG', message, ...meta });
  }

  info(message: string, meta?: Record<string, any>) {
    this.log({ severity: 'INFO', message, ...meta });
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log({ severity: 'WARNING', message, ...meta });
  }

  error(message: string, error?: Error, meta?: Record<string, any>) {
    this.log({
      severity: 'ERROR',
      message,
      error: error?.message,
      stack: error?.stack,
      ...meta,
    });
  }
}

// Usage in GameRoom
export class GameRoom extends Room<GameState> {
  private logger = new Logger('GameRoom');

  async onCreate(options: any) {
    this.logger.info('Room created', {
      roomId: this.roomId,
      setup: options.setup?.scenarioTitle,
    });
  }

  async handleAdvanceRound(client: Client, message: any) {
    const startTime = Date.now();

    try {
      this.logger.info('Advancing round', {
        roomId: this.roomId,
        round: this.state.round,
        userId: client.sessionId,
      });

      // ... game logic ...

      const duration = Date.now() - startTime;
      this.logger.info('Round advanced', {
        roomId: this.roomId,
        round: this.state.round,
        duration,
      });
    } catch (err: any) {
      this.logger.error('Failed to advance round', err, {
        roomId: this.roomId,
        round: this.state.round,
      });
      throw err;
    }
  }
}

// Export for use throughout app
export const logger = new Logger();
export const gameLogger = new Logger('game');
export const aiLogger = new Logger('ai');
export const dbLogger = new Logger('database');
