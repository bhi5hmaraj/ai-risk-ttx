import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/server/lib/adminAuth';

// Guard admin pages (App Router). We leave API auth to the API handlers.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Allow login page unconditionally
  if (pathname === '/admin/login') return NextResponse.next();
  if (pathname.startsWith('/admin')) {
    // Try NextAuth middleware first
    try {
      const { withAuth } = await import('next-auth/middleware');
      const mw = (withAuth as any)({
        callbacks: {
          authorized: ({ token }: any) => !!token && (token as any).role === 'admin',
        },
      });
      return mw(request);
    } catch {
      // Fallback to custom cookie if next-auth is not installed yet
      const cookie = request.cookies.get('admin_session')?.value;
      if (!cookie) {
        const url = new URL('/admin/login', request.url);
        return NextResponse.redirect(url);
      }
      const ok = await verifySessionToken(cookie);
      if (!ok.valid) {
        const url = new URL('/admin/login', request.url);
        return NextResponse.redirect(url);
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
