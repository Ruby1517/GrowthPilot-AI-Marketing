"use client";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { canAccess } from '@/lib/access';
import type { ModuleKey, Plan } from '@/lib/modules';

// ── Data ──────────────────────────────────────────────────────────────────────

const MODULES = [
  { key: 'postpilot' as ModuleKey, label: 'PostPilot',  desc: 'AI Social Content',  icon: '📱', href: '/postpilot',  points: ['Platform-native captions for Instagram, LinkedIn, X, TikTok', 'Tone controls + hashtags + visual ideas', 'Refine any post with one sentence of feedback'] },
  { key: 'blogpilot' as ModuleKey, label: 'BlogPilot',  desc: 'SEO Blog Writer',    icon: '📝', href: '/blogpilot',  points: ['Keyword-targeted outlines + full drafts', 'Meta title, description, FAQ auto-generated', 'Export to Markdown or HTML'] },
  { key: 'adpilot'   as ModuleKey, label: 'AdPilot',   desc: 'Ad Copy Generator',  icon: '🎯', href: '/adpilot',   points: ['A/B/C variants for Meta, Google, TikTok', 'Hook + primary text + headlines + CTA', 'Retargeting ads + test plan included'] },
  { key: 'leadpilot' as ModuleKey, label: 'LeadPilot',  desc: 'AI Lead Chatbot',    icon: '💬', href: '/leadpilot',  points: ['Add a lead capture chatbot in 30 seconds', 'Qualifies visitors and collects contacts', 'Leads routed to your dashboard with transcripts'] },
  { key: 'mailpilot' as ModuleKey, label: 'MailPilot',  desc: 'Email Campaigns',    icon: '📧', href: '/mailpilot',  points: ['Cold, warm, newsletter, or nurture sequences', 'Spam score + subject lines included', 'Copy-paste into any ESP'] },
];

const STATS = [
  { value: '280+',   label: 'Teams using GrowthPilot' },
  { value: '12h',    label: 'Saved per marketer per week' },
  { value: '4.2k',   label: 'Campaigns shipped in 90 days' },
  { value: '67',     label: 'NPS score' },
];

const AGENTS = [
  {
    icon: '✨', label: 'Campaign Agent', color: 'gold',
    desc: 'Type a brief — the agent decides which tools to run, executes them in order, and delivers a full campaign.',
    href: '/agent',
    cta: 'Open Campaign Agent',
    bullets: ['Blog + social + ads + email in one run', 'Agent plans the sequence, you review the output', 'Async — no page timeout'],
  },
  {
    icon: '✏️', label: 'Iteration Agent', color: 'emerald',
    desc: 'Generated content 90% there? Refine it with plain language. Every version saved, undo anytime.',
    href: '/agent/iterate',
    cta: 'Try Iteration Agent',
    bullets: ['Works inside every module after generation', 'Module-aware: respects platform limits', 'Full version history'],
  },
  {
    icon: '🔍', label: 'Research Agent', color: 'violet',
    desc: 'Enter a topic — get keywords, content gaps, the best angle, and an enriched brief ready for any module.',
    href: '/agent/research',
    cta: 'Try Research Agent',
    bullets: ['8–12 real SEO keywords', 'Identifies what competitors miss', 'Enriched brief auto-fills the module form'],
  },
];

const PLANS = [
  { name: 'Trial', label: 'Free', price: 'Free', desc: 'Try every module with limited usage. No credit card.', features: ['All 5 modules', '10 posts · 5k blog words · 5 ads', '10 lead conversations', '3 email campaigns'] },
  { name: 'Starter', label: 'Pro', price: '$49/mo', desc: 'For solo marketers shipping consistent content.', features: ['All 5 modules + all 3 agents', '200 posts · 50k words · 50 ads', '50 lead conversations', '50 email campaigns'], highlight: true },
  { name: 'Pro', label: 'Scale', price: '$149/mo', desc: 'For growing teams with high content volume.', features: ['Everything in Pro', '2k posts · 500k words · 500 ads', '1k lead conversations', '2k email campaigns', 'Priority AI processing'] },
];

const FAQS = [
  { q: 'Do I need to set up anything to use GrowthPilot?', a: 'No. Sign up, and every module is available immediately. No integrations required to generate content.' },
  { q: 'How is the Campaign Agent different from the individual modules?', a: 'The Campaign Agent runs multiple modules automatically — you type one brief and it generates a blog, social posts, ads, and email in sequence. The modules let you control each piece individually.' },
  { q: 'Can I use my own tone and brand voice?', a: "Yes. Every module has a tone selector and free-text audience field. The Research Agent can also identify your best content angle before you generate." },
  { q: 'Does GrowthPilot post content for me?', a: 'GrowthPilot generates content and lets you export or copy it. Direct scheduling and publishing integrations are on the roadmap.' },
  { q: 'What AI models power GrowthPilot?', a: 'OpenAI GPT-4o for agent planning and gpt-4o-mini for fast content generation. You can override models per plan.' },
  { q: 'What happens when I hit my usage limit?', a: 'You can upgrade your plan or enable overage billing, which charges per unit beyond your cap. No hard cutoffs by default.' },
];

const TESTIMONIALS = [
  { quote: 'GrowthPilot replaced five point solutions. Our paid, lifecycle, and social teams finally sound the same.', name: 'Diana Chen', role: 'VP Growth @ Brightly', metric: '+42% content throughput' },
  { quote: 'We ship twice as many campaigns with a three-person team. The agents do the heavy lifting.', name: 'Marcus Lee', role: 'Head of Marketing @ Launchpad', metric: '8 hrs/week saved' },
  { quote: 'The Research Agent alone is worth it. We stopped guessing what to write about.', name: 'Hannah Ortiz', role: 'Creative Lead @ Tala', metric: 'Content always on-brief' },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

const colorMap = {
  gold:    { ring: 'ring-[color:var(--gold)]/30',    bg: 'bg-[color:var(--gold)]/10',    text: 'text-[color:var(--gold)]',    border: 'border-[color:var(--gold)]/30' },
  emerald: { ring: 'ring-emerald-500/30',             bg: 'bg-emerald-500/10',            text: 'text-emerald-400',            border: 'border-emerald-500/30' },
  violet:  { ring: 'ring-violet-500/30',              bg: 'bg-violet-500/10',             text: 'text-violet-400',             border: 'border-violet-500/30' },
};

// ── Campaign Agent animated demo ──────────────────────────────────────────────

const DEMO_STEPS = [
  { icon: '📝', label: 'BlogPilot',  desc: 'SEO blog draft',        color: 'border-sky-500/30     bg-sky-500/10' },
  { icon: '📱', label: 'PostPilot',  desc: '5 social posts',         color: 'border-violet-500/30  bg-violet-500/10' },
  { icon: '🎯', label: 'AdPilot',   desc: 'Ad variants',            color: 'border-rose-500/30    bg-rose-500/10' },
  { icon: '📧', label: 'MailPilot', desc: '3-email sequence',        color: 'border-amber-500/30   bg-amber-500/10' },
  { icon: '💬', label: 'LeadPilot', desc: 'Lead chatbot config',     color: 'border-emerald-500/30 bg-emerald-500/10' },
] as const;

function CampaignDemo() {
  const [active, setActive] = useState(-1);
  const [done, setDone] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  function run() {
    if (running) return;
    setActive(-1); setDone([]); setFinished(false); setRunning(true);
    let i = 0;
    const next = () => {
      if (i >= DEMO_STEPS.length) { setActive(-1); setRunning(false); setFinished(true); return; }
      setActive(i);
      t.current = setTimeout(() => { setDone(p => [...p, i]); i++; t.current = setTimeout(next, 250); }, 1300);
    };
    t.current = setTimeout(next, 300);
  }
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden text-sm">
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-black/20">
        <div className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 font-mono text-xs text-white/70 truncate">
          &ldquo;Launch our SaaS tool to startup founders — SEO, social, and email&rdquo;
        </div>
        <button onClick={run} disabled={running}
          className="btn-gold text-xs px-3 py-1.5 flex-shrink-0 disabled:opacity-50 flex items-center gap-1.5">
          {running
            ? <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/></svg>Running…</>
            : finished ? '▶ Again' : '✨ Run'}
        </button>
      </div>
      <div className="p-3 space-y-2">
        {DEMO_STEPS.map((s, i) => {
          const isDone = done.includes(i);
          const isNow  = active === i;
          const wait   = !isDone && !isNow;
          return (
            <div key={s.label} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-400
              ${isDone ? s.color : isNow ? s.color + ' scale-[1.01]' : 'border-white/8 bg-white/[0.02] opacity-35'}`}>
              <span className={`text-base ${isNow ? 'animate-bounce' : ''}`}>{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs">{s.label}</div>
                <div className="text-[10px] text-brand-muted">{s.desc}</div>
              </div>
              {isDone && <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>}
              {isNow  && <svg className="animate-spin w-3.5 h-3.5 text-[color:var(--gold)] flex-shrink-0" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/></svg>}
              {wait   && <span className="w-3.5 h-3.5 rounded-full border border-white/15 flex-shrink-0 block"/>}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-white/10 text-[10px] text-brand-muted min-h-[32px]">
        {finished && <span className="text-emerald-400">✓ Campaign complete — 5 pieces of content generated</span>}
        {running && active >= 0 && <span>Running {DEMO_STEPS[active]?.label}…</span>}
        {!running && !finished && <span>Click Run to see the agent work in real-time</span>}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: session, status } = useSession();
  const isAuthed = Boolean(session?.user);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (status !== 'authenticated') { setPlan(null); setRole(null); setPlanLoading(false); return; }
    setPlanLoading(true);
    fetch('/api/org/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (!cancelled) { setPlan(j.effectivePlan ?? j.plan ?? 'Trial'); setRole(j.myRole ?? null); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPlanLoading(false); });
    return () => { cancelled = true; };
  }, [status]);

  const userPlan: Plan | null = isAuthed ? (plan ?? 'Trial') : null;

  return (
    <div className="space-y-20 md:space-y-28 relative overflow-hidden">

      {/* Glow background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -left-40 top-10 w-80 h-80 rounded-full bg-sky-500/20 blur-[140px]" />
        <div className="absolute right-0 top-60 w-96 h-96 rounded-full bg-[color:var(--gold)]/15 blur-[160px]" />
        <div className="absolute left-1/3 bottom-40 w-64 h-64 rounded-full bg-violet-500/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-20 md:space-y-28">

        {/* ── Hero ── */}
        <section className="text-center space-y-8 pt-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-xs text-brand-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All 5 modules + 3 AI agents — live now
            </span>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-4xl mx-auto">
              Your AI marketing team,<br />
              <span className="text-[color:var(--gold,theme(colors.brand.gold))]">inside one dashboard</span>
            </h1>
            <p className="text-base md:text-xl text-brand-muted max-w-2xl mx-auto leading-relaxed">
              Write a brief once. GrowthPilot generates your blog, social posts, ads, email campaigns, and lead chatbot — together, on-brand, in minutes.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href={isAuthed ? '/dashboard' : '/api/auth/signin'} className="btn-gold px-6 py-3 text-base">
              {isAuthed ? 'Go to dashboard' : 'Start free — no card needed'}
            </Link>
            <Link href="/agent" className="btn-ghost px-6 py-3 text-base">
              Try Campaign Agent →
            </Link>
          </div>

          {/* Module pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-brand-muted">
            {['📱 PostPilot', '📝 BlogPilot', '🎯 AdPilot', '💬 LeadPilot', '📧 MailPilot'].map(m => (
              <span key={m} className="px-3 py-1 rounded-full border border-white/10 bg-white/5">{m}</span>
            ))}
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="card p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map(s => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-semibold">{s.value}</div>
                <div className="text-sm text-brand-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Modules ── */}
        <section className="space-y-8" id="modules">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-semibold">5 tools. Every marketing channel.</h2>
            <p className="text-brand-muted">Each module is a specialist. Together they&apos;re a full team.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(m => {
              const unlocked = !planLoading && canAccess({ userPlan: userPlan as any, module: m.key, userRole: role ?? undefined });
              const href = !isAuthed ? '/api/auth/signin' : unlocked ? m.href : '/billing';
              const cta  = !isAuthed ? 'Sign in to launch' : unlocked ? `Open ${m.label}` : 'Upgrade to unlock';
              return (
                <div key={m.key} className="card p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{m.icon}</span>
                      <div>
                        <div className="font-semibold">{m.label}</div>
                        <div className="text-xs text-brand-muted">{m.desc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Live</span>
                  </div>
                  <ul className="space-y-1.5">
                    {m.points.map((p, i) => (
                      <li key={i} className="text-sm text-brand-muted flex gap-2">
                        <span className="mt-1 w-1 h-1 rounded-full bg-[color:var(--gold)] flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link href={href} className="btn-gold text-sm mt-auto self-start">{cta}</Link>
                </div>
              );
            })}
            {/* Agents promo card */}
            <div className="card p-5 flex flex-col gap-4 border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <div className="font-semibold">AI Agents</div>
                  <div className="text-xs text-brand-muted">Campaign · Iteration · Research</div>
                </div>
              </div>
              <p className="text-sm text-brand-muted">Three agents that work across all modules — plan, generate, refine, and research automatically.</p>
              <div className="flex gap-2 mt-auto">
                <Link href="/agent" className="btn-gold text-sm">Campaign Agent</Link>
                <Link href="/agent/research" className="btn-ghost text-sm">Research</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── AI Agents ── */}
        <section className="space-y-10" id="agents">
          <div className="text-center space-y-2">
            <span className="badge">AI Agents</span>
            <h2 className="text-3xl font-semibold mt-3">Three agents that do the work for you</h2>
            <p className="text-brand-muted max-w-2xl mx-auto">
              Not just content tools — autonomous agents that plan, execute, refine, and research. Each one handles a different part of the marketing workflow.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {AGENTS.map(a => {
              const c = colorMap[a.color as keyof typeof colorMap];
              return (
                <div key={a.label} className={`card p-5 flex flex-col gap-4 border ${c.border}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center text-lg flex-shrink-0`}>{a.icon}</div>
                    <div className={`font-semibold ${c.text}`}>{a.label}</div>
                  </div>
                  <p className="text-sm text-brand-muted leading-relaxed">{a.desc}</p>
                  <ul className="space-y-1.5">
                    {a.bullets.map((b, i) => (
                      <li key={i} className="text-xs text-brand-muted flex gap-2">
                        <span className={`mt-0.5 w-1 h-1 rounded-full ${c.text} flex-shrink-0`} style={{background:'currentColor'}} />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link href={a.href} className={`text-sm px-4 py-2 rounded-lg border ${c.border} ${c.text} hover:${c.bg} transition self-start mt-auto`}>
                    {a.cta} →
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Campaign Agent interactive demo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Campaign Agent — live demo</div>
              <Link href="/agent" className="text-xs text-brand-muted hover:text-white transition">Open the real thing →</Link>
            </div>
            <CampaignDemo />
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="card p-6 md:p-10 space-y-8">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-semibold">From brief to launch in three steps</h2>
            <p className="text-brand-muted">One source of truth powers every module.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: '01', title: 'Research & brief', desc: 'Use the Research Agent to find your best angle, then write a brief. Keywords, gaps, and audience — all pre-filled.', icon: '🔍' },
              { step: '02', title: 'Generate everywhere', desc: 'Run the Campaign Agent or open any module. Blog, social, ads, email, and lead chatbot stay in lockstep.', icon: '⚙️' },
              { step: '03', title: 'Refine & export', desc: 'The Iteration Agent polishes any piece with one sentence of feedback. Export to CSV, Markdown, or your ESP.', icon: '✅' },
            ].map(s => (
              <div key={s.step} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-xs text-brand-muted font-mono">{s.step}</span>
                </div>
                <div className="font-semibold">{s.title}</div>
                <p className="text-sm text-brand-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="space-y-8" id="pricing">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-semibold">Simple, honest pricing</h2>
            <p className="text-brand-muted">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map(p => (
              <div key={p.name} className={`card p-6 flex flex-col gap-5 ${p.highlight ? 'border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 ring-1 ring-[color:var(--gold)]/20' : ''}`}>
                <div>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{p.label}</div>
                    {p.highlight && <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[color:var(--gold)]/20 text-[color:var(--gold)]">Most popular</span>}
                  </div>
                  <div className="text-2xl font-semibold mt-2">{p.price}</div>
                  <div className="text-sm text-brand-muted mt-1">{p.desc}</div>
                </div>
                <ul className="space-y-2 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="text-sm flex gap-2 text-brand-muted">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={isAuthed ? '/billing' : '/auth/signup'} className={`text-sm text-center py-2.5 rounded-xl border transition ${p.highlight ? 'btn-gold' : 'btn-ghost'}`}>
                  {p.name === 'Trial' ? 'Start free' : `Get ${p.label}`}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-brand-muted">All plans include every module. Upgrade or downgrade anytime. Overage billing available on paid plans.</p>
        </section>

        {/* ── Testimonials ── */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-semibold">Loved by marketing teams</h2>
            <p className="text-brand-muted">Less time writing. More campaigns shipped.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map(t => (
              <figure key={t.name} className="card p-5 flex flex-col gap-4">
                <blockquote className="text-sm text-brand-muted leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</blockquote>
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-brand-muted">{t.role}</div>
                  </div>
                  <div className="text-xs text-[color:var(--gold)] font-medium">{t.metric}</div>
                </div>
              </figure>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="space-y-6 max-w-3xl mx-auto" id="faq">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-semibold">Common questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <details key={i} className="card p-5 group">
                <summary className="font-medium text-sm cursor-pointer flex items-center justify-between gap-3 list-none">
                  {f.q}
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand-muted flex-shrink-0 transition-transform group-open:rotate-180">
                    <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-brand-muted leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="card p-8 md:p-14 text-center space-y-5">
          <h2 className="text-3xl md:text-4xl font-semibold">Ship your next campaign today</h2>
          <p className="text-brand-muted max-w-xl mx-auto">
            Start free. Every module is available on the Free plan. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href={isAuthed ? '/dashboard' : '/api/auth/signin'} className="btn-gold px-6 py-3">
              {isAuthed ? 'Open dashboard' : 'Start free'}
            </Link>
            <Link href="/agent" className="btn-ghost px-6 py-3">
              Try Campaign Agent →
            </Link>
          </div>
          <p className="text-xs text-brand-muted">
            Free plan includes all 5 modules + 3 agents with usage limits.
          </p>
        </section>

      </div>
    </div>
  );
}
