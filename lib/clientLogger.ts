/**
 * Client-side logger that sends logs to server for persistent storage
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  url: string;
}

/**
 * Truncate large objects to prevent log pollution
 * - Limits object depth to 3 levels
 * - Limits arrays to first 5 items
 * - Limits strings to 500 characters
 */
function truncateData(data: any, depth = 0, maxDepth = 3): any {
  const MAX_STRING_LENGTH = 500;
  const MAX_ARRAY_ITEMS = 5;

  if (data === null || data === undefined) return data;

  // Limit depth
  if (depth >= maxDepth) {
    return '[MAX_DEPTH_REACHED]';
  }

  // Handle primitives
  if (typeof data === 'string') {
    if (data.length > MAX_STRING_LENGTH) {
      return data.slice(0, MAX_STRING_LENGTH) + `... [truncated ${data.length - MAX_STRING_LENGTH} chars]`;
    }
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length > MAX_ARRAY_ITEMS) {
      return [
        ...data.slice(0, MAX_ARRAY_ITEMS).map(item => truncateData(item, depth + 1, maxDepth)),
        `[...${data.length - MAX_ARRAY_ITEMS} more items]`
      ];
    }
    return data.map(item => truncateData(item, depth + 1, maxDepth));
  }

  // Handle objects
  if (typeof data === 'object') {
    const truncated: any = {};
    let keyCount = 0;
    const maxKeys = 20; // Limit object keys

    for (const [key, value] of Object.entries(data)) {
      if (keyCount >= maxKeys) {
        truncated['...'] = `[${Object.keys(data).length - maxKeys} more keys]`;
        break;
      }
      truncated[key] = truncateData(value, depth + 1, maxDepth);
      keyCount++;
    }
    return truncated;
  }

  return data;
}

class ClientLogger {
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 10;
  private readonly FLUSH_INTERVAL = 2000; // 2 seconds
  private enabled = true;

  constructor() {
    // Only enable in development or if LOG_TO_FILE is set
    this.enabled = process.env.NODE_ENV === 'development' ||
                   process.env.NEXT_PUBLIC_LOG_TO_FILE === 'true';

    if (this.enabled && typeof window !== 'undefined') {
      this.startFlushInterval();

      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.FLUSH_INTERVAL);
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      });
    } catch (err) {
      // Silent fail - don't want logging to break the app
      console.error('[ClientLogger] Failed to send logs:', err);
    }
  }

  private log(level: LogLevel, message: string, data?: any) {
    if (!this.enabled) {
      // Fallback to console
      console[level](message, data);
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      data: data ? truncateData(data) : undefined,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    this.buffer.push(entry);

    // Also log to console (use original data for better dev experience)
    console[level](message, data);

    // Flush if buffer is full
    if (this.buffer.length >= this.BUFFER_SIZE) {
      this.flush();
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }
}

// Export singleton instance
export const logger = new ClientLogger();
