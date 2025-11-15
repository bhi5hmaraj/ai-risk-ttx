import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define which routes require authentication (exclude login page)
const isProtectedRoute = createRouteMatcher(['/admin/((?!login).*)']);
const isPublicRoute = createRouteMatcher(['/admin/login']);

export default clerkMiddleware(async (auth, req) => {
  // Allow public access to login page
  if (isPublicRoute(req)) {
    return;
  }

  // Protect all other admin routes
  if (isProtectedRoute(req)) {
    await auth.protect();
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
