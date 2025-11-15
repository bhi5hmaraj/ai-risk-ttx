'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Try NextAuth if available
      try {
        const mod: any = await import('next-auth/react');
        const result = await mod.signIn('credentials', {
          redirect: false,
          password,
          callbackUrl: '/admin/dashboard',
        });
        if (result?.error) {
          setError(result.error);
          return;
        }
        router.push('/admin/dashboard');
        return;
      } catch {
        // Fallback to custom API if next-auth not installed yet
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.success) {
          setError(body?.error || 'Login failed');
          return;
        }
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h1 className="text-lg font-semibold">Admin Login</h1>
        <label className="block">
          <span className="text-sm text-gray-300">Password</span>
          <input
            type="password"
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
        </label>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white rounded py-2"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
