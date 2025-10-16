import type { FeedbackData } from '../types/feedback';

/**
 * API response types
 */
interface FeedbackSubmissionResponse {
  success: boolean;
  id: string;
  message: string;
}

interface FeedbackErrorResponse {
  error: string;
  message?: string;
  details?: any;
}

/**
 * Submit feedback to the API
 */
export async function submitFeedback(
  feedbackData: FeedbackData
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData),
    });

    if (!response.ok) {
      const errorData: FeedbackErrorResponse = await response.json();
      console.error('Feedback submission failed:', errorData);

      return {
        success: false,
        error: errorData.message || errorData.error || 'Failed to submit feedback',
      };
    }

    const data: FeedbackSubmissionResponse = await response.json();

    return {
      success: true,
      id: data.id,
    };
  } catch (error) {
    console.error('Error submitting feedback:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
