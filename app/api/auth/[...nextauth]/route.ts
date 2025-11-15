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
    providers: [
      Credentials({
        name: 'Admin Password',
        credentials: { password: { label: 'Password', type: 'password' } },
        async authorize(credentials) {
          const input = (credentials as any)?.password || '';
          const p1 = process.env.ADMIN_PASSWORD_1 || '';
          const p2 = process.env.ADMIN_PASSWORD_2 || '';
          if (!p1 && !p2) return null;
          const ok = (!!p1 && input === p1) || (!!p2 && input === p2);
          if (!ok) return null;
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
