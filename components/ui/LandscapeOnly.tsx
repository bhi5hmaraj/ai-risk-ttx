'use client';

import React, { useState, useEffect } from 'react';

interface LandscapeOnlyProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that enforces landscape orientation on mobile devices.
 * Shows a "rotate your device" overlay when in portrait mode on mobile.
 * Desktop users are not affected.
 */
export const LandscapeOnly: React.FC<LandscapeOnlyProps> = ({ children }) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkOrientation = () => {
      // Check if mobile device (screen width < 1024px and touch capable)
      const mobile = window.innerWidth < 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

      // Check orientation - portrait if height > width
      const portrait = window.innerHeight > window.innerWidth;

      setShowOverlay(mobile && portrait);
    };

    // Initial check
    checkOrientation();

    // Listen for resize and orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Always render children, show overlay on top when needed
  return (
    <>
      {children}
      {mounted && showOverlay && (
        <div className="fixed inset-0 z-[100] bg-bg flex flex-col items-center justify-center p-8 text-center">
          {/* Rotate icon */}
          <div className="mb-6 animate-pulse">
            <svg
              className="w-24 h-24 text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {/* Phone outline */}
              <rect x="5" y="2" width="14" height="20" rx="2" />
              {/* Screen */}
              <rect x="7" y="4" width="10" height="14" rx="1" fill="currentColor" opacity="0.2" />
              {/* Rotation arrow */}
              <path
                d="M2 12c0-4 3-7 7-7M22 12c0 4-3 7-7 7"
                strokeLinecap="round"
              />
              <path d="M9 2l-2 3 3 2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 22l2-3-3-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-accent mb-3">
            Rotate Your Device
          </h2>

          <p className="text-muted max-w-xs">
            Simulacra is best experienced in landscape mode. Please rotate your device to continue.
          </p>

          <div className="mt-8 flex items-center gap-2 text-xs text-muted">
            <div className="w-8 h-5 border-2 border-current rounded-sm opacity-50" />
            <span className="text-accent">→</span>
            <div className="w-5 h-8 border-2 border-accent rounded-sm" />
          </div>
        </div>
      )}
    </>
  );
};

export default LandscapeOnly;
