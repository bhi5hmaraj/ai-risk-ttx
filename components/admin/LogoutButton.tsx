'use client';

import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';

export function LogoutButton() {
  const router = useRouter();
  const { signOut } = useClerk();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <button onClick={handleLogout} className="text-sm text-gray-300 hover:text-white">
      Logout
    </button>
  );
}

