import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, LoadingSpinner } from '../Icons';
import type { GameSetup, GameEvent, PublicScenarioData } from '../../types';

interface MakePublicModalProps {
  isOpen: boolean;
  onClose: () => void;
  customPrompt: string;
  gameSetup: GameSetup;
  initialEvent: GameEvent;
}

export const MakePublicModal: React.FC<MakePublicModalProps> = ({
  isOpen,
  onClose,
  customPrompt,
  gameSetup,
  initialEvent,
}) => {
  const [submitterName, setSubmitterName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    console.log('[MakePublicModal] Submit button clicked');
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const scenarioData: PublicScenarioData = {
        customPrompt,
        gameSetup,
        initialEvent,
      };

      console.log('[MakePublicModal] Scenario data prepared:', {
        hasCustomPrompt: !!customPrompt,
        hasGameSetup: !!gameSetup,
        hasInitialEvent: !!initialEvent,
        submitterName: submitterName.trim() || 'anonymous',
      });

      console.log('[MakePublicModal] Sending POST request to /api/scenarios');

      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioData,
          submitterName: submitterName.trim() || undefined,
        }),
      });

      console.log('[MakePublicModal] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const result = await response.json();
      console.log('[MakePublicModal] Response body:', result);

      if (result.success) {
        console.log('[MakePublicModal] Submission successful!');
        setSubmitSuccess(true);

        // Close modal after success message
        setTimeout(() => {
          onClose();
          setSubmitterName('');
          setSubmitSuccess(false);
        }, 3000);
      } else {
        console.error('[MakePublicModal] Submission failed:', result.error);
        setSubmitError(result.error || 'Failed to submit scenario');
      }
    } catch (error) {
      console.error('[MakePublicModal] Caught error:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setSubmitterName('');
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-blue-500 rounded-lg w-full max-w-lg flex flex-col relative">
        {/* Success State - Full Screen Overlay */}
        {submitSuccess && (
          <div className="absolute inset-0 bg-gray-900/95 flex items-center justify-center rounded-lg z-10">
            <div className="text-center space-y-4">
              <div className="text-6xl">✓</div>
              <h3 className="text-3xl font-bold text-green-300">Submitted!</h3>
              <p className="text-lg text-gray-300">Your scenario is awaiting moderation.</p>
              <p className="text-sm text-gray-400">This window will close automatically...</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-blue-300">Make Scenario Public</h2>
            <p className="text-sm text-gray-400 mt-1">Share your custom scenario with the community</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CloseIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Error State */}
        {submitError && (
          <div className="p-4 bg-red-900/30 border-b border-red-800">
            <p className="text-red-300 font-medium">✗ {submitError}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Scenario Preview */}
          <div className="bg-gray-800 rounded-md p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-blue-200 mb-2">Your Custom Prompt:</h3>
            <p className="text-sm text-gray-300 italic">"{customPrompt}"</p>
          </div>

          <div className="bg-gray-800 rounded-md p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-blue-200 mb-2">Generated Scenario:</h3>
            <p className="text-sm text-gray-300 font-semibold">{gameSetup.scenarioTitle}</p>
            <p className="text-xs text-gray-400 mt-1">{gameSetup.scenarioDescription.substring(0, 150)}...</p>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name (optional)
            </label>
            <input
              type="text"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="Leave blank to submit anonymously"
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your name will be displayed if the scenario is approved by moderators.
            </p>
          </div>

          {/* Moderation Notice */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-md p-3">
            <p className="text-xs text-blue-200">
              <strong>Note:</strong> All submissions are reviewed by moderators before appearing publicly.
              This helps ensure quality and appropriate content for the community.
            </p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 p-6 border-t border-gray-800">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white font-medium disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || submitSuccess}
            className="px-6 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting && <LoadingSpinner />}
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
