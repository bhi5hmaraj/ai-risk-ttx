import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { LogoutButton } from '@/components/admin/LogoutButton';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] bg-gray-950 text-gray-100">
      <AdminSidebar />
      <main>
        <header className="flex items-center justify-between px-6 h-14 border-b border-gray-800">
          <div className="text-sm text-gray-400">Admin Panel</div>
          <LogoutButton />
        </header>
        <section className="p-6">{children}</section>
      </main>
    </div>
  );
}
