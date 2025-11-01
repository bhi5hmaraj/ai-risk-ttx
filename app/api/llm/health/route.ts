import { NextResponse } from 'next/server';
import { requireLLMEnv } from '@/server/lib/env';

export async function GET() {
  const envError = requireLLMEnv();
  if (envError) return envError;
  return NextResponse.json({ ok: true });
}

export async function HEAD() {
  const envError = requireLLMEnv();
  if (envError) return envError;
  return new NextResponse(null, { status: 200 });
}
