'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function ForbiddenPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-gray-300">
            You don't have permission to access the admin panel.
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded p-4 mb-6">
          <p className="text-sm text-gray-400">
            Only authorized administrators can access this area. If you believe this is an error, please contact the system administrator.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
