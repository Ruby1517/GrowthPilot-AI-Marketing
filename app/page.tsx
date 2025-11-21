"use client";
import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { ModuleKey, ModuleStatus } from '@/lib/modules';
import { moduleStatus } from '@/lib/modules';

const WAITLIST_EMAIL = process.env.NEXT_PUBLIC_WAITLIST_EMAIL || 'hello@growthpilot.ai';

type ModuleInfo = {
  key: ModuleKey;
  t: string;
  d: string;
  icon: string;
  href: string;
  img: string;
  points: string[];
  status: ModuleStatus;
  response?: string;
};

const moduleConfigs: ModuleInfo[] = [
  { key: 'postpilot', t: 'PostPilot', d: 'AI Social Content Generator', icon: 'post', href: '/postpilot', img: '/images/modules/postpilot.svg',
    points: ['Generate posts across platforms', 'On-brand tone controls', 'Schedule + track performance'], status: moduleStatus.postpilot, response: '2.4s avg output' },
  { key: 'clippilot', t: 'ClipPilot', d: 'AI Video/Shorts Creator', icon: 'clip', href: '/clippilot', img: '/images/modules/clippilot.svg',
    points: ['Trim to shorts fast', 'Auto captions + resize', 'Templates for Reels/TikTok'], status: moduleStatus.clippilot, response: 'Queued for relaunch' },
  { key: 'blogpilot', t: 'BlogPilot', d: 'AI SEO Writer', icon: 'blog', href: '/blogpilot', img: '/images/modules/blogpilot.svg',
    points: ['SEO briefs to drafts', 'Optimizes for keywords', 'Images and headings ready'], status: moduleStatus.blogpilot, response: '3.1s outline + draft' },
  { key: 'adpilot', t: 'AdPilot', d: 'AI Ads Optimizer', icon: 'ad', href: '/adpilot', img: '/images/modules/adpilot.svg',
    points: ['Generate ad variants', 'Iterate with scoring', 'Export to major platforms'], status: moduleStatus.adpilot, response: '1.1s multi-variant' },
  { key: 'leadpilot', t: 'LeadPilot', d: 'AI Chatbot for Leads', icon: 'lead', href: '/leadpilot', img: '/images/modules/leadpilot.svg',
    points: ['Qualify leads instantly', 'Route and capture context', 'CRM-friendly transcripts'], status: moduleStatus.leadpilot, response: 'Live concierge handoff' },
  { key: 'mailpilot', t: 'MailPilot', d: 'AI Email Writer', icon: 'mail', href: '/mailpilot', img: '/images/modules/mailpilot.svg',
    points: ['Subject + body + sequences', 'Personalize at scale', 'ESP-ready output'], status: moduleStatus.mailpilot, response: '3.6s per sequence' },
  { key: 'brandpilot', t: 'BrandPilot', d: 'AI Design/Branding Assistant', icon: 'brand', href: '/brandpilot', img: '/images/modules/brandpilot.svg',
    points: ['Logos, colors, fonts kit', 'Guidelines and templates', 'On-brand assets quickly'], status: moduleStatus.brandpilot, response: 'Live style system' },
  { key: 'viralpilot', t: 'ViralPilot', d: 'YouTube Content Creation', icon: 'youtube', href: '/viralpilot', img: '/images/modules/viralpilot.svg',
    points: ['Ideas → script → TTS', 'Auto B-roll + captions', 'Render shorts quickly'], status: moduleStatus.viralpilot, response: 'In QA' },
];

const statHighlights = [
  { label: 'Teams onboarded', value: '280+', detail: 'From SaaS to eCom' },
  { label: 'Avg. hours saved', value: '12h/wk', detail: 'per marketer' },
  { label: 'Campaigns shipped', value: '4.2k', detail: 'last 90 days' },
  { label: 'NPS', value: '67', detail: 'Loved by operators' },
] as const;

const featureHighlights = [
  { title: 'Campaign Brain', desc: 'Brief once, reuse across posts, blogs, ads, email, and lead funnels. Every module syncs context instantly.', metric: '1 brief → 6 outputs' },
  { title: 'Brand-safe automation', desc: 'BrandPilot keeps logos, typography, colors, and guardrails synchronized so every asset ships on-brand.', metric: '99.2% on-brand' },
  { title: 'Usage guardrails', desc: 'Usage metering, approvals, and alerts keep spend predictable even when AI is running 24/7.', metric: 'No surprise overages' },
  { title: 'Collaboration built-in', desc: 'Roles, comments, and shared analytics keep marketing + creative on the same page.', metric: '+43% faster approvals' },
] as const;

const workflowSteps = [
  { title: '1. Brief once', desc: 'Drop a URL, product launch doc, or keywords. GrowthPilot ingests everything plus your BrandPilot kit.', items: ['Starter brief + target audience', 'Brand assets + offers synced'] },
  { title: '2. Generate everywhere', desc: 'PostPilot, BlogPilot, AdPilot, MailPilot, and LeadPilot stay in lockstep so stories match across channels.', items: ['Shared tone + hook variations', 'Usage analytics per module'] },
  { title: '3. Review & launch', desc: 'Send to your ESP, CMS, ad manager, or CRM knowing every asset uses the same source of truth.', items: ['One-click exports & webhooks', 'Audit trail + approvals'] },
] as const;

const testimonialQuotes = [
  { quote: 'GrowthPilot replaced five point solutions for us. The shared brief + brand kit means our paid, lifecycle, and social teams finally sound the same.', name: 'Diana Chen', role: 'VP Growth @ Brightly', metric: '+42% content throughput' },
  { quote: 'We ship twice as many campaigns with a three-person team. Usage guardrails and billing transparency make finance happy too.', name: 'Marcus Lee', role: 'Head of Marketing @ Launchpad', metric: '8 hrs/week saved' },
  { quote: 'BrandPilot keeps every render perfectly on-brand. Designers set the system once and the team reuses it everywhere.', name: 'Hannah Ortiz', role: 'Creative Lead @ Tala', metric: 'Brand kit synced automatically' },
] as const;

const waitlistHrefFor = (moduleName: string) => `mailto:${WAITLIST_EMAIL}?subject=${encodeURIComponent(`${moduleName} waitlist`)}`;

function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  switch (name) {
    case 'post': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M5 4h14a1 1 0 0 1 1 1v3H4V5a1 1 0 0 1 1-1Zm-1 7h16v2H4v-2Zm0 4h10v2H4v-2Z"/></svg>);
    case 'clip': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3l4-2.5V18L14 15.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"/></svg>);
    case 'blog': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h12v14a4 4 0 0 1-4 4H6a2 2 0 0 1-2-2V5Zm4 2h8v2H8V7Zm0 4h8v2H8v-2Zm0 4h6v2H8v-2Z"/></svg>);
    case 'ad': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M3 5h18v10H3V5Zm2 2v6h14V7H5Zm-2 12h10v2H3v-2Zm14 0h4v2h-4v-2Z"/></svg>);
    case 'lead': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.015-8 4.5V21h16v-2.5c0-2.485-3.582-4.5-8-4.5Z"/></svg>);
    case 'mail': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M4 6h16a2 2 0 0 1 2 2v8H2V8a2 2 0 0 1 2-2Zm0 2v.2l8 4.8l8-4.8V8H4Zm0 8h16v2H4v-2Z"/></svg>);
    case 'brand': return (<svg viewBox="0 0 24 24" className={className}><path fill="currentColor" d="M6 3h12a2 2 0 0 1 2 2v8l-8 6l-8-6V5a2 2 0 0 1 2-2Z"/><path fill="currentColor" d="M12 6.5l.9 1.8l2 .3l-1.45 1.4l.35 2l-1.8-.95L10.2 12l.35-2L9.1 8.6l2-.3L12 6.5Z"/></svg>);
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M10 15l5.19-3L10 9v6Zm12-3c0 0-0.02-2.04-.26-3.02a3.04 3.04 0 0 0-2.14-2.14C18.61 6.5 12 6.5 12 6.5s-6.61 0-7.6.24A3.04 3.04 0 0 0 2.26 8.88C2.02 9.86 2 11.9 2 11.9s.02 2.04.26 3.02a3.04 3.04 0 0 0 2.14 2.14c.99.24 7.6.24 7.6.24s6.61 0 7.6-.24a3.04 3.04 0 0 0 2.14-2.14c.24-.98.26-3.02.26-3.02Z" />
        </svg>
      );
    default: return null;
  }
}

export default function Home() {
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);
  const [demoMap, setDemoMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        const r = await fetch(`${base}/api/modules/demo`, { cache: 'no-store', signal: ctrl.signal });
        if (!r.ok) return;
        const j = await r.json().catch(() => ({ items: [] }));
        const map: Record<string, string> = {};
        for (const it of (Array.isArray(j.items) ? j.items : [])) {
          const url = it.url || (it.key ? `/api/assets/view?key=${encodeURIComponent(it.key)}` : '');
          if (it.module && url) map[it.module] = url;
        }
        setDemoMap(map);
      } catch (_) {
        // ignore failures
      }
    }, 0);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, []);

  return (
    <section className="space-y-16 md:space-y-24 relative overflow-hidden">
      <div className="relative z-10 space-y-16 md:space-y-24">
        <Script id="ld-home" type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'GrowthPilot',
            url: typeof window !== 'undefined' ? window.location.origin : 'https://growthpilot.ai',
            potentialAction: {
              '@type': 'SearchAction',
              target: `${typeof window !== 'undefined' ? window.location.origin : 'https://growthpilot.ai'}/?q={search_term_string}`,
              'query-input': 'required name=search_term_string'
            }
          }) }}
        />
        <LandingHero items={moduleConfigs} demoMap={demoMap} isAuthed={isAuthed} />
        <StatsStrip />
        <ModulesShowcase modules={moduleConfigs} demoMap={demoMap} isAuthed={isAuthed} />
        <FeatureHighlights />
        <WorkflowSection />
        <TestimonialsSection />
        <CallToAction isAuthed={isAuthed} />
      </div>
      <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden>
        <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-sky-500/30 blur-[140px]" />
        <div className="absolute right-0 bottom-0 h-[420px] w-[420px] rounded-full bg-[color:var(--gold,theme(colors.brand.gold))]/20 blur-[160px]" />
      </div>
    </section>
  );
}

function HeroSlider({ items, demoMap, className }: { items: ModuleInfo[]; demoMap: Record<string, string>; className?: string }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const heroCount = items.length;

  useEffect(() => {
    if (heroCount <= 1) return;
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % heroCount), 5000);
    return () => clearInterval(id);
  }, [heroCount]);

  const outerClass = `mt-8 md:mt-12 w-screen max-w-none px-0 relative left-1/2 -translate-x-1/2 ${className ?? ''}`;

  return (
    <div className={outerClass.trim()}>
      <div className="relative overflow-hidden bg-[#01030b] text-white backdrop-blur-xl">
        <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden>
          <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-sky-500/30 blur-[140px]" />
          <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[color:var(--gold,theme(colors.brand.gold))]/20 blur-[120px]" />
        </div>
        <div className="relative flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${heroIdx * 100}%)` }}>
          {items.map((m, i) => (
            <div key={m.key} className="min-w-full shrink-0">
              <SlidePanel module={m} demoMap={demoMap} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        {items.map((m, i) => (
          <button
            key={m.key}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setHeroIdx(i)}
            className={`h-1.5 rounded-full transition-all ${heroIdx === i ? 'w-8 bg-white' : 'w-2 bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

function LandingHero({ items, demoMap, isAuthed }: { items: ModuleInfo[]; demoMap: Record<string, string>; isAuthed: boolean }) {
  const chips = [
    { icon: 'post', label: 'AI Social Content' },
    { icon: 'blog', label: 'SEO Blog Writer' },
    { icon: 'ad', label: 'Ads Optimizer' },
    { icon: 'lead', label: 'Lead Gen Chatbot' },
    { icon: 'mail', label: 'Email Writer' },
    { icon: 'brand', label: 'Brand & Design Kit' },
    { icon: 'youtube', label: 'YouTube Creation' },
  ] as const;

  return (
    <div className="relative">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
          Supercharge Your <span className="text-[color:var(--gold,theme(colors.brand.gold))]">Marketing</span> with AI
        </h1>
        <p className="mt-3 md:mt-4 text-base md:text-lg text-brand-muted">
          All‑in‑one AI Marketing Automation Platform
        </p>
      </div>

      <HeroSlider items={items} demoMap={demoMap} />

      <div className="mt-6 md:mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
        {chips.map((c, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 bg-transparent border border-transparent dark:border-white/10 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition">
            <Icon name={c.icon} className="w-4 h-4 text-[color:var(--gold,theme(colors.brand.gold))]" />
            <span className="text-sm">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 md:mt-10 flex items-center justify-center gap-3">
        <Link href={isAuthed ? '/dashboard' : '/api/auth/signin'} className="btn-gold">
          {isAuthed ? 'Open AI Studio' : 'Launch modules'}
        </Link>
        <Link href={isAuthed ? '/postpilot' : '/billing'} className="btn-ghost">
          {isAuthed ? 'Explore Modules' : 'View Plans'}
        </Link>
      </div>
    </div>
  );
}

function SlidePanel({ module, demoMap }: { module: ModuleInfo; demoMap: Record<string, string> }) {
  const details = module.points?.length ? module.points : [module.d];
  const isComingSoon = module.status === 'coming_soon';

  return (
    <div className="relative mx-auto max-w-6xl px-4 md:px-10 py-8">
      <div className="relative overflow-hidden rounded-[36px] border border-white/15 bg-white/5 text-white backdrop-blur-2xl shadow-[0_30px_80px_rgba(2,8,23,0.65)]">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -left-10 top-0 h-56 w-56 rounded-full bg-sky-500/30 blur-[140px]" />
          <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[color:var(--gold,theme(colors.brand.gold))]/25 blur-[180px]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="relative grid items-center gap-6 lg:gap-10 md:grid-cols-[1.2fr_0.8fr] p-6 md:p-12">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide backdrop-blur">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <Icon name={module.icon} className="h-3.5 w-3.5 text-[color:var(--gold,theme(colors.brand.gold))]" />
              </span>
              {module.t}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] tracking-wide ${isComingSoon ? 'bg-white/0 border border-white/30' : 'bg-emerald-400/20 text-emerald-200'}`}>
                {isComingSoon ? 'Coming Soon' : 'Live'}
              </span>
            </div>
            <div className="rounded-[30px] border border-white/20 bg-gradient-to-br from-white/15 via-white/5 to-transparent p-5 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 text-white/80 text-xs md:text-sm">
                <div>
                  <p className="uppercase tracking-[0.2em] text-[10px] text-white/60">Realtime Console</p>
                  <h3 className="text-xl md:text-3xl font-semibold">{module.t} Control</h3>
                </div>
                {!isComingSoon && (
                  <div className="text-xs text-white/70">Shared brief ready</div>
                )}
              </div>
              <div className="mt-4 grid gap-3 text-sm text-white/80">
                {details.slice(0, 3).map((text, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/5 px-3 py-2">
                    <span>{text}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                      {idx === 0 ? 'Deployed' : idx === 1 ? 'Auto' : 'Ready'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {isComingSoon ? (
                  <a
                    href={waitlistHrefFor(module.t)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-xs md:text-sm font-medium text-white/80 hover:text-white"
                  >
                    Join Waitlist
                  </a>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { const url = demoMap[module.key]; if (url) window.open(url, '_blank'); else alert('Demo coming soon'); }}
                      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold,theme(colors.brand.gold))] px-5 py-2 text-xs md:text-sm font-semibold text-black shadow-[0_15px_35px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5"
                    >
                      Watch Demo
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                        <path fill="currentColor" d="M5 12h12.17l-4.58-4.59L14 6l7 6l-7 6l-1.41-1.41L17.17 13H5z" />
                      </svg>
                    </button>
                    <Link href={module.href} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-xs md:text-sm font-medium text-white/80 hover:text-white">
                      Explore Module
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                        <path fill="currentColor" d="M7 12l5-5v3h4v4h-4v3z" />
                      </svg>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-[32px] border border-white/20 bg-white/10 p-5 md:p-6 backdrop-blur">
              <div className="flex flex-wrap items-center justify-end gap-3 text-white/70 text-xs md:text-sm">
                <div className="text-right">
                  <p className="uppercase tracking-[0.25em] text-[10px] text-white/50">Status</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{module.response || 'Realtime'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { const url = demoMap[module.key]; if (url) window.open(url, '_blank'); else alert('Demo coming soon'); }}
                className="group relative mt-5 w-full overflow-hidden rounded-[30px] border border-white/30 bg-black/60 aspect-[16/9] flex items-center justify-center"
                aria-label={`Open ${module.t} demo`}
              >
                {module.img ? (
                  <img src={module.img} alt={`${module.t} image`} className="h-full w-full object-contain p-6 transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="text-sm text-white/70">No preview</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition" aria-hidden />
                <svg viewBox="0 0 24 24" className="absolute w-12 h-12 text-white opacity-90 drop-shadow-lg transition group-hover:scale-110" aria-hidden>
                  <path fill="currentColor" d="M10 15l5.19-3L10 9v6Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsStrip() {
  return (
    <section className="card p-6 md:p-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {statHighlights.map((stat) => (
          <div key={stat.label}>
            <div className="text-2xl md:text-3xl font-semibold">{stat.value}</div>
            <div className="text-sm text-brand-muted">{stat.label}</div>
            <div className="text-xs text-brand-muted mt-1">{stat.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModulesShowcase({ modules, demoMap, isAuthed }: { modules: ModuleInfo[]; demoMap: Record<string, string>; isAuthed: boolean }) {
  const ordered = [...modules].sort((a, b) => (a.status === 'coming_soon' ? 1 : 0) - (b.status === 'coming_soon' ? 1 : 0));
  return (
    <section className="space-y-6" id="modules">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-semibold">Your entire marketing team, inside one login</h2>
        <p className="text-brand-muted">Six modules are production-ready today; ClipPilot and ViralPilot are polishing for relaunch.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {ordered.map((module) => {
          const isComingSoon = module.status === 'coming_soon';
          return (
            <div key={module.key} className="card p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <Icon name={module.icon} className="w-6 h-6 text-[color:var(--gold,theme(colors.brand.gold))]" />
                  </span>
                  <div>
                    <div className="text-lg font-semibold">{module.t}</div>
                    <div className="text-sm text-brand-muted">{module.d}</div>
                  </div>
                </div>
                <span className={`text-xs uppercase tracking-wide px-2 py-1 rounded-full ${isComingSoon ? 'bg-white/0 border border-white/10' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {isComingSoon ? 'Coming Soon' : 'Live'}
                </span>
              </div>
              <ul className="text-sm text-brand-muted space-y-2">
                {module.points.slice(0, 3).map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[color:var(--gold,theme(colors.brand.gold))]" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-3">
                {isComingSoon ? (
                  <a href={waitlistHrefFor(module.t)} className="btn-ghost text-sm">
                    Join waitlist
                  </a>
                ) : (
                  <>
                    <Link href={isAuthed ? module.href : '/api/auth/signin'} className="btn-gold text-sm">
                      Launch {module.t}
                    </Link>
                    <button
                      type="button"
                      className="btn-ghost text-sm"
                      onClick={() => {
                        if (!isAuthed) {
                          window.location.href = '/api/auth/signin';
                          return;
                        }
                        const url = demoMap[module.key];
                        if (url) window.open(url, '_blank');
                        else alert('Demo coming soon');
                      }}
                    >
                      Watch demo
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FeatureHighlights() {
  return (
    <section className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-semibold">Built for ambitious growth teams</h2>
        <p className="text-brand-muted">Everything shares the same brain, billing, analytics, and approvals.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {featureHighlights.map((feature) => (
          <div key={feature.title} className="card p-5 flex flex-col gap-3">
            <div className="text-sm uppercase tracking-wide text-brand-muted">{feature.metric}</div>
            <div className="text-xl font-semibold">{feature.title}</div>
            <p className="text-sm text-brand-muted">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="card p-6 md:p-8 space-y-6">
      <div>
        <span className="badge mb-3">Workflow</span>
        <h2 className="text-2xl md:text-3xl font-semibold">Launch-ready workflows in three steps</h2>
        <p className="text-brand-muted mt-2">One brief powers every module, then analytics keep score.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {workflowSteps.map((step) => (
          <div key={step.title} className="rounded-2xl border border-white/10 p-4">
            <div className="text-sm font-semibold">{step.title}</div>
            <p className="text-sm text-brand-muted mt-1">{step.desc}</p>
            <ul className="mt-3 space-y-2 text-sm text-brand-muted">
              {step.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[color:var(--gold,theme(colors.brand.gold))]" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-semibold">Loved by modern marketing teams</h2>
        <p className="text-brand-muted">Less thrash, more launches, happier stakeholders.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {testimonialQuotes.map((t) => (
          <figure key={t.name} className="card p-5 flex flex-col gap-3">
            <blockquote className="text-sm text-brand-muted leading-relaxed">“{t.quote}”</blockquote>
            <div>
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-brand-muted">{t.role}</div>
            </div>
            <div className="text-xs uppercase tracking-wide text-brand-muted">{t.metric}</div>
          </figure>
        ))}
      </div>
    </section>
  );
}

function CallToAction({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="card p-8 md:p-12 text-center space-y-4">
      <span className="badge">Launch</span>
      <h2 className="text-3xl font-semibold">Ready to ship your next campaign?</h2>
      <p className="text-brand-muted text-sm md:text-base max-w-2xl mx-auto">
        Spin up social content, SEO blogs, ads, lifecycle email, lead chatbots, and brand assets without switching tabs. ClipPilot and ViralPilot return soon—everything else is production ready today.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link href={isAuthed ? '/dashboard' : '/api/auth/signin'} className="btn-gold">
          {isAuthed ? 'Back to dashboard' : 'Start free'}
        </Link>
        <Link href="/billing" className="btn-ghost">
          See plans
        </Link>
      </div>
    </section>
  );
}
