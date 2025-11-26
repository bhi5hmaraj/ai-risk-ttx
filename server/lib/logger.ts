/**
 * Minimal server-side logger with per-request correlation IDs.
 */

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

export function slog(rid: string, msg: string, fields?: LogFields) {
  // Keep noise low in production unless explicitly enabled
  const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  const line = `[SVR] rid=${rid} ${msg}${fmt(fields)}`;
  if (level === 'silent') return;
  console.log(line);
}

export function serr(rid: string, msg: string, fields?: LogFields) {
  const line = `[SVR] rid=${rid} ${msg}${fmt(fields)}`;
  console.error(line);
}

