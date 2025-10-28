/* Simple debug logger and helpers for API */

export const DEBUG_API =
  process.env.DEBUG_API === '1' ||
  process.env.DEBUG_API === 'true' ||
  process.env.NODE_ENV === 'development';

export const makeReqId = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export const mask = (value?: string | null) => {
  if (!value) return 'null';
  const s = String(value);
  if (s.length <= 8) return '********';
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
};

export const sanitizeHeaders = (headers?: Headers | Record<string, any> | null) => {
  const out: Record<string, string> = {};
  if (!headers) return out;
  const iter = headers instanceof Headers ? headers.entries() : Object.entries(headers as Record<string, any>);
  for (const [k, v] of iter as any) {
    const key = String(k).toLowerCase();
    const value = Array.isArray(v) ? v.join(',') : String(v ?? '');
    if (key === 'cookie' || key === 'set-cookie') {
      out[key] = '[omitted]';
    } else if (key.includes('authorization') || key.includes('api-key')) {
      out[key] = mask(value);
    } else {
      out[key] = value;
    }
  }
  return out;
};

export const logDebug = (...args: any[]) => {
  if (!DEBUG_API) return;
  // eslint-disable-next-line no-console
  console.log('[API DEBUG]', ...args);
};
