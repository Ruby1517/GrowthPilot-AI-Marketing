'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import UserMenu from '@/components/UserMenu'
import { ThemeProvider } from './theme-provider';
import ThemeToggle from './ThemeToggle';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

/** Tiny inline icon set (no deps) */
function Icon({ name, className = 'w-4 h-4' }: { name: string; className?: string }) {
  switch (name) {
    case 'post':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M5 4h14a1 1 0 0 1 1 1v3H4V5a1 1 0 0 1 1-1Zm-1 7h16v2H4v-2Zm0 4h10v2H4v-2Z" />
        </svg>
      );
    case 'clip':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3l4-2.5V18L14 15.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" />
        </svg>
      );
    case 'blog':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h12v14a4 4 0 0 1-4 4H6a2 2 0 0 1-2-2V5Zm4 2h8v2H8V7Zm0 4h8v2H8v-2Zm0 4h6v2H8v-2Z" />
        </svg>
      );
    case 'ad':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M3 5h18v10H3V5Zm2 2v6h14V7H5Zm-2 12h10v2H3v-2Zm14 0h4v2h-4v-2Z" />
        </svg>
      );
    case 'brand': // NEW (BrandPilot)
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          {/* badge + spark/star */}
          <path fill="currentColor" d="M6 3h12a2 2 0 0 1 2 2v8l-8 6l-8-6V5a2 2 0 0 1 2-2Z" />
          <path fill="currentColor" d="M12 6.5l.9 1.8l2 .3l-1.45 1.4l.35 2l-1.8-.95L10.2 12l.35-2L9.1 8.6l2-.3L12 6.5Z" />
        </svg>
      );
    case 'mail': // NEW (MailPilot)
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M4 6h16a2 2 0 0 1 2 2v8H2V8a2 2 0 0 1 2-2Zm0 2v.2l8 4.8l8-4.8V8H4Zm0 8h16v2H4v-2Z" />
        </svg>
      );
    case 'lead':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.015-8 4.5V21h16v-2.5c0-2.485-3.582-4.5-8-4.5Z" />
        </svg>
      );
    case 'upload':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M12 3l4 4h-3v6h-2V7H8l4-4ZM4 19h16v2H4v-2Z" />
        </svg>
      );
    case 'assets':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M4 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v9H4V7Zm3 7l2.5-3l2 2.5L14 11l3 3H7Z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M7 2h2v3H7V2Zm8 0h2v3h-2V2ZM4 6h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm2 4h4v4H6v-4Z" />
        </svg>
      );
      case 'youtube':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M10 15l5.19-3L10 9v6Zm12-3c0 0-0.02-2.04-.26-3.02a3.04 3.04 0 0 0-2.14-2.14C18.61 6.5 12 6.5 12 6.5s-6.61 0-7.6.24A3.04 3.04 0 0 0 2.26 8.88C2.02 9.86 2 11.9 2 11.9s.02 2.04.26 3.02a3.04 3.04 0 0 0 2.14 2.14c.99.24 7.6.24 7.6.24s6.61 0 7.6-.24a3.04 3.04 0 0 0 2.14-2.14c.24-.98.26-3.02.26-3.02Z"/>
        </svg>
      );
    default:
      return null;
  }
}

export default function Navbar() {
  const pathname = usePathname();
  const { status } = useSession();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const baseLinks = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/billing', label: 'Billing' },
    { href: '/queue', label: 'Queue' },
    { href: '/dashboard/analytics', label: 'Analytics' }
  ];

  const creators = [
    { href: '/postpilot',  label: 'PostPilot',  desc: 'AI Social Content',    icon: 'post' },
    { href: '/clips',  label: 'ClipPilot',  desc: 'Video/Shorts Creator', icon: 'clip' },
    { href: '/blogpilot',  label: 'BlogPilot',  desc: 'SEO Blog Writer',      icon: 'blog' },
    { href: '/adpilot',    label: 'AdPilot',    desc: 'Ads Optimizer',        icon: 'ad' },
    { href: '/leadpilot',  label: 'LeadPilot',  desc: 'Lead Gen Chatbot',     icon: 'lead' },
    { href: '/leadpilot',  label: 'LeadPilot',  desc: 'Lead Gen Chatbot',     icon: 'lead' },
    { href: '/mailpilot',  label: 'MailPilot',  desc: 'Email Campaigns',      icon: 'mail' },
    { href: '/brandpilot', label: 'BrandPilot', desc: 'Brand & Design Kit',   icon: 'brand' }, 
    { href: '/viralpilot', label: 'ViralPilot', desc: 'Brand & Design Kit',   icon: 'youtube' },
  ];
  const tools = [
    { href: '/dashboard/history', label: 'History' },
    { href: '/dashboard/analytics', label: 'Analytics' },
    { href: '/upload',     label: 'Upload',     desc: 'Send files to S3',     icon: 'upload' },
    { href: '/assets',     label: 'Assets',     desc: 'Library & links',      icon: 'assets' },
    { href: '/calendar',   label: 'Calendar',   desc: 'Plan & schedule',      icon: 'calendar' },
  ];

  const studioActive = creators.concat(tools).some(l => isActive(pathname, l.href));

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

        {status === 'authenticated' && (
          <div className="relative" ref={menuRef}>
            <button
              ref={btnRef}
              type="button"
              onClick={() => setOpen(v => !v)}
              aria-expanded={open}
              aria-haspopup="menu"
              className={`text-sm inline-flex items-center gap-1 ${studioActive ? 'text-white' : 'text-brand-muted hover:text-white'}`}
            >
              AI Studio
              <svg width="12" height="12" viewBox="0 0 20 20" className="opacity-70">
                <path fill="currentColor" d="M5.5 7.5L10 12l4.5-4.5h-9z" />
              </svg>
            </button>

            {open && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-[560px] rounded-xl border border-white/10 bg-[color:var(--card-bg,rgba(255,255,255,0.04))] backdrop-blur-md shadow-glow p-1"
              >
                <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] text-xs uppercase tracking-wide text-brand-muted">
                  Create faster with AI
                </div>

                <div className="grid grid-cols-2 gap-1 p-2">
                  {/* Creators */}
                  <div className="px-1 pb-2">
                    <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-brand-muted">Creators</div>
                    <div className="mt-1 space-y-1">
                      {creators.map(l => {
                        const active = isActive(pathname, l.href);
                        return (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            role="menuitem"
                            className={`block rounded-md px-3 py-2 transition-colors ${
                              active
                                ? 'bg-[rgba(255,255,255,0.08)] text-white'
                                : 'text-brand-muted hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <Icon name={l.icon} className="w-4 h-4 mt-0.5 opacity-80" />
                              <div>
                                <div className="text-sm font-medium">{l.label}</div>
                                <div className="text-xs opacity-80">{l.desc}</div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tools */}
                  <div className="px-1 pb-2">
                    <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-brand-muted">Tools</div>
                    <div className="mt-1 space-y-1">
                      {tools.map(l => {
                        const active = isActive(pathname, l.href);
                        return (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            role="menuitem"
                            className={`block rounded-md px-3 py-2 transition-colors ${
                              active
                                ? 'bg-[rgba(255,255,255,0.08)] text-white'
                                : 'text-brand-muted hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <Icon name={l.icon} className="w-4 h-4 mt-0.5 opacity-80" />
                              <div>
                                <div className="text-sm font-medium">{l.label}</div>
                                <div className="text-xs opacity-80">{l.desc}</div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <ThemeToggle />
        <UserMenu />
      </nav>
    </header>
  );
}
