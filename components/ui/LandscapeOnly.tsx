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
      // Mobile heuristic: narrow screen and touch capable
      const mobile = window.innerWidth < 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

      // Robust portrait detection across iOS/Android
      const mql = window.matchMedia && window.matchMedia('(orientation: portrait)');
      const byMedia = mql ? mql.matches : undefined;
      const byScreen = (window.screen && 'orientation' in window.screen)
        ? String((window.screen as any).orientation?.type || '').startsWith('portrait')
        : undefined;
      const byDims = window.innerHeight > window.innerWidth;

      const portrait = [byMedia, byScreen, byDims].find(v => typeof v === 'boolean') as boolean;

      setShowOverlay(mobile && portrait);
    };

    // Initial check
    checkOrientation();

    // Listeners
    const mql = window.matchMedia && window.matchMedia('(orientation: portrait)');
    if (mql) mql.addEventListener?.('change', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      if (mql) mql.removeEventListener?.('change', checkOrientation);
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
          {/* Portrait → Landscape visual cue */}
          <div className="mb-6 flex items-center gap-4">
            {/* Portrait phone (source) */}
            <svg
              className="w-14 h-14 text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="6" y="2" width="12" height="20" rx="2" />
              <rect x="8" y="4" width="8" height="14" rx="1" fill="currentColor" opacity="0.2" />
            </svg>
            {/* Rotate arrow */}
            <svg
              className="w-10 h-10 text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 10a8 8 0 0 1 12.5-6.5" strokeLinecap="round" />
              <path d="M16 3h4v4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 14a8 8 0 0 1-12.5 6.5" strokeLinecap="round" />
              <path d="M8 21H4v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* Landscape phone (target) */}
            <svg
              className="w-16 h-16 text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <rect x="4" y="8" width="14" height="8" rx="1" fill="currentColor" opacity="0.2" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-accent mb-3">Rotate Your Device</h2>
          <p className="text-muted max-w-xs">Simulacra is best experienced in landscape mode. Please rotate your device to continue.</p>

          {/* Mini cue removed */}
        </div>
      )}
    </>
  );
};

export default LandscapeOnly;
