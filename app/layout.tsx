import type { Metadata } from 'next';
import './globals.css';
import '@copilotkit/react-ui/styles.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/react';
import { RouteOrchestrator } from '@/components/RouteOrchestrator';
import { FocusBoundary } from '@/components/FocusBoundary';
import { StartProgress } from '@/components/StartProgress';
import { ColyseusProvider } from '@/providers/ColyseusProvider';

export const metadata: Metadata = {
  title: 'Simulacra - AI Risk Tabletop Exercise',
  description: 'An AI-powered tabletop exercise simulation game for exploring AI safety scenarios',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const shell = (
    <html lang="en">
      <body className="antialiased">
        {/* Colyseus Provider wraps everything to persist connection across routes */}
        <ColyseusProvider>
          {/* Client-side orchestrator for route decisions */}
          <RouteOrchestrator />
          <FocusBoundary>
            <StartProgress />
            {children}
            {/* Vercel Web Analytics */}
            <Analytics />
          </FocusBoundary>
        </ColyseusProvider>
      </body>
    </html>
  );

  if (!clerkPublishableKey) return shell;

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      signInUrl="/login"
      signUpUrl="/login"
      signInFallbackRedirectUrl="/admin/dashboard"
      signUpFallbackRedirectUrl="/admin/dashboard"
      telemetry={false}
    >
      {shell}
    </ClerkProvider>
  );
}
