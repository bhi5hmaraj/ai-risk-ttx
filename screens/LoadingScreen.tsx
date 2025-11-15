import React from 'react';
import { useRotatingJoke } from '@/lib/loadingJokes';

interface LoadingScreenProps {
  message: string;
  error: string | null;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, error }) => {
  const joke = useRotatingJoke(4000); // Change every 4 seconds

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 pt-16">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-6" />
      <p className="text-xl text-blue-300 mb-4">{message}</p>

      {/* Rotating Matrix/simulation jokes */}
      <div className="mt-8 px-8 max-w-md text-center">
        <p className="text-sm text-gray-400 italic transition-opacity duration-500">
          "{joke}"
        </p>
      </div>

      {error && <p className="text-red-400 mt-6">{error}</p>}
    </div>
  );
};
