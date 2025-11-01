import { NextResponse } from 'next/server';
import { sanitizeEnv } from '@/server/lib/logger';

export async function GET() {
  const keys = [
    'NODE_ENV',
    'VERCEL',
    'VITE_LITELLM_API_KEY',
    'VITE_LLM_MODEL',
    'DATABASE_URL',
  ];
  const env = sanitizeEnv(keys);
  return NextResponse.json({ ok: true, env });
}
