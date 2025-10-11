import React from 'react';

interface LoadingScreenProps {
  message: string;
  error: string | null;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, error }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-6" />
    <p className="text-xl text-blue-300">{message}</p>
    {error && <p className="text-red-400 mt-4">{error}</p>}
  </div>
);

