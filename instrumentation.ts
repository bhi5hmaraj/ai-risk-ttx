/**
 * Next.js Instrumentation
 *
 * Runs when the Next.js server starts (both dev and production)
 * Used to load secrets from Infisical before handling requests
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on Node.js runtime (not Edge)
    const { loadSecrets } = await import('./lib/infisical');
    await loadSecrets();
  }
}
