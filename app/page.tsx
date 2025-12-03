"use client";
import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { canAccess } from '@/lib/access';
import type { ModuleKey, ModuleStatus, Plan } from '@/lib/modules';
import { modulePlan, moduleStatus } from '@/lib/modules';

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
  { key: 'clippilot', t: 'ClipPilot', d: 'Viral-ready Shorts from Long Videos', icon: 'clip', href: '/clippilot', img: '/images/modules/clippilot.svg',
    points: ['Smart scene detection + hooks', 'Auto captions, zoom/punch, music', 'Exports for TikTok, Reels, Shorts'], status: moduleStatus.clippilot, response: 'Live for shorts' },
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
  const { data: session, status } = useSession();
  const isAuthed = Boolean(session?.user);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (status !== 'authenticated') {
      setPlan(null);
      setRole(null);
      setPlanLoading(false);
      return;
    }
    async function load() {
      try {
        setPlanLoading(true);
        const r = await fetch('/api/org/settings', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) {
          const eff = (j.effectivePlan as Plan) || (j.plan as Plan) || 'Trial';
          setPlan(eff);
          setRole((j.myRole as any) || null);
        }
      } finally {
        if (!cancelled) setPlanLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [status]);

  const userPlanForGate: Plan | null = isAuthed ? (plan ?? 'Trial') : null;

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
        <LandingHero isAuthed={isAuthed} />
        <StatsStrip />
        <ModulesShowcase modules={moduleConfigs} isAuthed={isAuthed} userPlan={userPlanForGate} userRole={role ?? undefined} planLoading={planLoading} />
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

function LandingHero({ isAuthed }: { isAuthed: boolean }) {
  const chips = [
    { icon: 'post', label: 'Social, blogs, ads, email' },
    { icon: 'lead', label: 'Lead capture + concierge' },
    { icon: 'clip', label: 'Short-form video ready' },
    { icon: 'brand', label: 'Brand kits shared' },
  ];

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

      {/* Simplified hero card (full slider saved in components/HeroSlider.tsx for later) */}
      <div className="mt-8 md:mt-12 grid gap-4 lg:grid-cols-[2fr_1.2fr] items-stretch">
        <div className="rounded-3xl border border-white/10 bg-white/70 dark:bg-white/5 dark:border-white/15 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-muted">
            <span className="badge">GrowthPilot</span>
            <span className="text-emerald-600 dark:text-emerald-300">Live modules</span>
          </div>
          <h3 className="mt-3 text-2xl md:text-3xl font-semibold">Unified AI console for every channel</h3>
          <p className="mt-2 text-sm md:text-base text-brand-muted">
            Brief once, reuse everywhere: social, blogs, ads, email, lead capture, and branding stay in sync.
          </p>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 dark:border-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-brand-muted">Ready today</div>
              <ul className="mt-2 space-y-2 text-sm">
                <li>• PostPilot, BlogPilot, AdPilot, MailPilot</li>
                <li>• LeadPilot with live concierge handoff</li>
                <li>• ClipPilot ready for shorts</li>
                <li>• BrandPilot kits shared across modules</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/80 dark:bg-white/5 dark:border-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-brand-muted">What you get</div>
              <ul className="mt-2 space-y-2 text-sm">
                <li>• Hooks, CTAs, scripts, and prompts per channel</li>
                <li>• Signed asset storage + exports (CSV, PNG, PDF)</li>
                <li>• Guardrails: tone, banned words, approvals</li>
              </ul>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={isAuthed ? '/dashboard' : '/api/auth/signin'} className="btn-gold">
              {isAuthed ? 'Open AI Studio' : 'Start free'}
            </Link>
            <Link href={isAuthed ? '/postpilot' : '/billing'} className="btn-ghost">
              {isAuthed ? 'Explore modules' : 'View plans'}
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/70 dark:bg-white/5 dark:border-white/15 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.18)] flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-brand-muted">Status</div>
            <h4 className="mt-2 text-xl font-semibold">Concierge handoff ready</h4>
            <p className="mt-2 text-sm text-brand-muted">
              LeadPilot collects context, tags intent, and routes to your team with transcripts.
            </p>
          </div>
          <div className="mt-4 rounded-2xl border border-white/20 bg-black/80 text-white p-4 text-center">
            <div className="text-xs uppercase tracking-wide text-white/60">Live preview placeholder</div>
            <div className="mt-2 text-lg font-semibold">Demo video slot</div>
            <p className="text-sm text-white/60">Add your demo when ready.</p>
          </div>
        </div>
      </div>

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

function ModulesShowcase({
  modules,
  isAuthed,
  userPlan,
  userRole,
  planLoading,
}: {
  modules: ModuleInfo[];
  isAuthed: boolean;
  userPlan: Plan | null;
  userRole?: string;
  planLoading: boolean;
}) {
  const ordered = [...modules].sort((a, b) => (a.status === 'coming_soon' ? 1 : 0) - (b.status === 'coming_soon' ? 1 : 0));
  return (
    <section className="space-y-6" id="modules">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-semibold">Your entire marketing team, inside one login</h2>
        <p className="text-brand-muted">Most modules are production-ready today; ClipPilot is now live with scene detection, captions, zooms, music, and social-native exports.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {ordered.map((module) => {
          const isComingSoon = module.status === 'coming_soon';
          const required = modulePlan[module.key];
          const unlocked = !planLoading && canAccess({ userPlan: userPlan as any, module: module.key, userRole });
          const launchHref = isComingSoon
            ? waitlistHrefFor(module.t)
            : !isAuthed
            ? '/api/auth/signin'
            : unlocked
            ? module.href
            : '/billing';
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
                    <Link href={launchHref} className="btn-gold text-sm">
                      {isComingSoon
                        ? 'Join waitlist'
                        : !isAuthed
                        ? 'Sign in to launch'
                        : unlocked
                        ? `Launch ${module.t}`
                        : `Unlock ${required}`}
                    </Link>
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
        Spin up social content, SEO blogs, ads, lifecycle email, lead chatbots, and brand assets without switching tabs. ClipPilot now turns long videos into viral-ready shorts—everything else is production ready today.
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
