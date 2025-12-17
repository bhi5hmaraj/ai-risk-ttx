import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useRotatingJoke } from '@/lib/loadingJokes';
import MatrixBackground from '@/components/ui/MatrixBackground';
import { LoadingSpinner } from '@/components/Icons';

interface LoadingScreenProps {
  message: string;
  error: string | null;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, error }) => {
  const joke = useRotatingJoke(4000); // Change every 4 seconds
  const { setError } = useUIStore();

  return (
    <div className="relative min-h-screen bg-bg pt-16 flex flex-col items-center justify-center">
      {/* Subtle Matrix background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <MatrixBackground opacity={0.12} />
      </div>

      <LoadingSpinner className="h-12 w-12 text-accent" />
      <p className="mt-4 text-xl text-text">{message}</p>

      {/* Rotating Matrix/simulation jokes */}
      <div className="mt-6 px-8 max-w-md text-center">
        <p className="text-sm text-muted italic transition-opacity duration-500">"{joke}"</p>
      </div>

      {error && (
        <div className="mt-6 bg-red-900/40 border border-red-600 text-red-200 p-3 rounded-md flex items-start justify-between gap-3" role="alert">
          <div className="flex-1 text-left">{error}</div>
          <button
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="shrink-0 px-2 py-0.5 rounded text-red-200 hover:text-red-100 hover:bg-red-800/40 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
