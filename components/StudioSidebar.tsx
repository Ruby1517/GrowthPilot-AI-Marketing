'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { ModuleKey, ModuleStatus } from '@/lib/modules';
import { moduleLabels, moduleStatus } from '@/lib/modules';
import ThemeToggle from './ThemeToggle';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  switch (name) {
    case 'home': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="m4 10l8-6l8 6v10a2 2 0 0 1-2 2h-4v-6H10v6H6a2 2 0 0 1-2-2V10Z"/></svg>);
    // PostPilot — share / social network nodes
    case 'post': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>);
    case 'clip': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3l4-2.5V18L14 15.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"/></svg>);
    // BlogPilot — article with lines
    case 'blog': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>);
    // AdPilot — megaphone / campaign
    case 'ad': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.66 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg>);
    // LeadPilot — chat bubbles
    case 'lead': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>);
    // MailPilot — paper plane (send)
    case 'mail': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>);
    // Brand Voice — microphone
    case 'brand': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>);
    case 'upload': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M12 3l4 4h-3v6h-2V7H8l4-4ZM4 19h16v2H4v-2Z"/></svg>);
    // Connections — plug/link icon
    case 'connections': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M17 7H13V9H17C18.65 9 20 10.35 20 12C20 13.65 18.65 15 17 15H13V17H17C19.76 17 22 14.76 22 12C22 9.24 19.76 7 17 7ZM11 15H7C5.35 15 4 13.65 4 12C4 10.35 5.35 9 7 9H11V7H7C4.24 7 2 9.24 2 12C2 14.76 4.24 17 7 17H11V15ZM8 11H16V13H8V11Z"/></svg>);
    // Campaign Agent — sparkle/AI
    case 'agent': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M12 2a1 1 0 0 1 .894.553l2.382 4.764 5.263.764a1 1 0 0 1 .555 1.706l-3.808 3.713.899 5.243a1 1 0 0 1-1.451 1.054L12 17.27l-4.734 2.527a1 1 0 0 1-1.451-1.054l.899-5.243L2.906 9.787a1 1 0 0 1 .555-1.706l5.263-.764 2.382-4.764A1 1 0 0 1 12 2Z"/></svg>);
    // Analytics — trending line chart
    case 'analytics': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>);
    // Team — two people
    case 'team': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>);
    case 'youtube': return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path fill="currentColor" d="M10 15l5.19-3L10 9v6Zm12-3c0 0-0.02-2.04-.26-3.02a3.04 3.04 0 0 0-2.14-2.14C18.61 6.5 12 6.5 12 6.5s-6.61 0-7.6.24A3.04 3.04 0 0 0 2.26 8.88C2.02 9.86 2 11.9 2 11.9s.02 2.04.26 3.02a3.04 3.04 0 0 0 2.14 2.14c.99.24 7.6.24 7.6.24s6.61 0 7.6-.24a3.04 3.04 0 0 0 2.14-2.14c.24-.98.26-3.02.26-3.02Z" />
      </svg>
    );
    default: return null;
  }
}

export const creators: Array<{
  href: string;
  label: string;
  desc?: string;
  icon: string;
  module: ModuleKey;
  status: ModuleStatus;
}> = [
  { href: '/postpilot',  label: moduleLabels.postpilot,  desc: 'AI Social Content',  icon: 'post',  module: 'postpilot',  status: moduleStatus.postpilot },
  { href: '/blogpilot',  label: moduleLabels.blogpilot,  desc: 'SEO Blog Writer',    icon: 'blog',  module: 'blogpilot',  status: moduleStatus.blogpilot },
  { href: '/adpilot',    label: moduleLabels.adpilot,    desc: 'Ads Optimizer',      icon: 'ad',    module: 'adpilot',    status: moduleStatus.adpilot },
  { href: '/leadpilot',  label: moduleLabels.leadpilot,  desc: 'Lead Gen Chatbot',   icon: 'lead',  module: 'leadpilot',  status: moduleStatus.leadpilot },
  { href: '/mailpilot',  label: moduleLabels.mailpilot,  desc: 'Email Campaigns',    icon: 'mail',  module: 'mailpilot',  status: moduleStatus.mailpilot },
];

// Tools menu toggle (client env): set NEXT_PUBLIC_SHOW_TOOLS=false to hide
const SHOW_TOOLS = process.env.NEXT_PUBLIC_SHOW_TOOLS !== 'false';
export const tools = [
  { href: '/brand',               label: 'Brand Voice',  icon: 'brand' },
  { href: '/settings/social',     label: 'Connections',  icon: 'connections' },
  { href: '/dashboard/analytics', label: 'Analytics',    icon: 'analytics' },
  { href: '/dashboard/team',      label: 'Team',         icon: 'team' },
];

export default function StudioSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem('gpSidebarCollapsed');
      setCollapsed(v === null ? false : v === '1');
    } catch {}
    function onChanged() {
      try {
        const v = localStorage.getItem('gpSidebarCollapsed');
        setCollapsed(v === '1');
      } catch {}
    }
    window.addEventListener('gp:sidebar-changed', onChanged);
    const onMobileToggle = () => setMobileOpen(v => !v);
    window.addEventListener('gp:sidebar-mobile-toggle', onMobileToggle);
    return () => {
      window.removeEventListener('gp:sidebar-changed', onChanged);
      window.removeEventListener('gp:sidebar-mobile-toggle', onMobileToggle);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const renderSidebarContent = (opts?: { forceExpanded?: boolean; showCollapse?: boolean; className?: string }) => {
    const { forceExpanded = false, showCollapse = true, className = '' } = opts || {};
    const isCollapsed = forceExpanded ? false : collapsed;

    return (
      <div className={`card sidebar-card pt-3 pb-3 px-3 h-full flex flex-col min-h-0 ${className}`}>
        <div className="flex items-center justify-end flex-shrink-0">
          {showCollapse && (
            <button
              type="button"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand' : 'Collapse'}
              onClick={() => {
                try {
                  // Persist, notify, and update local state so the UI reacts immediately
                  const willCollapse = !isCollapsed;
                  localStorage.setItem('gpSidebarCollapsed', willCollapse ? '1' : '0');
                  window.dispatchEvent(new Event('gp:sidebar-changed'));
                  // Immediate local update (no reliance on the event listener)
                  setCollapsed(willCollapse);
                } catch {}
              }}
              className="inline-flex items-center justify-center rounded-lg p-2 border border-[color:var(--card-stroke,rgba(255,255,255,0.12))] hover:bg-white/5 dark:hover:bg-white/10 transition"
            >
              {/* window icon */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-80" aria-hidden>
                <path fill="currentColor" d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 3h14v9H5V8Zm0-2v1h14V6H5Z"/>
              </svg>
            </button>
          )}
        </div>
        <nav className="mt-1 flex-1 overflow-y-auto min-h-0">
        {/* AI Agents — featured at the top */}
        <div className="mb-2 px-1 space-y-1">
          <Link
            href="/agent"
            className={`flex items-center gap-2 rounded-lg py-2.5 transition ${isCollapsed ? 'justify-center px-2' : 'px-3'} ${
              isActive(pathname, '/agent') && !isActive(pathname, '/agent/iterate')
                ? 'bg-[color:var(--gold,theme(colors.brand.gold))]/15 text-[color:var(--gold,theme(colors.brand.gold))]'
                : 'hover:bg-white/5 dark:text-white/90 text-black/80'
            }`}
          >
            <Icon name="agent" className="w-5 h-5 text-[color:var(--gold,theme(colors.brand.gold))] flex-shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium">Campaign Agent</span>
                <span className="text-[10px] opacity-60">Brief once → full campaign</span>
              </div>
            )}
          </Link>
          <Link
            href="/agent/iterate"
            className={`flex items-center gap-2 rounded-lg py-2.5 transition ${isCollapsed ? 'justify-center px-2' : 'px-3'} ${
              isActive(pathname, '/agent/iterate')
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'hover:bg-white/5 dark:text-white/90 text-black/80'
            }`}
          >
            <svg viewBox="0 0 24 24" className={`w-5 h-5 flex-shrink-0 ${isActive(pathname, '/agent/iterate') ? 'text-emerald-400' : 'text-emerald-500'}`}>
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium">Iteration Agent</span>
                <span className="text-[10px] opacity-60">Refine any content</span>
              </div>
            )}
          </Link>
          <Link
            href="/agent/research"
            className={`flex items-center gap-2 rounded-lg py-2.5 transition ${isCollapsed ? 'justify-center px-2' : 'px-3'} ${
              isActive(pathname, '/agent/research')
                ? 'bg-violet-500/15 text-violet-400'
                : 'hover:bg-white/5 dark:text-white/90 text-black/80'
            }`}
          >
            <svg viewBox="0 0 24 24" className={`w-5 h-5 flex-shrink-0 ${isActive(pathname, '/agent/research') ? 'text-violet-400' : 'text-violet-500'}`}>
              <path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5Z"/>
            </svg>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium">Research Agent</span>
                <span className="text-[10px] opacity-60">Keywords, gaps & brief</span>
              </div>
            )}
          </Link>
          <Link
            href="/autopilot"
            className={`flex items-center gap-2 rounded-lg py-2.5 transition ${isCollapsed ? 'justify-center px-2' : 'px-3'} ${
              isActive(pathname, '/autopilot')
                ? 'bg-amber-500/15 text-amber-400'
                : 'hover:bg-white/5 dark:text-white/90 text-black/80'
            }`}
          >
            <svg viewBox="0 0 24 24" className={`w-5 h-5 flex-shrink-0 ${isActive(pathname, '/autopilot') ? 'text-amber-400' : 'text-amber-500'}`}>
              <path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7Z"/>
            </svg>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium">Autopilot</span>
                <span className="text-[10px] opacity-60">Scheduled campaigns</span>
              </div>
            )}
          </Link>
        </div>

        {!isCollapsed && (
          <div className={`mt-3 px-3 text-[11px] uppercase tracking-wide dark:text-white/70 text-black/70 ${isCollapsed ? 'text-center px-0' : ''}`}>AI Studio</div>
        )}
        <ul className="mt-1 space-y-1">
        {creators.map((l) => {
          const isComingSoon = l.status === 'coming_soon';
          if (isComingSoon) {
            return (
              <li key={l.href}>
                <div
                  className={`block rounded-md ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2'} dark:text-white/70 text-black/70 border border-dashed border-white/10 bg-white/0`}
                >
                  <div className="flex items-center gap-2">
                    <Icon name={l.icon} className="w-5 h-5 dark:text-brand-gold text-[#14B8A6]" />
                    {!isCollapsed && (
                      <div className="flex flex-col">
                        <span className="text-sm">{l.label}</span>
                        {l.desc && <span className="text-xs opacity-70">{l.desc}</span>}
                        <span className="text-[10px] uppercase tracking-wide text-brand-muted mt-1">Coming soon</span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          }
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`block rounded-md ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2'} ${
                  active
                    ? 'dark:bg-white/10 dark:text-[color:var(--gold,theme(colors.brand.gold))] bg-black/5 text-[#14B8A6]'
                    : 'dark:text-white/80 text-black/80 hover:text-[#14B8A6] dark:hover:text-[color:var(--gold,theme(colors.brand.gold))] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name={l.icon} className="w-5 h-5 dark:text-brand-gold text-[#14B8A6]" />
                  {!isCollapsed && (
                    <div className="flex flex-col">
                      <span className="text-sm">{l.label}</span>
                      {l.desc && <span className="text-xs opacity-70">{l.desc}</span>}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
        </ul>

        {SHOW_TOOLS && session?.user && (
          <>
            {!isCollapsed && (
              <div className="mt-4 px-3 text-[11px] uppercase tracking-wide dark:text-white/70 text-black/70">Tools</div>
            )}
            <ul className="mt-1 space-y-1">
              {tools.map((l) => {
                const active = isActive(pathname, l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`block rounded-md ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2'} ${
                        active
                          ? 'dark:bg-white/10 dark:text-[color:var(--gold,theme(colors.brand.gold))] bg-black/5 text-[#14B8A6]'
                          : 'dark:text-white/80 text-black/80 hover:text-[#14B8A6] dark:hover:text-[color:var(--gold,theme(colors.brand.gold))] hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                  <div className="flex items-center gap-2">
                        <Icon name={l.icon} className="w-5 h-5 dark:text-brand-gold text-[#14B8A6]" />
                        {!isCollapsed && <span className="text-sm">{l.label}</span>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>
      <div className={`mt-auto pt-3 border-t border-white/8 flex-shrink-0 ${isCollapsed ? 'px-1 text-center' : 'px-3 flex items-center justify-between'}`}>
        {!isCollapsed && <span className="text-xs text-brand-muted">Theme</span>}
        <div className="ml-auto flex justify-center">
          <ThemeToggle />
        </div>
      </div>
      </div>
    );
  };

  return (
    <>
      <aside className={`hidden md:flex ${collapsed ? 'w-16 md:w-16 lg:w-20' : 'w-20 md:w-64 lg:w-72'} shrink-0 h-full transition-[width] duration-200`}>
        <div className="w-full p-3 h-full">
          {renderSidebarContent()}
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className={`md:hidden fixed inset-0 z-40 transition ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute left-0 top-16 bottom-0 w-72 max-w-[82vw] transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="h-full p-3">
            {renderSidebarContent({ forceExpanded: true, showCollapse: false, className: 'shadow-2xl' })}
          </div>
        </div>
      </div>
    </>
  );
}



 
