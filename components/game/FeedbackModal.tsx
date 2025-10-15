import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { CloseIcon, LoadingSpinner } from '../Icons';
import {
  type FeedbackFormState,
  type GameMetadata,
  transformFormStateToFeedbackData,
} from '../../types/feedback';
import { submitFeedback } from '../../services/feedbackService';
import { getSessionId, markFeedbackSubmitted } from '../../services/feedbackHelpers';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameMetadata: GameMetadata;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, gameMetadata }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeedbackFormState>({
    defaultValues: {
      uiRating: 5,
      gameDynamicsRating: 5,
      modelQualityRating: 5,
      scenarioRating: 5,
      actionsRating: 5,
      stakeholdersRating: 5,
      backgroundTech: false,
      backgroundPolicy: false,
      backgroundCreative: false,
      wantsCollaboration: false,
    },
  });

  const onSubmit = async (data: FeedbackFormState) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const sessionId = getSessionId();
      const feedbackData = transformFormStateToFeedbackData(data, gameMetadata, sessionId);

      const result = await submitFeedback(feedbackData);

      if (result.success) {
        setSubmitSuccess(true);
        markFeedbackSubmitted();

        // Close modal after success message
        setTimeout(() => {
          onClose();
          reset();
          setSubmitSuccess(false);
        }, 3000);
      } else {
        setSubmitError(result.error);
      }
    } catch (error) {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      reset();
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 overflow-y-auto pt-8 pb-8">
      <div className="bg-gray-900 border border-blue-500 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col relative">
        {/* Success State - Full Screen Overlay */}
        {submitSuccess && (
          <div className="absolute inset-0 bg-gray-900/95 flex items-center justify-center rounded-lg z-10">
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h3 className="text-3xl font-bold text-green-300">Thank You!</h3>
              <p className="text-lg text-gray-300">Your feedback has been submitted successfully.</p>
              <p className="text-sm text-gray-400">This window will close automatically...</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10 rounded-t-lg">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-300">Share Your Feedback</h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Help us improve Crisis Command</p>
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
          <div className="p-6 bg-red-900/30 border-b border-red-800">
            <p className="text-red-300 font-medium">✗ {submitError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
          {/* Rating Questions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-200">Rate Your Experience (1-10)</h3>

            <RatingInput
              label="UI & Design"
              {...register('uiRating', { required: true, min: 1, max: 10, valueAsNumber: true })}
              error={errors.uiRating?.message}
            />

            <RatingInput
              label="Game Dynamics"
              {...register('gameDynamicsRating', { required: true, min: 1, max: 10, valueAsNumber: true })}
              error={errors.gameDynamicsRating?.message}
            />

            <RatingInput
              label="Model Quality"
              {...register('modelQualityRating', { required: true, min: 1, max: 10, valueAsNumber: true })}
              error={errors.modelQualityRating?.message}
            />

            <RatingInput
              label="Scenario"
              {...register('scenarioRating', { required: true, min: 1, max: 10, valueAsNumber: true })}
              error={errors.scenarioRating?.message}
            />

            <RatingInput
              label="Actions"
              {...register('actionsRating', { required: true, min: 1, max: 10, valueAsNumber: true })}
              error={errors.actionsRating?.message}
            />

            <RatingInput
              label="Stakeholders"
              {...register('stakeholdersRating', { required: true, min: 1, max: 10, valueAsNumber: true })}
              error={errors.stakeholdersRating?.message}
            />
          </div>

          {/* Text Responses */}
          <div className="space-y-4">
            <TextAreaInput
              label="Whom/what scenario is this exercise most useful for?"
              placeholder="Optional: Share your thoughts..."
              {...register('scenarioUsefulness')}
            />

            <TextAreaInput
              label="Counterfactual usage of your time?"
              placeholder="Optional: What would you have been doing instead?"
              {...register('counterfactualTime')}
            />

            <TextAreaInput
              label="How could we have improved it?"
              placeholder="Optional: Suggestions for improvement..."
              {...register('improvements')}
            />
          </div>

          {/* Demographics */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-blue-200">Background (select all that apply)</h3>

            <CheckboxInput label="Tech" {...register('backgroundTech')} />
            <CheckboxInput label="Policy" {...register('backgroundPolicy')} />
            <CheckboxInput label="Creative (Communication)" {...register('backgroundCreative')} />
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <TextInput
              label="Email (optional)"
              type="email"
              placeholder="your@email.com"
              {...register('email')}
            />

            <CheckboxInput
              label="I'd like to collaborate with the team"
              {...register('wantsCollaboration')}
            />
          </div>
          </div>

          {/* Submit Button - Sticky Footer */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-800 bg-gray-900 sticky bottom-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white font-medium disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || submitSuccess}
              className="px-6 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isSubmitting && <LoadingSpinner />}
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Helper Components
const RatingInput = React.forwardRef<HTMLInputElement, {
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>>(({ label, error, ...props }, ref) => {
  const [value, setValue] = React.useState(props.defaultValue || 5);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
      <label className="text-sm text-gray-300 flex-shrink-0 sm:w-40">{label}</label>
      <div className="flex items-center gap-3 flex-1">
        <span className="text-xs text-gray-500">1</span>
        <input
          ref={ref}
          type="range"
          min="1"
          max="10"
          step="1"
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          {...props}
          onChange={(e) => {
            setValue(Number(e.target.value));
            props.onChange?.(e);
          }}
        />
        <span className="text-xs text-gray-500">10</span>
        <output className="text-sm text-blue-300 font-medium w-8 text-center">
          {value}
        </output>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});

const TextAreaInput = React.forwardRef<HTMLTextAreaElement, {
  label: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ label, ...props }, ref) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
    <textarea
      ref={ref}
      rows={3}
      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      {...props}
    />
  </div>
));

const TextInput = React.forwardRef<HTMLInputElement, {
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>>(({ label, ...props }, ref) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
    <input
      ref={ref}
      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      {...props}
    />
  </div>
));

const CheckboxInput = React.forwardRef<HTMLInputElement, {
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>>(({ label, ...props }, ref) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <input
      ref={ref}
      type="checkbox"
      className="w-4 h-4 bg-gray-800 border-gray-700 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
      {...props}
    />
    <span className="text-sm text-gray-300">{label}</span>
  </label>
));
