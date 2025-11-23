"use client";

// Lightweight no-op shim so the app can compile and run
// before the real `copilotkit/react` package is installed.
// When ready to enable CopilotKit, replace usages of this shim
// with real imports from 'copilotkit/react'.

import React from 'react';

type ProviderProps = React.PropsWithChildren<{ instructions?: string }>;

export function CopilotProvider({ children }: ProviderProps) {
  return <>{children}</>;
}

export function CopilotChat(_props: { title?: string }) {
  // Render a small hint so designers know why chat is missing.
  return (
    <div className="mt-4 rounded border border-dashed border-gray-700 bg-gray-900 p-4 text-sm text-gray-400">
      The Architect is unavailable (package not installed). Install <code>@copilotkit/react-ui</code> to enable chat.
    </div>
  );
}

export function useCopilotAction(_args?: any) {
  // Return a stable no-op; real hook will be wired once dependency is added.
  return () => void 0;
}
