'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ── Plan data ─────────────────────────────────────────────────────────────────

const PLANS = [
  {
    key: 'Trial' as const,
    label: 'Free',
    price: '$0',
    desc: 'Try every module and all 3 AI agents. No credit card.',
    highlight: false,
    checkoutKey: null as null,
    features: [
      '10 social posts / month',
      '5,000 blog words / month',
      '5 ad variants / month',
      '10 lead conversations / month',
      '3 emails / month',
      '1 seat',
      'All 5 modules included',
      'All 3 AI agents included',
      'Watermark on exports',
    ],
    missing: ['No watermark', 'Priority AI processing', 'Team seats', 'API access'],
  },
  {
    key: 'Starter' as const,
    label: 'Pro',
    price: '$49',
    desc: 'For solo marketers shipping consistent content every week.',
    highlight: false,
    checkoutKey: 'starter' as const,
    features: [
      '200 social posts / month',
      '50,000 blog words / month',
      '50 ad variants / month',
      '50 lead conversations / month',
      '50 emails / month',
      '1 seat',
      'All 5 modules included',
      'All 3 AI agents included',
      'No watermark',
    ],
    missing: ['Priority AI processing', 'Team seats', 'API access'],
  },
  {
    key: 'Pro' as const,
    label: 'Scale',
    price: '$149',
    desc: 'For growing teams that need volume, speed, and extra seats.',
    checkoutKey: 'pro' as const,
    highlight: true,
    features: [
      '2,000 social posts / month',
      '500,000 blog words / month',
      '500 ad variants / month',
      '1,000 lead conversations / month',
      '2,000 emails / month',
      '3 seats included',
      'All 5 modules included',
      'All 3 AI agents included',
      'No watermark',
      'Priority AI processing',
    ],
    missing: ['API access'],
  },
] as const;

type PlanKey = typeof PLANS[number]['key'] | 'Business';

const COMPARISON = [
  { label: 'Social posts / mo',  free: '10',    pro: '200',    scale: '2,000' },
  { label: 'Blog words / mo',    free: '5,000', pro: '50,000', scale: '500,000' },
  { label: 'Ad variants / mo',   free: '5',     pro: '50',     scale: '500' },
  { label: 'Lead conversations', free: '10',    pro: '50',     scale: '1,000' },
  { label: 'Emails / mo',        free: '3',     pro: '50',     scale: '2,000' },
  { label: 'Team seats',         free: '1',     pro: '1',      scale: '3' },
  { label: 'No watermark',       free: false,   pro: true,     scale: true },
  { label: 'Priority AI',        free: false,   pro: false,    scale: true },
  { label: 'All 5 modules',      free: true,    pro: true,     scale: true },
  { label: 'All 3 AI agents',    free: true,    pro: true,     scale: true },
];

const FAQS = [
  { q: 'Do all plans include every module and every agent?', a: 'Yes. All 5 modules and all 3 AI agents are on every plan including Free. Usage caps are the only difference.' },
  { q: 'Does the Campaign Agent count against my usage limits?', a: 'Yes. When the Campaign Agent runs BlogPilot, PostPilot, MailPilot, and AdPilot, it draws from the same monthly quotas as those modules. On the Free plan, one full campaign run will use most of your monthly allowance — which is a great way to see the full value before upgrading.' },
  { q: 'What happens when I hit a usage limit?', a: 'You can enable overage billing to keep generating and pay per unit beyond your cap. We never block you mid-campaign. Or upgrade to the next plan.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your billing portal — no questions, no penalty. Your plan stays active until the end of the current billing period.' },
  { q: 'Can I upgrade or downgrade mid-month?', a: 'Upgrades are instant and prorated to the day. Downgrades take effect at the next billing cycle.' },
  { q: 'Do you offer annual billing?', a: 'Annual plans with a 20% discount are coming soon. Email hello@growthpilot.ai to get on the list.' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function Tick({ on }: { on: boolean }) {
  if (on) return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400">
      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
    </svg>
  );
  return <span className="w-4 h-4 text-brand-muted text-center text-xs leading-4 block">—</span>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanKey | null>(null);
  const [fetching,    setFetching]    = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [showTable,   setShowTable]   = useState(false);

  useEffect(() => {
    fetch('/api/org/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => setCurrentPlan(j.effectivePlan ?? j.plan ?? 'Trial'))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  async function checkout(planKey: 'starter' | 'pro') {
    setCheckingOut(planKey);
    try {
      const r = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      if (!r.ok) { alert(`Checkout failed: ${await r.text()}`); return; }
      window.location.href = (await r.json()).url;
    } finally {
      setCheckingOut(null);
    }
  }

  async function openPortal() {
    const r = await fetch('/api/billing/create-portal', { method: 'POST' });
    if (!r.ok) { alert('Unable to open billing portal'); return; }
    window.location.href = (await r.json()).url;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-16">

      {/* ── Header ── */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-semibold">Plans & Pricing</h1>
        <p className="text-brand-muted max-w-lg mx-auto text-sm leading-relaxed">
          All 5 modules and all 3 AI agents on every plan.
          Start free — upgrade when you need more volume.
        </p>
        {!fetching && currentPlan && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            You are on the <strong className="ml-1">{currentPlan}</strong> plan
          </div>
        )}
      </div>

      {/* ── 3 Plan cards ── */}
      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map(plan => {
          const isCurrent = !fetching && currentPlan === plan.key;
          const isLoading = checkingOut === plan.checkoutKey;

          return (
            <div
              key={plan.key}
              className={`card p-6 flex flex-col gap-6 relative ${
                plan.highlight
                  ? 'border-[color:var(--gold)]/40 ring-1 ring-[color:var(--gold)]/20 bg-[color:var(--gold)]/5'
                  : ''
              }`}
            >
              {/* Popular badge */}
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[color:var(--gold)] text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">
                    Most popular
                  </span>
                </div>
              )}

              {/* Name + price */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-lg">{plan.label}</span>
                  {isCurrent && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold">{plan.price}</span>
                  {plan.price !== '$0' && (
                    <span className="text-sm text-brand-muted">/month</span>
                  )}
                </div>
                <p className="text-xs text-brand-muted leading-snug">{plan.desc}</p>
              </div>

              {/* CTA */}
              {isCurrent ? (
                <button onClick={openPortal}
                  className="w-full py-3 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition">
                  Manage plan
                </button>
              ) : plan.checkoutKey ? (
                <button
                  onClick={() => checkout(plan.checkoutKey!)}
                  disabled={!!checkingOut}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition disabled:opacity-60 ${
                    plan.highlight ? 'btn-gold' : 'border border-white/20 hover:bg-white/5'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                          strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
                      </svg>
                      Redirecting…
                    </span>
                  ) : `Get ${plan.label}`}
                </button>
              ) : (
                <Link href="/auth/signup"
                  className="w-full py-3 rounded-xl border border-white/15 text-sm font-medium text-center hover:bg-white/5 transition block">
                  Start free
                </Link>
              )}

              {/* Features */}
              <div className="space-y-2 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-brand-muted mb-3">What&apos;s included</div>
                {plan.features.map(f => (
                  <div key={f} className="flex items-start gap-2 text-xs">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5">
                      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <span className={plan.highlight ? 'text-white/85' : 'text-brand-muted'}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Agents note ── */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-4 flex gap-4">
        <span className="text-2xl flex-shrink-0">🤖</span>
        <div className="space-y-1">
          <div className="text-sm font-medium">All 3 AI agents are included on every plan — including Free</div>
          <p className="text-xs text-brand-muted leading-relaxed">
            The <strong className="text-white">Research Agent</strong> and <strong className="text-white">Iteration Agent</strong> have no extra cost.
            The <strong className="text-white">Campaign Agent</strong> runs your modules in sequence — it draws from the same monthly quotas
            (posts, words, emails). On the Free plan, one full campaign will use most of your monthly allowance,
            giving you a complete preview before you decide to upgrade.
          </p>
        </div>
      </div>

      {/* ── Comparison table (collapsed) ── */}
      <div className="space-y-4">
        <button onClick={() => setShowTable(v => !v)}
          className="flex items-center justify-center gap-2 text-sm text-brand-muted hover:text-white transition w-full">
          <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${showTable ? 'rotate-180' : ''}`}>
            <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
          </svg>
          {showTable ? 'Hide comparison' : 'Compare plans in detail'}
        </button>

        {showTable && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-3 text-left text-xs text-brand-muted font-medium">Feature</th>
                  {PLANS.map(p => (
                    <th key={p.key} className={`px-5 py-3 text-center text-xs font-semibold ${p.highlight ? 'text-[color:var(--gold)]' : 'text-brand-muted'}`}>
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.label} className={`border-b border-white/8 ${i % 2 === 0 ? 'bg-white/[0.015]' : ''}`}>
                    <td className="px-5 py-3 text-xs text-brand-muted">{row.label}</td>
                    {(['free', 'pro', 'scale'] as const).map(col => (
                      <td key={col} className="px-5 py-3 text-center">
                        {typeof row[col] === 'boolean'
                          ? <div className="flex justify-center"><Tick on={row[col] as boolean} /></div>
                          : <span className="text-xs font-medium">{row[col] as string}</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Enterprise row ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="font-semibold">Need more? Enterprise plan available.</div>
          <p className="text-sm text-brand-muted mt-1">
            20,000 posts · 2M blog words · 10 seats · API access · pooled usage · SLA.
            Built for large marketing teams. <Link href="/pricing" className="underline hover:text-white">See all plans →</Link>
          </p>
        </div>
        <a href="mailto:hello@growthpilot.ai?subject=Enterprise plan"
          className="btn-ghost text-sm px-5 py-2.5 flex-shrink-0 whitespace-nowrap">
          Contact us →
        </a>
      </div>

      {/* ── Trust signals ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: '🔄', title: 'Cancel anytime',    sub: 'No lock-in' },
          { icon: '⚡', title: 'Instant upgrade',   sub: 'Prorated to the day' },
          { icon: '📊', title: 'Overage billing',   sub: 'Work past your cap' },
          { icon: '🔒', title: 'Stripe checkout',   sub: 'Secure & PCI compliant' },
        ].map(t => (
          <div key={t.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center space-y-1">
            <div className="text-xl">{t.icon}</div>
            <div className="text-xs font-medium">{t.title}</div>
            <div className="text-[10px] text-brand-muted">{t.sub}</div>
          </div>
        ))}
      </div>

      {/* ── What's on every plan ── */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-lg">Everything included on every plan</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { icon: '📱', name: 'PostPilot',         desc: 'Social posts for Instagram, LinkedIn, X, TikTok, Facebook' },
            { icon: '📝', name: 'BlogPilot',          desc: 'SEO blog drafts — outline, meta, FAQ, alt text' },
            { icon: '🎯', name: 'AdPilot',            desc: 'Ad copy for Meta, Google, TikTok with test plan' },
            { icon: '💬', name: 'LeadPilot',          desc: 'AI lead capture chatbot — embed anywhere in 30s' },
            { icon: '📧', name: 'MailPilot',           desc: 'Email sequences: cold, warm, newsletter, nurture' },
            { icon: '✨', name: 'Campaign Agent',      desc: 'Runs all modules from one brief — uses your monthly quotas' },
            { icon: '✏️', name: 'Iteration Agent',    desc: 'Refines any content — no extra quota consumed' },
            { icon: '🔍', name: 'Research Agent',     desc: 'Keywords, gaps & enriched brief — one lightweight call' },
          ].map(item => (
            <div key={item.name} className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-xs text-brand-muted">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="space-y-3 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-center mb-5">Pricing questions</h2>
        {FAQS.map((f, i) => (
          <details key={i} className="card p-4 group cursor-pointer">
            <summary className="font-medium text-sm flex items-center justify-between gap-3 list-none">
              {f.q}
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand-muted flex-shrink-0 transition-transform group-open:rotate-180">
                <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
              </svg>
            </summary>
            <p className="mt-3 text-sm text-brand-muted leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>

      {/* ── Bottom actions ── */}
      <div className="text-center space-y-3 pb-4">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button onClick={openPortal} className="btn-ghost text-sm">
            Manage subscription & invoices
          </button>
          <Link href="/" className="text-sm text-brand-muted hover:text-white transition">
            ← Back to home
          </Link>
        </div>
        <p className="text-xs text-brand-muted">
          Need help choosing? Email <a href="mailto:hello@growthpilot.ai" className="underline hover:text-white">hello@growthpilot.ai</a>
        </p>
      </div>

    </div>
  );
}
