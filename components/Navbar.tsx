'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import UserMenu from '@/components/UserMenu'
import ThemeToggle from './ThemeToggle';
import StudioMobileDrawer from './StudioMobileDrawer';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

// No AI Studio dropdown icons here anymore.

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const baseLinks = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/team', label: 'Team' },
    { href: '/billing', label: 'Billing' },
    { href: '/queue', label: 'Queue' },
    { href: '/dashboard/analytics', label: 'Analytics' }
  ];

  // AI Studio navigation is now in the fixed left sidebar.

  return (
    <header className="relative z-50 flex items-center justify-between py-6">
      <Link href="/" className="flex items-center gap-2">
        <div className="size-8 rounded-xl bg-[linear-gradient(135deg,#D4AF37,#E7D292)] shadow-glow" />
        <span className="text-lg font-semibold tracking-wide">GrowthPilot</span>
      </Link>

      <nav className="flex items-center gap-6">
        {baseLinks.map(l => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={`text-sm ${active ? 'text-white' : 'text-brand-muted hover:text-white'}`}
            >
              {l.label}
            </Link>
          );
        })}

        {/* AI Studio moved to persistent left sidebar; no top entry */}
        <button
          type="button"
          className="md:hidden text-sm text-brand-muted hover:text-white"
          onClick={() => setMobileOpen(true)}
          aria-label="Open AI Studio"
        >
          <span className="inline-flex items-center gap-1">
            <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80"><path fill="currentColor" d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z"/></svg>
            AI Studio
          </span>
        </button>
        <ThemeToggle />
        <UserMenu />
      </nav>
      <StudioMobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
