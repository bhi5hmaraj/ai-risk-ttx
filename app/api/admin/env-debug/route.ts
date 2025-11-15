import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function safeUrlHost(v?: string | null) {
  if (!v) return null;
  try { return new URL(v).hostname; } catch { return null; }
}

export async function GET() {
  const body = {
    adminPassword1Set: Boolean(process.env.ADMIN_PASSWORD_1),
    adminPassword2Set: Boolean(process.env.ADMIN_PASSWORD_2),
    nextauthUrl: process.env.NEXTAUTH_URL || null,
    nextauthSecretLen: process.env.NEXTAUTH_SECRET ? String(process.env.NEXTAUTH_SECRET).length : null,
    authSecretLen: process.env.AUTH_SECRET ? String(process.env.AUTH_SECRET).length : null,
    vercelEnv: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
    directDbUrlHost: safeUrlHost(process.env.DIRECT_DATABASE_URL),
    databaseUrlHost: safeUrlHost(process.env.DATABASE_URL),
  };
  return NextResponse.json({ success: true, data: body }, { status: 200 });
}

