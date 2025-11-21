'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import UserMenu from '@/components/UserMenu'
import ThemeToggle from './ThemeToggle';
import StudioMobileDrawer from './StudioMobileDrawer';
import MobileNavMenu from './MobileNavMenu';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  // Navbar should only highlight exact matches to avoid parent sections (e.g., '/dashboard')
  // lighting up for nested routes like '/dashboard/team'.
  return pathname === href;
}

// No AI Studio dropdown icons here anymore.

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [studioDrawerOpen, setStudioDrawerOpen] = useState(false);

  const baseLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/team', label: 'Team' },
    { href: '/billing', label: 'Plans & Pricing' },
    { href: '/profile', label: 'Profile' },
    { href: '/settings', label: 'Settings' },
    { href: '/dashboard/analytics', label: 'Analytics' }
  ];
  const authed = Boolean(session?.user);
  const links = baseLinks.filter(l => {
    if (!authed && (l.href === '/dashboard' || l.href.startsWith('/dashboard/') || l.href === '/profile' || l.href === '/settings')) return false;
    return true;
  });

  // AI Studio navigation is now in the fixed left sidebar.

  return (
    <header className="relative z-50 flex items-center justify-between py-3 pl-6 pr-4 glass-dark">
      <Link href="/" className="flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          className="w-8 h-8"
          aria-hidden
          style={{ filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.35)) drop-shadow(0 0 14px var(--gold))' }}
        >
          <path d="M2 12L22 3l-9 19-2-8-8-2z" fill="var(--gold)" />
          <path d="M22 3l-11 8 2 8z" fill="var(--goldLight)" />
        </svg>
        <span className="text-base font-semibold tracking-wide">GrowthPilot</span>
      </Link>

      <nav className="flex items-center gap-4">
        <button
          type="button"
          className="md:hidden rounded-md p-2 text-sm dark:text-white/80 text-black/80 hover:bg-white/10 hover:text-white"
          onClick={() => setNavMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z" />
          </svg>
        </button>
        <div className="hidden md:flex items-center gap-4">
          {links.map(l => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`text-sm ${
                  active
                    ? 'dark:text-[color:var(--gold,theme(colors.brand.gold))] text-[#14B8A6]'
                    : 'dark:text-white/80 text-black/80 hover:text-[#14B8A6] dark:hover:text-[color:var(--gold,theme(colors.brand.gold))]'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* AI Studio moved to persistent left sidebar; no top entry */}
        {authed && (
        <button
          type="button"
          className="md:hidden text-sm dark:text-white/80 text-black/80 hover:text-[#14B8A6] dark:hover:text-[color:var(--gold,theme(colors.brand.gold))]"
          onClick={() => setStudioDrawerOpen(true)}
          aria-label="Open AI Studio"
        >
          <span className="inline-flex items-center gap-1">
            <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80"><path fill="currentColor" d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z"/></svg>
            AI Studio
          </span>
        </button>
        )}
        <ThemeToggle />
        <UserMenu />
      </nav>
      <MobileNavMenu open={navMenuOpen} onClose={() => setNavMenuOpen(false)} links={links} authed={authed} />
      <StudioMobileDrawer open={studioDrawerOpen} onClose={() => setStudioDrawerOpen(false)} />
    </header>
  );
}
