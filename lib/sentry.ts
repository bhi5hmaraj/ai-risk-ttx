/**
 * Sentry Observability Setup
 *
 * Setup once, forget about it. Automatically captures:
 * - Errors (with stack traces, user context)
 * - Performance (slow API calls, LLM latency)
 * - Colyseus room lifecycle
 * - Next.js page loads
 *
 * Free tier: 5K events/month
 */

import * as Sentry from "@sentry/nextjs";

// Initialize Sentry (call this in server.ts and _app.tsx)
export function initSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set sampling rates
    tracesSampleRate: 0.1, // 10% of transactions (adjust based on volume)

    // Environment
    environment: process.env.NODE_ENV,

    // Release tracking (for deploy notifications)
    release: process.env.VERCEL_GIT_COMMIT_SHA,

    // Ignore noisy errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],

    // Tag all events with useful context
    beforeSend(event) {
      // Don't send in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[Sentry]', event);
        return null;
      }
      return event;
    },
  });
}

// Custom instrumentation for Colyseus events
export function trackColyseusEvent(
  event: 'room_created' | 'player_joined' | 'round_advanced' | 'ai_call',
  data: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category: 'colyseus',
    message: event,
    data,
    level: 'info',
  });
}

// Track LLM performance
export async function trackLLMCall<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = Sentry.startTransaction({
    name: `llm.${operation}`,
    op: 'llm',
  });

  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    Sentry.captureException(error, {
      tags: { operation },
    });
    throw error;
  } finally {
    transaction.finish();
  }
}

// Usage examples:

// In server.ts
// import { initSentry } from './lib/sentry';
// initSentry();

// In GameRoom
// import { trackColyseusEvent } from './lib/sentry';
//
// onCreate(options) {
//   trackColyseusEvent('room_created', { roomId: this.roomId });
// }

// In AI service
// import { trackLLMCall } from './lib/sentry';
//
// const response = await trackLLMCall('generate_actions', async () => {
//   return await openai.chat.completions.create(...);
// });
