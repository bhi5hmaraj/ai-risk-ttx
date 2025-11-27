/**
 * Minimal server-side logger with per-request correlation IDs and Sentry integration.
 */

// Import Sentry if available (optional, won't crash if not installed)
let Sentry: any;
try {
  Sentry = require('../instrument');
} catch {
  // Sentry not configured, logging will work without it
  Sentry = null;
}

type LogFields = Record<string, unknown> | undefined;

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

function fmt(fields: LogFields) {
  if (!fields) return '';
  try {
    const flat = Object.entries(fields)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    return flat ? ' ' + flat : '';
  } catch {
    return '';
  }
}

/**
 * Enhanced structured logger with trace correlation
 * Format: [traceId][roomId][sessionId] rid=xxx message fields
 */
export function slog(rid: string, msg: string, fields?: LogFields) {
  const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

  // Build prefix from trace/room/session if present in fields
  const prefix = buildPrefix(fields);
  const line = `${prefix}[SVR] rid=${rid} ${msg}${fmt(fields)}`;

  if (level === 'silent') return;
  console.log(line);
}

export function serr(rid: string, msg: string, fields?: LogFields) {
  const prefix = buildPrefix(fields);
  const line = `${prefix}[SVR] rid=${rid} ${msg}${fmt(fields)}`;
  console.error(line);

  // Send to Sentry if available
  if (Sentry) {
    Sentry.captureException(new Error(msg), {
      contexts: { custom: fields || {} },
      tags: {
        rid,
        traceId: fields?.traceId as string,
        roomId: fields?.roomId as string,
      },
    });
  }
}

/**
 * Warning level logging (sends to Sentry)
 */
export function swarn(rid: string, msg: string, fields?: LogFields) {
  const prefix = buildPrefix(fields);
  const line = `${prefix}[WARN] rid=${rid} ${msg}${fmt(fields)}`;
  console.warn(line);

  if (Sentry) {
    Sentry.captureMessage(msg, {
      level: 'warning',
      contexts: { custom: fields || {} },
      tags: {
        rid,
        traceId: fields?.traceId as string,
        roomId: fields?.roomId as string,
      },
    });
  }
}

/**
 * Build prefix for trace correlation
 * Format: [traceId][roomId][sessionId]
 */
function buildPrefix(fields?: LogFields): string {
  if (!fields) return '';

  const parts: string[] = [];
  if (fields.traceId) parts.push(`[${fields.traceId}]`);
  if (fields.roomId) parts.push(`[${fields.roomId}]`);
  if (fields.sessionId) parts.push(`[${fields.sessionId}]`);

  return parts.length > 0 ? parts.join('') + ' ' : '';
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
