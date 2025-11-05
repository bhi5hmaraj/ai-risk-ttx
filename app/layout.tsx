import type { Metadata } from 'next';
import './globals.css';
import { RouteOrchestrator } from '@/components/RouteOrchestrator';
import { SessionMonitor } from '@/components/SessionMonitor';
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
    <html lang="en">
      <body className="antialiased">
        {/* Client-side orchestrator for route decisions */}
        <RouteOrchestrator />
        {/* SSE connection monitor for real-time backend updates */}
        <SessionMonitor />
        <FocusBoundary>
          <StartProgress />
          {children}
        </FocusBoundary>
      </body>
    </html>
  );
}
