import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdminUser } from '@/server/lib/adminAccess';

// Define which routes require authentication
const isProtectedRoute = createRouteMatcher(['/admin(.*)']);
const isForbiddenPage = createRouteMatcher(['/admin/forbidden']);

export default clerkMiddleware(async (auth, req) => {
  // Allow access to forbidden page without admin check
  if (isForbiddenPage(req)) {
    return;
  }

  // Protect all admin routes
  if (isProtectedRoute(req)) {
    // First, ensure user is authenticated
    await auth.protect();

    // Then, check if user is in admin email allowlist
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      // User is authenticated but not an admin - redirect to forbidden page
      return NextResponse.redirect(new URL('/admin/forbidden', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
