'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { AboutScreen } from '@/screens';

export default function AboutPage() {
  const router = useRouter();

  return (
    <>
      <Navigation
        onNavigateHome={() => router.push('/')}
        onOpenFeedback={() => {}}
        onOpenAbout={() => router.push('/about')}
        onOpenUpdates={() => router.push('/updates')}
        showFeedback={false}
      />
      <AboutScreen onBack={() => router.back()} />
    </>
  );
}
