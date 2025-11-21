'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLink = { href: string; label: string };

export default function MobileNavMenu({
  open,
  onClose,
  links,
  authed,
}: {
  open: boolean;
  onClose: () => void;
  links: NavLink[];
  authed: boolean;
}) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="absolute right-0 top-0 h-full w-[80%] max-w-sm bg-[color:var(--card-bg,#050910)] text-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-sm uppercase tracking-wide text-white/70">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-md p-2 text-white/70 hover:text-white hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="m7.05 6l5 5l5-5l1.4 1.4l-5 5l5 5l-1.4 1.4l-5-5l-5 5L5.65 17.4l5-5l-5-5z" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-white/5">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={`block px-5 py-4 text-base ${
                      active ? 'text-[color:var(--gold,theme(colors.brand.gold))]' : 'text-white/80'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-white/10 p-5 space-y-3">
          <Link
            href={authed ? '/dashboard' : '/api/auth/signin'}
            onClick={onClose}
            className="btn-gold w-full text-center"
          >
            {authed ? 'Open Dashboard' : 'Sign In'}
          </Link>
          <Link
            href="/billing"
            onClick={onClose}
            className="btn-ghost w-full text-center border-white/30 text-white/80"
          >
            Plans & Pricing
          </Link>
        </div>
      </aside>
    </div>
  );
}
