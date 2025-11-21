'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { creators, tools } from './StudioSidebar';
import { canAccess } from '@/lib/access';

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
    case 'youtube': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M10 15l5.19-3L10 9v6Zm12-3c0 0-0.02-2.04-.26-3.02a3.04 3.04 0 0 0-2.14-2.14C18.61 6.5 12 6.5 12 6.5s-6.61 0-7.6.24A3.04 3.04 0 0 0 2.26 8.88C2.02 9.86 2 11.9 2 11.9s.02 2.04.26 3.02a3.04 3.04 0 0 0 2.14 2.14c.99.24 7.6.24 7.6.24s6.61 0 7.6-.24a3.04 3.04 0 0 0 2.14-2.14c.24-.98.26-3.02.26-3.02Z"/></svg>);
    default: return null;
  }
}

export default function StudioMobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [plan, setPlan] = useState<('Trial'|'Starter'|'Pro'|'Business') | null>(null);
  const [myRole, setMyRole] = useState<'owner'|'admin'|'member'|'viewer'|'unknown'>('unknown');

  useEffect(() => {
    let cancelled = false;
    async function loadPlan() {
      try {
        const r = await fetch('/api/org/settings', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        const eff = (j.effectivePlan as any) || (j.plan as any);
        if (!cancelled) { setPlan(eff as any); setMyRole((j.myRole as any) || 'member'); }
      } catch {}
    }
    if (session?.user) loadPlan();
    return () => { cancelled = true };
  }, [session?.user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="absolute left-0 top-0 h-full w-[85%] max-w-xs bg-[color:var(--card-bg,rgba(0,0,0,0.85))] backdrop-blur-md border-r border-white/10 p-3">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="text-sm font-semibold">AI Studio</div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-brand-muted hover:text-white hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M18.3 5.7L12 12l6.3 6.3l-1.4 1.4L10.6 13.4L4.3 19.7L2.9 18.3L9.2 12L2.9 5.7L4.3 4.3l6.3 6.3l6.3-6.3z"/></svg>
          </button>
        </div>
        <div className="mt-3">
          <div className="px-2 text-[11px] uppercase tracking-wide dark:text-white/70 text-black/70">Creators</div>
          <ul className="mt-1 space-y-1">
            {creators.map((l) => {
              const comingSoon = l.status === 'coming_soon';
              if (comingSoon) {
                return (
                  <li key={l.href}>
                    <div className="block rounded-md px-3 py-2 border border-dashed border-white/10 dark:text-white/70 text-black/70">
                      <div className="flex items-start gap-2">
                        <Icon name={(l as any).icon} className="w-4 h-4 mt-0.5 dark:text-brand-gold text-[#14B8A6]" />
                        <div>
                          <div className="text-sm">{(l as any).label}</div>
                          {(l as any).desc && <div className="text-xs opacity-70">{(l as any).desc}</div>}
                          <div className="text-[10px] uppercase tracking-wide text-brand-muted mt-1">Coming soon</div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              }
              const active = isActive(pathname, l.href);
              const rawRole = myRole || ((session?.user as any)?.role as string | undefined);
              const ignoreAdmin = process.env.NEXT_PUBLIC_DISABLE_ADMIN_GATE === 'true';
              const userRole = ignoreAdmin ? undefined : rawRole;
              const isAuthed = Boolean(session?.user);
              const userPlanForGate = (isAuthed ? (plan ?? 'Trial') : null) as any;
              const hasAccess = canAccess({ userPlan: userPlanForGate, module: l.module, userRole });
              if (hasAccess) {
                return (
                  <li key={l.href}>
                    <Link href={l.href} onClick={onClose} className={`block rounded-md px-3 py-2 ${active ? 'dark:bg-white/10 dark:text-[color:var(--gold,theme(colors.brand.gold))] bg-black/5 text-[#14B8A6]' : 'dark:text-white/80 text-black/80 hover:text-[#14B8A6] dark:hover:text-[color:var(--gold,theme(colors.brand.gold))] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                      <div className="flex items-start gap-2">
                        <Icon name={(l as any).icon} className="w-4 h-4 mt-0.5 dark:text-brand-gold text-[#14B8A6]" />
                        <div>
                          <div className="text-sm">{(l as any).label}</div>
                          {(l as any).desc && <div className="text-xs opacity-70">{(l as any).desc}</div>}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              }
              return (
                <li key={l.href}>
                  <div className="block rounded-md px-3 py-2 dark:text-white/70 text-black/70 bg-white/0 border border-transparent hover:border-black/10 dark:hover:border-white/10">
                    <div className="flex items-start gap-2">
                      <Icon name={(l as any).icon} className="w-4 h-4 mt-0.5 dark:text-brand-gold text-[#14B8A6]" />
                      <div className="flex flex-col">
                        <span className="text-sm">{(l as any).label}</span>
                        {(l as any).desc && <div className="text-xs opacity-70">{(l as any).desc}</div>}
                        <Link href="/billing" onClick={onClose} className="text-xs underline mt-1">Upgrade plan</Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 px-2 text-[11px] uppercase tracking-wide dark:text-white/70 text-black/70">Tools</div>
          <ul className="mt-1 space-y-1">
            {tools.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link href={l.href} onClick={onClose} className={`block rounded-md px-3 py-2 ${active ? 'dark:bg-white/10 dark:text-[color:var(--gold,theme(colors.brand.gold))] bg-black/5 text-[#14B8A6]' : 'dark:text-white/80 text-black/80 hover:text-[#14B8A6] dark:hover:text-[color:var(--gold,theme(colors.brand.gold))] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    <div className="flex items-center gap-2">
                      <Icon name={(l as any).icon} className="w-4 h-4 dark:text-brand-gold text-[#14B8A6]" />
                      <span className="text-sm">{(l as any).label}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
