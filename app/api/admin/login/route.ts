import { NextRequest, NextResponse } from 'next/server';
import { buildSessionCookie, checkAdminPassword, issueSessionToken, json } from '@/server/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json().catch(() => ({}));
    if (typeof password !== 'string' || !password) {
      return json(400, { success: false, error: 'Password required' });
    }

    const ok = await checkAdminPassword(password);
    // Small fixed delay to make bruteforce marginally harder
    await new Promise((r) => setTimeout(r, 200));
    if (!ok) {
      return json(401, { success: false, error: 'Invalid credentials' });
    }

    const token = await issueSessionToken();
    const { name, value, options } = buildSessionCookie(token);
    const res = NextResponse.json({ success: true });
    res.cookies.set(name, value, options as any);
    return res;
  } catch (err: any) {
    return json(500, { success: false, error: err?.message || 'Internal error' });
  }
}

