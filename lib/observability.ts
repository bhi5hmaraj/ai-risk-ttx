/**
 * Observability utilities for tracking SSE connection health and metrics
 *
 * Supports multiple backends:
 * - Console (default)
 * - Axiom (serverless-first logging)
 * - Better Stack (Logtail)
 * - Highlight.io (session replay + logs)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SSEMetrics {
  sessionId: string;
  connectionId: string;
  state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  connectionStartTime: number;
  lastEventTime?: number;
  eventsReceived: number;
  heartbeatsReceived: number;
  reconnectionAttempts: number;
  disconnectionReason?: string;
  lastError?: string;
}

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  metrics?: Partial<SSEMetrics>;
}

class ObservabilityService {
  private enabled: boolean;
  private backend: 'console' | 'axiom' | 'logtail' | 'highlight';
  private apiKey?: string;
  private dataset?: string;

  constructor() {
    this.enabled = typeof window !== 'undefined';
    this.backend = (process.env.NEXT_PUBLIC_LOG_BACKEND as any) || 'console';
    this.apiKey = process.env.NEXT_PUBLIC_LOG_API_KEY;
    this.dataset = process.env.NEXT_PUBLIC_LOG_DATASET || 'simulacra-logs';
  }

  /**
   * Log an event with optional metrics
   */
  async log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!this.enabled) return;

    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    };

    // Console output (always)
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleMethod(`[${level.toUpperCase()}]`, message, context || '');

    // Send to external backend
    try {
      switch (this.backend) {
        case 'axiom':
          await this.sendToAxiom(event);
          break;
        case 'logtail':
          await this.sendToLogtail(event);
          break;
        case 'highlight':
          await this.sendToHighlight(event);
          break;
        default:
          // Console only
          break;
      }
    } catch (err) {
      console.error('[Observability] Failed to send log:', err);
    }
  }

  /**
   * Log SSE-specific metrics
   */
  async logSSE(level: LogLevel, message: string, metrics: Partial<SSEMetrics>) {
    const connectionDuration = metrics.connectionStartTime
      ? Math.floor((Date.now() - metrics.connectionStartTime) / 1000)
      : undefined;

    const lastEventAge = metrics.lastEventTime
      ? Math.floor((Date.now() - metrics.lastEventTime) / 1000)
      : undefined;

    await this.log(level, message, {
      ...metrics,
      connectionDurationSec: connectionDuration,
      lastEventAgeSec: lastEventAge,
      component: 'SSE',
    });
  }

  /**
   * Track SSE connection lifecycle event
   */
  async trackSSELifecycle(event: 'open' | 'close' | 'error' | 'reconnect', metrics: Partial<SSEMetrics>) {
    const level = event === 'error' ? 'error' : event === 'reconnect' ? 'warn' : 'info';
    const message = `SSE ${event}: ${metrics.sessionId || 'unknown'}`;

    await this.logSSE(level, message, metrics);
  }

  /**
   * Send to Axiom
   */
  private async sendToAxiom(event: LogEvent) {
    if (!this.apiKey) return;

    await fetch(`https://api.axiom.co/v1/datasets/${this.dataset}/ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        _time: event.timestamp,
        level: event.level,
        message: event.message,
        ...event.context,
        ...event.metrics,
      }]),
    });
  }

  /**
   * Send to Better Stack (Logtail)
   */
  private async sendToLogtail(event: LogEvent) {
    if (!this.apiKey) return;

    await fetch('https://in.logtail.com/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dt: event.timestamp,
        level: event.level,
        message: event.message,
        context: event.context,
        metrics: event.metrics,
      }),
    });
  }

  /**
   * Send to Highlight.io
   */
  private async sendToHighlight(event: LogEvent) {
    // Highlight.io uses their SDK, which we'd initialize in _app.tsx
    // This is a placeholder for SDK integration
    if (typeof (window as any).H !== 'undefined') {
      (window as any).H.consumeError(
        new Error(event.message),
        event.level,
        event.context
      );
    }
  }
}

// Singleton instance
export const observability = new ObservabilityService();

/**
 * SSE Metrics Tracker
 * Usage: const tracker = new SSEMetricsTracker(sessionId);
 */
export class SSEMetricsTracker {
  private metrics: SSEMetrics;
  private connectionId: string;

  constructor(sessionId: string) {
    this.connectionId = `${sessionId}-${Date.now()}`;
    this.metrics = {
      sessionId,
      connectionId: this.connectionId,
      state: 'connecting',
      connectionStartTime: Date.now(),
      eventsReceived: 0,
      heartbeatsReceived: 0,
      reconnectionAttempts: 0,
    };

    observability.trackSSELifecycle('open', this.metrics);
  }

  /**
   * Track state change
   */
  setState(state: SSEMetrics['state'], reason?: string) {
    const previousState = this.metrics.state;
    this.metrics.state = state;

    if (state === 'reconnecting') {
      this.metrics.reconnectionAttempts++;
      observability.trackSSELifecycle('reconnect', {
        ...this.metrics,
        disconnectionReason: reason,
      });
    } else if (state === 'error') {
      this.metrics.lastError = reason;
      observability.trackSSELifecycle('error', this.metrics);
    } else if (state === 'disconnected' && previousState !== 'disconnected') {
      this.metrics.disconnectionReason = reason;
      observability.trackSSELifecycle('close', this.metrics);
    }
  }

  /**
   * Track event received
   */
  trackEvent(eventType: string) {
    this.metrics.lastEventTime = Date.now();

    if (eventType === 'ping') {
      this.metrics.heartbeatsReceived++;
    } else {
      this.metrics.eventsReceived++;
    }

    if (this.metrics.state !== 'connected') {
      this.setState('connected');
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): SSEMetrics {
    return { ...this.metrics };
  }

  /**
   * Log periodic health check (call every minute)
   */
  logHealthCheck() {
    const lastEventAge = this.metrics.lastEventTime
      ? Date.now() - this.metrics.lastEventTime
      : undefined;

    // Warn if no events received in > 30 seconds
    if (lastEventAge && lastEventAge > 30000) {
      observability.logSSE('warn', 'SSE connection stale (no events > 30s)', this.metrics);
    } else {
      observability.logSSE('debug', 'SSE connection healthy', this.metrics);
    }
  }
}
