import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function safeUrlHost(v?: string | null) {
  if (!v) return null;
  try { return new URL(v).hostname; } catch { return null; }
}

export async function GET() {
  const body = {
    clerkPublishableKeySet: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    clerkSecretKeySet: Boolean(process.env.CLERK_SECRET_KEY),
    vercelEnv: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
    directDbUrlHost: safeUrlHost(process.env.DIRECT_DATABASE_URL),
    databaseUrlHost: safeUrlHost(process.env.DATABASE_URL),
  };
  return NextResponse.json({ success: true, data: body }, { status: 200 });
}

