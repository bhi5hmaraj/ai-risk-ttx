'use client';

import React from 'react';

export const FocusBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      role="region"
      tabIndex={-1}
      data-nextjs-scroll-focus-boundary
      style={{ position: 'relative', outline: 'none' }}
    >
      {children}
    </div>
  );
};

