import React from 'react';
import { useRotatingJoke } from '@/lib/loadingJokes';
import MatrixBackground from '@/components/ui/MatrixBackground';
import { LoadingSpinner } from '@/components/Icons';

interface LoadingScreenProps {
  message: string;
  error: string | null;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, error }) => {
  const joke = useRotatingJoke(4000); // Change every 4 seconds

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

      {error && <p className="text-danger mt-6">{error}</p>}
    </div>
  );
};
