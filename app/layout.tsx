import type { Metadata } from 'next';
import './globals.css';
import '@/styles/tokens.css';
import '@/styles/fonts.css';
import '@copilotkit/react-ui/styles.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/react';
import { RouteOrchestrator } from '@/components/RouteOrchestrator';
import { FocusBoundary } from '@/components/FocusBoundary';
import { StartProgress } from '@/components/StartProgress';

export const metadata: Metadata = {
  title: 'Simulacra - AI Risk Tabletop Exercise',
  description: 'An AI-powered tabletop exercise simulation game for exploring AI safety scenarios',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/login"
      signInFallbackRedirectUrl="/admin/dashboard"
      signUpFallbackRedirectUrl="/admin/dashboard"
      telemetry={false}
    >
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Recursive:wght@300..1000&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased bg-bg text-text font-recursive-sans">
          {/* Client-side orchestrator for route decisions */}
          <RouteOrchestrator />
          <FocusBoundary>
            <StartProgress />
            {children}
            {/* Vercel Web Analytics */}
            <Analytics />
          </FocusBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
