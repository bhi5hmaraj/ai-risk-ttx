'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  const base = 'block px-3 py-2 rounded text-sm';
  const cls = active
    ? 'bg-gray-800 text-white'
    : 'text-gray-300 hover:text-white hover:bg-gray-800';
  return (
    <li>
      <Link href={href} className={`${base} ${cls}`}>
        {label}
      </Link>
    </li>
  );
}

export function AdminSidebar() {
  return (
    <aside className="border-r border-gray-800 p-4">
      <div className="text-lg font-semibold mb-4">Admin</div>
      <ul className="space-y-1">
        <NavItem href="/admin/dashboard" label="Dashboard" />
        <NavItem href="/admin/scenarios" label="Scenarios" />
        <NavItem href="/admin/feedback" label="Feedback" />
        <NavItem href="/admin/health" label="Health" />
      </ul>
    </aside>
  );
}

