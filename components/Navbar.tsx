'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserMenu from '@/components/UserMenu'

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

  const triggerMobileSidebar = () => {
    try {
      window.dispatchEvent(new Event('gp:sidebar-mobile-toggle'));
    } catch {}
  };

  const baseLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/billing', label: 'Plans & Pricing' },
    { href: '/dashboard', label: 'Dashboard' },
  ];
  const authed = Boolean(session?.user);
  const links = baseLinks.filter(l => {
    if (!authed && l.href === '/dashboard') return false;
    return true;
  });

  // AI Studio navigation is now in the fixed left sidebar.

  return (
    <header className="sticky top-0 inset-x-0 z-50 flex items-center justify-between py-3 pl-4 pr-3 md:pl-6 md:pr-4 glass-dark min-h-[64px]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Open AI Studio navigation"
          onClick={triggerMobileSidebar}
          className="md:hidden inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white hover:bg-white/10 transition"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
            <path fill="currentColor" d="M4 7h16v2H4V7Zm0 4h16v2H4v-2Zm0 4h16v2H4v-2Z" />
          </svg>
        </button>

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
      </div>

      <nav className="flex items-center gap-4">
        {!authed && (
          <div className="md:hidden flex items-center gap-3 text-sm">
            <Link href="/" className="text-white/90 hover:text-white">
              Home
            </Link>
            <Link href="/billing" className="text-white/90 hover:text-white whitespace-nowrap">
              Pricing
            </Link>
          </div>
        )}
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
        <UserMenu />
      </nav>
    </header>
  );
}
