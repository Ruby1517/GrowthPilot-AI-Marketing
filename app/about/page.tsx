import Link from 'next/link';

export const metadata = {
  title: 'About GrowthPilot — AI Marketing Suite',
  description:
    'GrowthPilot is an all-in-one AI marketing platform with 5 content modules and 3 AI agents. Brief once, generate everywhere.',
};

// ── Data ──────────────────────────────────────────────────────────────────────

const MODULES = [
  {
    icon: '📱',
    name: 'PostPilot',
    desc: 'Generate platform-native social posts for Instagram, LinkedIn, X, TikTok, and Facebook. Each post is tone-matched, hashtagged, and includes visual ideas.',
    href: '/postpilot',
  },
  {
    icon: '📝',
    name: 'BlogPilot',
    desc: 'Turn a topic or keywords into a full SEO blog draft — outline, meta description, FAQ, alt text, and readability score included.',
    href: '/blogpilot',
  },
  {
    icon: '🎯',
    name: 'AdPilot',
    desc: 'Generate A/B/C ad variants for Meta, Google, and TikTok. Each variant includes hook, primary text, headlines, descriptions, CTA, and UTM parameters.',
    href: '/adpilot',
  },
  {
    icon: '💬',
    name: 'LeadPilot',
    desc: 'Add an AI lead-capture chatbot to your site in 30 seconds. Qualifies visitors, captures contact info, and routes leads to your dashboard.',
    href: '/leadpilot',
  },
  {
    icon: '📧',
    name: 'MailPilot',
    desc: 'Write cold outreach, warm re-engagement, newsletters, and nurture sequences. Spam score and subject A/B variants included. Paste into any ESP.',
    href: '/mailpilot',
  },
];

const AGENTS = [
  {
    icon: '✨',
    name: 'Campaign Agent',
    color: 'border-[color:var(--gold)]/25 bg-[color:var(--gold)]/5',
    badge: 'text-[color:var(--gold)]',
    desc: 'Describe your campaign in one brief. The agent decides which modules to run, executes them in the right order, and delivers a complete campaign — blog, social posts, ad copy, email sequence, and lead chatbot config.',
    href: '/agent',
  },
  {
    icon: '✏️',
    name: 'Iteration Agent',
    color: 'border-emerald-500/25 bg-emerald-500/5',
    badge: 'text-emerald-400',
    desc: 'Generated content that\'s 90% there? Type what you want to change in plain language — "make it shorter", "add urgency", "more conversational" — and the agent refines the content while preserving its structure. Every version is saved so you can undo anytime.',
    href: '/agent/iterate',
  },
  {
    icon: '🔍',
    name: 'Research Agent',
    color: 'border-violet-500/25 bg-violet-500/5',
    badge: 'text-violet-400',
    desc: 'Enter a topic before generating. The agent surfaces 8–12 real SEO keywords, identifies what questions your audience is asking, spots gaps in existing content, and writes an enriched brief ready to paste into any module.',
    href: '/agent/research',
  },
];

const PRINCIPLES = [
  {
    icon: '⚡',
    title: 'Speed without sacrificing quality',
    desc: 'Brief once, get content for every channel in minutes — not hours. We optimise every module for output you can actually use, not just content that looks fast to generate.',
  },
  {
    icon: '🎯',
    title: 'Context shared across every tool',
    desc: 'Your brief, tone, and audience travel with you. PostPilot, BlogPilot, AdPilot, MailPilot, and LeadPilot all draw from the same context so your brand voice stays consistent.',
  },
  {
    icon: '🔒',
    title: 'Predictable costs, no surprises',
    desc: 'Every plan has clear usage caps. When you approach a limit we warn you. Overage billing means you can keep working — and only pay for what you use beyond your plan.',
  },
  {
    icon: '🤝',
    title: 'Built for teams, not just solo creators',
    desc: 'Role-based access (owner, manager, editor, viewer), team seats on Pro and above, shared analytics, and audit trails — GrowthPilot grows with your team.',
  },
];

const STEPS = [
  { step: '01', title: 'Research',  desc: 'Use the Research Agent to find the best angle, target keywords, and content gaps for your topic.' },
  { step: '02', title: 'Brief',     desc: 'Write a short campaign brief — or let the Campaign Agent generate it from your URL or product description.' },
  { step: '03', title: 'Generate',  desc: 'The Campaign Agent runs all 5 modules in sequence, or open any module individually for targeted content.' },
  { step: '04', title: 'Refine',    desc: 'Use the Iteration Agent to refine any piece with plain-language feedback. Version history is always saved.' },
  { step: '05', title: 'Export',    desc: 'Copy to clipboard, export to Markdown/CSV/HTML, or paste directly into your CMS, ESP, or ad manager.' },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-16">

      {/* ── Hero ── */}
      <section className="space-y-5">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold leading-tight">
            Your AI marketing team,<br />
            inside one dashboard
          </h1>
          <p className="text-brand-muted text-lg leading-relaxed max-w-2xl">
            GrowthPilot is an all-in-one AI marketing suite with five content modules and three AI agents.
            Brief once — generate blog posts, social content, ad copy, email campaigns, and lead chatbots together, on-brand, in minutes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/api/auth/signin" className="btn-gold px-5 py-2.5">Get started free</Link>
          <Link href="/billing" className="btn-ghost px-5 py-2.5">See pricing</Link>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-brand-muted pt-1">
          {['280+ teams', '4,200+ campaigns shipped', 'NPS 67', 'Free plan — no card needed'].map(s => (
            <span key={s} className="px-3 py-1 rounded-full border border-white/10 bg-white/5">{s}</span>
          ))}
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="card p-6 md:p-8 space-y-4">
        <h2 className="text-2xl font-semibold">The problem we solve</h2>
        <div className="space-y-3 text-brand-muted leading-relaxed">
          <p>
            Marketing teams spend hours switching between tools — a social scheduler here, a blog editor there, a separate ad tool, an email platform, a lead form. Each one requires its own brief, its own tone setup, and its own export workflow.
          </p>
          <p>
            The result: inconsistent brand voice, duplicated effort, and campaigns that take a week when they should take a day.
          </p>
          <p className="text-white font-medium">
            GrowthPilot collapses all of that into one workspace. Brief once. Generate everywhere. Stay on-brand across every channel automatically.
          </p>
        </div>
      </section>

      {/* ── Modules ── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">5 modules, every channel</h2>
          <p className="text-brand-muted mt-1">Each module is a specialist. Together they cover every content format your team needs.</p>
        </div>
        <div className="space-y-3">
          {MODULES.map(m => (
            <div key={m.name} className="card p-5 flex gap-4">
              <span className="text-2xl flex-shrink-0 mt-0.5">{m.icon}</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Live</span>
                </div>
                <p className="text-sm text-brand-muted leading-relaxed">{m.desc}</p>
                <Link href={m.href} className="text-xs text-[color:var(--gold)] hover:underline">
                  Open {m.name} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Agents ── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">3 AI agents</h2>
          <p className="text-brand-muted mt-1">
            Agents work across modules — planning, executing, refining, and researching automatically so you don&apos;t have to.
          </p>
        </div>
        <div className="space-y-4">
          {AGENTS.map(a => (
            <div key={a.name} className={`rounded-2xl border p-5 flex gap-4 ${a.color}`}>
              <span className="text-2xl flex-shrink-0 mt-0.5">{a.icon}</span>
              <div className="space-y-1.5">
                <div className={`font-semibold ${a.badge}`}>{a.name}</div>
                <p className="text-sm text-brand-muted leading-relaxed">{a.desc}</p>
                <Link href={a.href} className={`text-xs hover:underline ${a.badge}`}>
                  Try {a.name} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="space-y-0">
          {STEPS.map((s, i) => (
            <div key={s.step} className="flex gap-5">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-mono text-[color:var(--gold)]">{s.step}</span>
                </div>
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
              </div>
              {/* Content */}
              <div className={`pb-6 pt-1 ${i === STEPS.length - 1 ? '' : ''}`}>
                <div className="font-semibold">{s.title}</div>
                <p className="text-sm text-brand-muted mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Principles ── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">What we believe</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PRINCIPLES.map(p => (
            <div key={p.title} className="card p-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{p.icon}</span>
                <span className="font-semibold text-sm">{p.title}</span>
              </div>
              <p className="text-sm text-brand-muted leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing summary ── */}
      <section className="card p-6 md:p-8 space-y-4">
        <h2 className="text-xl font-semibold">Simple, transparent pricing</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { plan: 'Free',  price: '$0',     desc: 'Every module + all 3 agents. Limited usage. No card required.' },
            { plan: 'Pro',   price: '$49/mo', desc: '200 posts · 50k words · 50 ads · 50 emails · 1 seat · no watermark.', highlight: true },
            { plan: 'Scale', price: '$149/mo',desc: '2,000 posts · 500k words · 500 ads · 2k emails · 3 seats · Priority AI.' },
          ].map(p => (
            <div key={p.plan} className={`rounded-xl border p-4 space-y-1 ${p.highlight ? 'border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5' : 'border-white/10'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{p.plan}</span>
                {p.highlight && <span className="text-[10px] text-[color:var(--gold)] bg-[color:var(--gold)]/10 px-2 py-0.5 rounded-full">Popular</span>}
              </div>
              <div className="text-lg font-semibold">{p.price}</div>
              <p className="text-xs text-brand-muted leading-snug">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-1">
          <Link href="/billing" className="btn-gold text-sm">View full pricing</Link>
          <Link href="/api/auth/signin" className="btn-ghost text-sm">Start free</Link>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Questions or feedback?</h2>
          <p className="text-brand-muted text-sm max-w-md">
            We&apos;d love to hear from you — whether it&apos;s a feature request, a billing question, or just to say hello.
          </p>
          <p className="text-sm">
            <a href="mailto:hello@growthpilot.ai" className="text-[color:var(--gold)] hover:underline">
              hello@growthpilot.ai
            </a>
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link href="/dashboard" className="btn-gold text-sm">Open app</Link>
          <Link href="/" className="btn-ghost text-sm">← Home</Link>
        </div>
      </section>

    </div>
  );
}
