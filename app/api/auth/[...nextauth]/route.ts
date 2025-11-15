import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Dynamic import to avoid hard dependency during development before package install
async function getNextAuth() {
  const [{ default: NextAuth }, { default: Credentials }] = await Promise.all([
    import('next-auth'),
    import('next-auth/providers/credentials'),
  ]);

  const auth = NextAuth({
    session: { strategy: 'jwt' } as any,
    debug: (process.env.NEXTAUTH_DEBUG === '1' || process.env.VERCEL_ENV === 'preview') as any,
    providers: [
      Credentials({
        name: 'Admin Password',
        credentials: { password: { label: 'Password', type: 'password' } },
        async authorize(credentials) {
          try { console.log('[auth] credentials.authorize called'); } catch {}
          const input = (credentials as any)?.password || '';
          const p1 = process.env.ADMIN_PASSWORD_1 || '';
          const p2 = process.env.ADMIN_PASSWORD_2 || '';
          try { console.log('[auth] ADMIN_PASSWORD_1 set:', !!p1, 'ADMIN_PASSWORD_2 set:', !!p2); } catch {}
          if (!p1 && !p2) return null;
          const ok = (!!p1 && input === p1) || (!!p2 && input === p2);
          if (!ok) {
            try { console.warn('[auth] credentials.authorize failed: password mismatch'); } catch {}
            return null;
          }
          return { id: 'admin', role: 'admin' } as any;
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if ((user as any)?.role) token.role = (user as any).role;
        return token;
      },
      async session({ session, token }) {
        (session as any).role = (token as any).role || null;
        return session;
      },
    },
    events: {
      async signIn(msg: any) { try { console.log('[auth] event signIn', { user: msg?.user?.id }); } catch {} },
      async signOut(_msg: any) { try { console.log('[auth] event signOut'); } catch {} },
      async session(_msg: any) { try { console.log('[auth] event session'); } catch {} },
      // Note: next-auth v4 types may not expose an `error` event; relying on default logger instead.
    },
    // Optionally set pages if you want custom sign-in UI
    // pages: { signIn: '/admin/login' },
    // Support both v5 (AUTH_SECRET) and v4 (NEXTAUTH_SECRET)
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });

  return auth;
}

export async function GET(req: NextRequest, ctx: any) {
  const auth = await getNextAuth();
  // NextAuth returns handlers object in v5 style
  if ('handlers' in auth) return (auth as any).handlers.GET(req, ctx);
  return (auth as any)(req, ctx);
}

export async function POST(req: NextRequest, ctx: any) {
  const auth = await getNextAuth();
  if ('handlers' in auth) return (auth as any).handlers.POST(req, ctx);
  return (auth as any)(req, ctx);
}
