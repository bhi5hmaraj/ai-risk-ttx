/**
 * Feedback system helper utilities
 */

const SESSION_ID_KEY = 'crisis-command-session-id';
const FEEDBACK_BANNER_DISMISSED_KEY = 'crisis-command-feedback-dismissed';
const FEEDBACK_SUBMITTED_KEY = 'crisis-command-feedback-submitted';

/**
 * Generate or retrieve persistent session ID
 */
export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    // Generate a simple session ID: timestamp + random string
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Check if feedback banner was dismissed
 */
export function isFeedbackBannerDismissed(): boolean {
  const dismissedAt = localStorage.getItem(FEEDBACK_BANNER_DISMISSED_KEY);
  if (!dismissedAt) return false;

  const dismissedTime = parseInt(dismissedAt, 10);
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  // Re-show banner after 24 hours
  return now - dismissedTime < twentyFourHours;
}

/**
 * Mark feedback banner as dismissed
 */
export function dismissFeedbackBanner(): void {
  localStorage.setItem(FEEDBACK_BANNER_DISMISSED_KEY, Date.now().toString());
}

/**
 * Check if user has already submitted feedback for this session
 */
export function hasFeedbackBeenSubmitted(): boolean {
  return localStorage.getItem(FEEDBACK_SUBMITTED_KEY) === 'true';
}

/**
 * Mark feedback as submitted (permanently for this session)
 */
export function markFeedbackSubmitted(): void {
  localStorage.setItem(FEEDBACK_SUBMITTED_KEY, 'true');
}

/**
 * Reset feedback state (useful for testing)
 */
export function resetFeedbackState(): void {
  localStorage.removeItem(FEEDBACK_BANNER_DISMISSED_KEY);
  localStorage.removeItem(FEEDBACK_SUBMITTED_KEY);
}
