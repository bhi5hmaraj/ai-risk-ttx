import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/server/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST() {
  const { name, value, options } = clearSessionCookie();
  const res = NextResponse.json({ success: true });
  res.cookies.set(name, value, options as any);
  return res;
}

