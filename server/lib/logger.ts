/**
 * Pino-based logger with per-request correlation IDs and Sentry integration.
 */

import pino from 'pino';
import type { Logger as PinoLogger } from 'pino';

// Import Sentry if available (optional, won't crash if not installed)
let Sentry: any;
try {
  Sentry = require('../instrument');
} catch {
  // Sentry not configured, logging will work without it
  Sentry = null;
}

type LogFields = Record<string, unknown> | undefined;

// Pretty/verbosity controls via env
const ENV = {
  PRETTY: process.env.LOG_PRETTY === 'true',
  VERBOSE_JSON: process.env.LOG_VERBOSE_JSON === 'true',
  MAX_STRING: Number(process.env.LOG_MAX_STRING || 500),
  MAX_ARRAY: Number(process.env.LOG_MAX_ARRAY_ITEMS || 5),
  MAX_KEYS: Number(process.env.LOG_MAX_KEYS || 20),
  MAX_DEPTH: Number(process.env.LOG_MAX_DEPTH || 3),
};

/**
 * Truncate large objects to prevent log pollution
 * - Limits object depth to 3 levels
 * - Limits arrays to first 5 items
 * - Limits strings to 500 characters
 */
function truncateData(data: any, depth = 0, maxDepth = ENV.MAX_DEPTH): any {
  if (ENV.VERBOSE_JSON) return data; // do not truncate in verbose mode
  const MAX_STRING_LENGTH = ENV.MAX_STRING;
  const MAX_ARRAY_ITEMS = ENV.MAX_ARRAY;

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
    const maxKeys = ENV.MAX_KEYS; // Limit object keys

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

export function createReqId(seed?: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return (seed ? String(seed) + '-' : '') + ts + '-' + rand;
}

export function getReqIdFromHeaders(headers: Headers | Record<string, string | undefined>) {
  try {
    if (headers instanceof Headers) {
      return headers.get('x-req-id') || headers.get('x-request-id') || undefined;
    }
    const h = headers as Record<string, string | undefined>;
    return h['x-req-id'] || h['x-request-id'] || undefined;
  } catch {
    return undefined;
  }
}

// Create base Pino logger instance
const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');
const logToFile = process.env.LOG_TO_FILE === 'true';

// Standardized base labels for log aggregation (Loki/Grafana)
const baseLabels = {
  service: 'colyseus-server',
  env: process.env.NODE_ENV || 'development',
};

// Configure Pino with optional file logging
let basePino: PinoLogger;

if (logToFile && typeof process !== 'undefined') {
  // Write to both file and console in development
  const logTag = process.env.LOG_TAG || new Date().toISOString().split('T')[0];
  const logFile = `/tmp/server-logs-${logTag}.log`;

  const fileDestination = pino.destination({
    dest: logFile,
    sync: true, // Sync for immediate writes (better for debugging)
  });

  // Pretty to stdout (color), JSON to file
  let prettyStream: any = pino.destination(1);
  if (isDev || ENV.PRETTY) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pretty = require('pino-pretty')({
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    });
    prettyStream = pretty;
  }

  basePino = pino(
    { level: logLevel, base: baseLabels },
    pino.multistream([
      { stream: fileDestination }, // JSON file (for Promtail/Loki)
      { stream: prettyStream },    // colored human-readable to terminal
    ]),
  );

  console.log(`[Logger] Writing server logs to: ${logFile}`);
} else if (isDev || ENV.PRETTY) {
  // Pretty printing for console only — use destination stream to avoid worker-based transport
  // which can crash in serverless/Next API routes.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pretty = require('pino-pretty')({
    colorize: true,
    translateTime: 'HH:MM:ss',
    ignore: 'pid,hostname',
  });
  basePino = pino({ level: logLevel, base: baseLabels }, pretty);
} else {
  // Production: JSON logs to stdout (for Promtail → Loki → Grafana)
  basePino = pino({
    level: logLevel,
    base: baseLabels, // Include service and env in all logs
  });
}

/**
 * Enhanced structured logger with trace correlation and Loki labels
 *
 * Standard labels for log aggregation (Promtail → Loki → Grafana):
 * - service: 'colyseus-server' (base label, always present)
 * - env: 'development' | 'production' (base label, always present)
 * - gameId: Shareable room code like "ZYM489" (when available in fields)
 * - roomId: Colyseus internal room ID (when available in fields)
 * - phase: 'lobby' | 'action' | 'consequence' | 'end' (when available in fields)
 * - round: Current round number (when available in fields)
 * - rid: Request ID for tracing (always present)
 *
 * Usage: Pass gameId, roomId, phase, round in the fields object
 */
export function slog(rid: string, msg: string, fields?: LogFields) {
  const truncatedFields = fields ? truncateData(fields) : undefined;
  basePino.info({ rid, ...truncatedFields }, msg);
}

export function serr(rid: string, msg: string, fields?: LogFields) {
  const truncatedFields = fields ? truncateData(fields) : undefined;
  basePino.error({ rid, ...truncatedFields }, msg);

  // Send to Sentry if available (use original fields for Sentry)
  if (Sentry) {
    Sentry.captureException(new Error(msg), {
      contexts: { custom: fields || {} },
      tags: {
        rid,
        traceId: fields?.traceId as string,
        roomId: fields?.roomId as string,
        gameId: fields?.gameId as string,
      },
    });
  }
}

/**
 * Warning level logging (sends to Sentry)
 */
export function swarn(rid: string, msg: string, fields?: LogFields) {
  const truncatedFields = fields ? truncateData(fields) : undefined;
  basePino.warn({ rid, ...truncatedFields }, msg);

  // Send to Sentry if available (use original fields for Sentry)
  if (Sentry) {
    Sentry.captureMessage(msg, {
      level: 'warning',
      contexts: { custom: fields || {} },
      tags: {
        rid,
        traceId: fields?.traceId as string,
        roomId: fields?.roomId as string,
        gameId: fields?.gameId as string,
      },
    });
  }
}

/**
 * Create a logger with preset context (useful for GameRoom)
 */
export function createLogger(defaultFields: LogFields) {
  const merged = (additional?: LogFields) => ({ ...defaultFields, ...additional });

  return {
    info: (rid: string, msg: string, fields?: LogFields) =>
      slog(rid, msg, merged(fields)),
    error: (rid: string, msg: string, fields?: LogFields) =>
      serr(rid, msg, merged(fields)),
    warn: (rid: string, msg: string, fields?: LogFields) =>
      swarn(rid, msg, merged(fields)),
  };
}
