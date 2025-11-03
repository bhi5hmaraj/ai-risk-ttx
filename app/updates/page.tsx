'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { UpdatesScreen } from '@/screens';

export default function UpdatesPage() {
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
      <UpdatesScreen onBack={() => router.back()} />
    </>
  );
}
