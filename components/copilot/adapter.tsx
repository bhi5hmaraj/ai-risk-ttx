"use client";

// Minimal, modular adapter for CopilotKit with graceful fallback.
// If '@copilotkit/react-core' and '@copilotkit/react-ui' are installed, we re-export
// their Provider/Chat/hooks. Otherwise, we use the local shim so the app compiles.

import React from 'react';

type ProviderProps = React.PropsWithChildren<{
  instructions?: string;
  runtimeUrl?: string; // accepted by CopilotKit provider
  publicApiKey?: string; // optional, for Copilot Cloud
}>;

let CopilotProviderImpl: React.ComponentType<ProviderProps>;
let CopilotChatImpl: React.ComponentType<{ title?: string; instructions?: string }>;
let CopilotSidebarImpl: React.ComponentType<any>;
let CopilotPopupImpl: React.ComponentType<any>;
let useCopilotActionImpl: (...args: any[]) => any;
let useCopilotAdditionalInstructionsImpl: (...args: any[]) => any;
let useCopilotReadableImpl: (...args: any[]) => any;
let useCopilotChatImpl: (...args: any[]) => any;
let available = false;

try {
  // Prefer new package names
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const core = require('@copilotkit/react-core');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ui = require('@copilotkit/react-ui');
  CopilotProviderImpl = core.CopilotKit || core.CopilotProvider || (({ children }: ProviderProps) => <>{children}</>);
  CopilotChatImpl = ui.CopilotChat || (({ title }: { title?: string }) => <div className="text-xs text-gray-400">The Architect chat unavailable. Install @copilotkit/react-ui.</div>);
  CopilotSidebarImpl = ui.CopilotSidebar || ((props: any) => <div className="text-xs text-gray-400">The Architect sidebar unavailable. Install @copilotkit/react-ui.</div>);
  CopilotPopupImpl = ui.CopilotPopup || ((props: any) => <div className="text-xs text-gray-400">The Architect popup unavailable. Install @copilotkit/react-ui.</div>);
  useCopilotActionImpl = core.useCopilotAction || (() => () => void 0);
  useCopilotAdditionalInstructionsImpl = core.useCopilotAdditionalInstructions || (() => void 0);
  useCopilotReadableImpl = core.useCopilotReadable || (() => void 0);
  useCopilotChatImpl = core.useCopilotChat || (() => ({ stopGeneration: () => void 0 }));
  available = true;
} catch {
  // Fallback to local shim
  const shim = require('@/components/CopilotKitShim');
  CopilotProviderImpl = shim.CopilotProvider;
  CopilotChatImpl = shim.CopilotChat;
  useCopilotActionImpl = shim.useCopilotAction;
  useCopilotAdditionalInstructionsImpl = () => void 0;
  CopilotSidebarImpl = (props: any) => <>{props.children}</>;
  CopilotPopupImpl = (props: any) => <></>;
  useCopilotReadableImpl = () => void 0;
  useCopilotChatImpl = () => ({ stopGeneration: () => void 0 });
  available = false;
}

export const CopilotProvider = CopilotProviderImpl;
export const CopilotChat = CopilotChatImpl as any;
export const useCopilotAction = useCopilotActionImpl;
export const useCopilotReadable = useCopilotReadableImpl;
export const CopilotSidebar = CopilotSidebarImpl as any;
export const CopilotPopup = CopilotPopupImpl as any;
export const useCopilotAdditionalInstructions = useCopilotAdditionalInstructionsImpl;
export const isCopilotAvailable = () => available;
export const useCopilotChat = useCopilotChatImpl as any;
