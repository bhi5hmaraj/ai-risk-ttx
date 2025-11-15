'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    try {
      try {
        const mod: any = await import('next-auth/react');
        await mod.signOut({ redirect: false });
      } catch {
        await fetch('/api/admin/logout', { method: 'POST' });
      }
    } finally {
      router.push('/admin/login');
    }
  };

  return (
    <button onClick={handleLogout} className="text-sm text-gray-300 hover:text-white">
      Logout
    </button>
  );
}

