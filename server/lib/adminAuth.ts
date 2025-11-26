import { NextResponse } from 'next/server';

const textEncoder = new TextEncoder();

function getEnv(name: string, optional = false): string | undefined {
  const v = process.env[name];
  if (!v && !optional) throw new Error(`${name} is required`);
  return v;
}

export function getSessionTtlSeconds(): number {
  const raw = process.env.ADMIN_SESSION_TTL;
  const n = raw ? Number.parseInt(raw, 10) : 86400; // 24h default
  return Number.isFinite(n) && n > 0 ? n : 86400;
}

function toBase64(bytes: Uint8Array): string {
  // Use Buffer when available (Node), fall back to btoa for edge/browser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B: any = (globalThis as any).Buffer;
  if (B?.from) return B.from(bytes).toString('base64');
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const btoaImpl: any = (globalThis as any).btoa;
  return btoaImpl(bin);
}

function fromBase64(b64: string): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B: any = (globalThis as any).Buffer;
  if (B?.from) return new Uint8Array(B.from(b64, 'base64'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const atobImpl: any = (globalThis as any).atob;
  const bin = atobImpl(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlEncodeBytes(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlEncodeString(s: string): string {
  return b64urlEncodeBytes(textEncoder.encode(s));
}

function b64urlToBytes(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return fromBase64(b64);
}

async function hmacSha256(data: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(data));
  return new Uint8Array(sig);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i)! ^ b.charCodeAt(i)!;
  return mismatch === 0;
}

export async function checkAdminPassword(input: string): Promise<boolean> {
  const p1 = getEnv('ADMIN_PASSWORD_1', true) || '';
  const p2 = getEnv('ADMIN_PASSWORD_2', true) || '';
  if (!p1 && !p2) return false;
  // constant-time compare against both
  return (!!p1 && constantTimeEqual(p1, input)) || (!!p2 && constantTimeEqual(p2, input));
}

type TokenPayload = { sub: 'admin'; iat: number; exp: number; ver: 1 };

export async function issueSessionToken(): Promise<string> {
  const secret = getEnv('SESSION_SECRET')!;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + getSessionTtlSeconds();
  const payload: TokenPayload = { sub: 'admin', iat: now, exp, ver: 1 };
  const payloadStr = JSON.stringify(payload);
  const header = b64urlEncodeString('v1');
  const body = b64urlEncodeString(payloadStr);
  const data = `${header}.${body}`;
  const sig = await hmacSha256(data, secret);
  const sigPart = b64urlEncodeBytes(sig);
  return `${data}.${sigPart}`;
}

export async function verifySessionToken(token: string): Promise<{ valid: boolean; reason?: string; payload?: TokenPayload }>
{
  try {
    const secret = getEnv('SESSION_SECRET')!;
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, reason: 'format' };
    const [headerB64, bodyB64, sigB64] = parts;
    if (headerB64 !== b64urlEncodeString('v1')) return { valid: false, reason: 'version' };
    const data = `${headerB64}.${bodyB64}`;
    const expected = b64urlEncodeBytes(await hmacSha256(data, secret));
    if (!constantTimeEqual(expected, sigB64)) return { valid: false, reason: 'sig' };
    const payloadStr = new TextDecoder().decode(b64urlToBytes(bodyB64));
    const payload: TokenPayload = JSON.parse(payloadStr);
    if (payload.sub !== 'admin' || payload.ver !== 1) return { valid: false, reason: 'claims' };
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return { valid: false, reason: 'expired' };
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'error' };
  }
}

export function buildSessionCookie(token: string) {
  // Construct cookie attributes consistent across routes
  return {
    name: 'admin_session',
    value: token,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/admin',
      maxAge: getSessionTtlSeconds(),
    },
  };
}

export function clearSessionCookie() {
  return {
    name: 'admin_session',
    value: '',
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/admin',
      maxAge: 0,
    },
  };
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

