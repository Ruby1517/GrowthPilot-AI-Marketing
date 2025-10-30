'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { canAccess } from '@/lib/access';
import type { ModuleKey } from '@/lib/modules';
import { moduleLabels } from '@/lib/modules';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  switch (name) {
    case 'home': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="m4 10l8-6l8 6v10a2 2 0 0 1-2 2h-4v-6H10v6H6a2 2 0 0 1-2-2V10Z"/></svg>);
    case 'post': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M5 4h14a1 1 0 0 1 1 1v3H4V5a1 1 0 0 1 1-1Zm-1 7h16v2H4v-2Zm0 4h10v2H4v-2Z"/></svg>);
    case 'clip': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3l4-2.5V18L14 15.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"/></svg>);
    case 'blog': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h12v14a4 4 0 0 1-4 4H6a2 2 0 0 1-2-2V5Zm4 2h8v2H8V7Zm0 4h8v2H8v-2Zm0 4h6v2H8v-2Z"/></svg>);
    case 'ad': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M3 5h18v10H3V5Zm2 2v6h14V7H5Zm-2 12h10v2H3v-2Zm14 0h4v2h-4v-2Z"/></svg>);
    case 'lead': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.015-8 4.5V21h16v-2.5c0-2.485-3.582-4.5-8-4.5Z"/></svg>);
    case 'mail': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 6h16a2 2 0 0 1 2 2v8H2V8a2 2 0 0 1 2-2Zm0 2v.2l8 4.8l8-4.8V8H4Zm0 8h16v2H4v-2Z"/></svg>);
    case 'brand': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M6 3h12a2 2 0 0 1 2 2v8l-8 6l-8-6V5a2 2 0 0 1 2-2Z"/><path fill="currentColor" d="M12 6.5l.9 1.8l2 .3l-1.45 1.4l.35 2l-1.8-.95L10.2 12l.35-2L9.1 8.6l2-.3L12 6.5Z"/></svg>);
    case 'assets': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v9H4V7Zm3 7l2.5-3l2 2.5L14 11l3 3H7Z"/></svg>);
    case 'upload': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M12 3l4 4h-3v6h-2V7H8l4-4ZM4 19h16v2H4v-2Z"/></svg>);
    case 'calendar': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M7 2h2v3H7V2Zm8 0h2v3h-2V2ZM4 6h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm2 4h4v4H6v-4Z"/></svg>);
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
}> = [
  { href: '/postpilot',  label: moduleLabels.postpilot,  desc: 'AI Social Content',           icon: 'post',   module: 'postpilot' },
  { href: '/clips',      label: moduleLabels.clippilot,  desc: 'Video/Shorts Creator',        icon: 'clip',   module: 'clippilot' },
  { href: '/blogpilot',  label: moduleLabels.blogpilot,  desc: 'SEO Blog Writer',             icon: 'blog',   module: 'blogpilot' },
  { href: '/adpilot',    label: moduleLabels.adpilot,    desc: 'Ads Optimizer',               icon: 'ad',     module: 'adpilot' },
  { href: '/leadpilot',  label: moduleLabels.leadpilot,  desc: 'Lead Gen Chatbot',            icon: 'lead',   module: 'leadpilot' },
  { href: '/mailpilot',  label: moduleLabels.mailpilot,  desc: 'Email Campaigns',             icon: 'mail',   module: 'mailpilot' },
  { href: '/brandpilot', label: moduleLabels.brandpilot, desc: 'Brand & Design Kit',          icon: 'brand',  module: 'brandpilot' }, 
  { href: '/viralpilot', label: moduleLabels.viralpilot, desc: 'YouTube Content Creation',    icon: 'youtube',module: 'viralpilot' },
];

// Tools menu toggle (client env): set NEXT_PUBLIC_SHOW_TOOLS=false to hide
const SHOW_TOOLS = process.env.NEXT_PUBLIC_SHOW_TOOLS !== 'false';
export const tools = [
  { href: '/assets',   label: 'Assets',   icon: 'assets' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar' },
];

export default function StudioSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [plan, setPlan] = useState<('Trial'|'Starter'|'Pro'|'Business') | null>(null);
  const [myRole, setMyRole] = useState<'owner'|'admin'|'member'|'viewer'|'unknown'>('unknown');
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPlan() {
      try {
        setLoadingPlan(true);
        const r = await fetch('/api/org/settings', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        const eff = (j.effectivePlan as any) || (j.plan as any);
        if (!cancelled) { setPlan(eff as any); setMyRole((j.myRole as any) || 'member'); }
      } finally {
        if (!cancelled) setLoadingPlan(false);
      }
    }
    loadPlan();
    return () => { cancelled = true };
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem('gpSidebarCollapsed');
      setCollapsed(v === '1');
    } catch {}
    function onChanged() {
      try {
        const v = localStorage.getItem('gpSidebarCollapsed');
        setCollapsed(v === '1');
      } catch {}
    }
    window.addEventListener('gp:sidebar-changed', onChanged);
    return () => window.removeEventListener('gp:sidebar-changed', onChanged);
  }, []);

  // Hide sidebar entirely until the user is authenticated
  if (!session?.user) return null;

  return (
    <aside className={`hidden md:flex ${collapsed ? 'md:w-16 lg:w-20' : 'md:w-64 lg:w-72'} shrink-0 mt-3 transition-[width] duration-200`}>
      <div className="w-full p-3">
        <div className="card sidebar-card pt-3 pb-8 px-3">
          <div className="flex items-center justify-end">
            <button
              type="button"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand' : 'Collapse'}
              onClick={() => {
                try {
                  const next = collapsed ? '0' : '1';
                  localStorage.setItem('gpSidebarCollapsed', next);
                  window.dispatchEvent(new Event('gp:sidebar-changed'));
                } catch {}
              }}
              className="inline-flex items-center justify-center rounded-lg p-2 border border-[color:var(--card-stroke,rgba(255,255,255,0.12))] hover:bg-white/5 dark:hover:bg-white/10 transition"
            >
              {/* window icon */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-80" aria-hidden>
                <path fill="currentColor" d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 3h14v9H5V8Zm0-2v1h14V6H5Z"/>
              </svg>
            </button>
          </div>
          <nav className="mt-1">
          {!collapsed && (
            <div className={`mt-3 px-3 text-[11px] uppercase tracking-wide dark:text-white/70 text-black/70 ${collapsed ? 'text-center px-0' : ''}`}>AI Studio</div>
          )}
          {!collapsed && (
            <ul className="mt-1 space-y-1">
            {creators.map((l) => {
              const active = isActive(pathname, l.href);
              const rawRole = myRole || ((session?.user as any)?.role as string | undefined);
              const ignoreAdmin = process.env.NEXT_PUBLIC_DISABLE_ADMIN_GATE === 'true';
              const userRole = ignoreAdmin ? undefined : rawRole;
              const isAuthed = Boolean(session?.user);
              const userPlanForGate = (isAuthed ? (plan ?? 'Starter') : null) as any;
              const hasAccess = canAccess({ userPlan: userPlanForGate, module: l.module, userRole });
              if (hasAccess) {
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`block rounded-md ${collapsed ? 'px-2 py-2' : 'px-3 py-2'} ${
                        active
                          ? 'dark:bg-white/10 dark:text-[color:var(--gold,theme(colors.brand.gold))] bg-black/5 text-[#14B8A6]'
                          : 'dark:text-white/80 text-black/80 hover:text-[#14B8A6] dark:hover:text-[color:var(--gold,theme(colors.brand.gold))] hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
                        <Icon name={l.icon} className="w-5 h-5 dark:text-brand-gold text-[#14B8A6]" />
                        {!collapsed && (
                          <div className="flex flex-col">
                            <span className="text-sm">{l.label}</span>
                            {l.desc && <span className="text-xs opacity-70">{l.desc}</span>}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              }
              return (
                <li key={l.href}>
                  <div
                    className={`block rounded-md ${collapsed ? 'px-2 py-2' : 'px-3 py-2'} dark:text-white/70 text-black/70 bg-white/0 border border-transparent hover:border-black/10 dark:hover:border-white/10`}
                  >
                    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
                      <Icon name={l.icon} className="w-5 h-5 dark:text-brand-gold text-[#14B8A6]" />
                      {!collapsed && (
                        <div className="flex flex-col">
                          <span className="text-sm">{l.label}</span>
                          {l.desc && <span className="text-xs opacity-70">{l.desc}</span>}
                        </div>
                      )}
                      {!collapsed && (
                        <div className="ml-auto">
                          <Link href="/billing" className="btn-ghost text-xs py-1 px-2">Upgrade</Link>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
            </ul>
          )}

          {SHOW_TOOLS && !collapsed && (
            <>
              <div className="mt-4 px-3 text-[11px] uppercase tracking-wide dark:text-white/70 text-black/70">Tools</div>
              <ul className="mt-1 space-y-1">
                {tools.map((l) => {
                  const active = isActive(pathname, l.href);
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className={`block rounded-md px-3 py-2 ${
                          active
                            ? 'dark:bg-white/10 dark:text-[color:var(--gold,theme(colors.brand.gold))] bg-black/5 text-[#14B8A6]'
                            : 'dark:text-white/80 text-black/80 hover:text-[#14B8A6] dark:hover:text-[color:var(--gold,theme(colors.brand.gold))] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon name={l.icon} className="w-5 h-5 dark:text-brand-gold text-[#14B8A6]" />
                          <span className="text-sm">{l.label}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>
        </div>
      </div>
    </aside>
  );
}



 
