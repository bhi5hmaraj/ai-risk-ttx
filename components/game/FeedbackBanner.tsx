import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftIcon, XMarkIcon } from '../Icons';
import {
  isFeedbackBannerDismissed,
  dismissFeedbackBanner,
  hasFeedbackBeenSubmitted,
} from '../../services/feedbackHelpers';

interface FeedbackBannerProps {
  onOpenFeedback: () => void;
  currentRound: number;
}

/**
 * Unobtrusive feedback banner that appears after Round 1
 * Can be dismissed for 24 hours or permanently after submission
 */
export function FeedbackBanner({ onOpenFeedback, currentRound }: FeedbackBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Only show after Round 1 completes (starting from Round 2)
    if (currentRound <= 1) {
      return;
    }

    // Don't show if already submitted feedback
    if (hasFeedbackBeenSubmitted()) {
      return;
    }

    // Don't show if dismissed recently (24h)
    if (isFeedbackBannerDismissed()) {
      return;
    }

    // Delay showing banner slightly for smoother UX
    const timer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentRound]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      dismissFeedbackBanner();
    }, 300); // Match animation duration
  };

  const handleOpenFeedback = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onOpenFeedback();
    }, 200);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-gradient-to-r from-blue-600 to-blue-700
        text-white shadow-lg
        transition-all duration-300 ease-out
        ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Icon and Message */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <ChatBubbleLeftIcon className="w-5 h-5 flex-shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
              <p className="text-sm font-medium truncate">
                How's your experience so far? We'd love your feedback!
              </p>
              <p className="text-xs text-blue-200 opacity-90 truncate">
                (You can also access this from the header menu)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleOpenFeedback}
              className="
                px-4 py-1.5 rounded-md text-sm font-medium
                bg-white text-blue-600
                hover:bg-blue-50 active:bg-blue-100
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
              "
            >
              Share Feedback
            </button>

            <button
              onClick={handleDismiss}
              className="
                px-3 py-1.5 rounded-md text-sm font-medium
                text-white bg-blue-700
                hover:bg-blue-600 active:bg-blue-500
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700
              "
            >
              Remind Later
            </button>

            <button
              onClick={handleDismiss}
              className="
                p-1.5 rounded-md
                hover:bg-blue-600 active:bg-blue-500
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700
              "
              aria-label="Dismiss feedback banner"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
