import type { Metadata } from 'next';
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}
