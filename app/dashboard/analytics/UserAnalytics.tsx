'use client';

import Link from 'next/link';
import { PLAN_LIMITS, type MeterKey } from '@/lib/limits';
import type { Plan, ModuleKey } from '@/lib/modules';

type AnalyticsData = {
  usage?: Partial<Record<MeterKey, number>>;
};

type Props = {
  initial: AnalyticsData;
  plan: Plan;
  role: string;
};

const METERS: Array<{ module: ModuleKey; meter: MeterKey; icon: string; label: string }> = [
  { module: 'postpilot', meter: 'postpilot_generated', icon: '📱', label: 'PostPilot — Posts' },
  { module: 'blogpilot', meter: 'blogpilot_words',     icon: '📝', label: 'BlogPilot — Words' },
  { module: 'adpilot',   meter: 'adpilot_variants',    icon: '🎯', label: 'AdPilot — Variants' },
  { module: 'leadpilot', meter: 'leadpilot_convos',    icon: '💬', label: 'LeadPilot — Conversations' },
  { module: 'mailpilot', meter: 'mailpilot_emails',    icon: '📧', label: 'MailPilot — Emails' },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

function barColor(p: number) {
  if (p >= 90) return 'bg-rose-500';
  if (p >= 70) return 'bg-amber-400';
  return 'bg-[color:var(--gold,theme(colors.brand.gold))]';
}

export default function UserAnalytics({ initial, plan }: Props) {
  const usage = initial?.usage || {};

  const meters = METERS.map(m => {
    const used  = Number(usage?.[m.meter] ?? 0);
    const limit = Number(PLAN_LIMITS[plan]?.[m.meter] ?? 0);
    const p     = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    return { ...m, used, limit, p };
  });

  return (
    <div className="space-y-4">
      {/* Plan summary */}
      <div className="card p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold text-lg">{plan} plan</div>
          <div className="text-sm text-brand-muted mt-1">
            Usage shown is your organisation&apos;s total for the current billing period.
          </div>
        </div>
        {plan === 'Trial' && (
          <Link href="/billing" className="btn-gold text-sm flex-shrink-0">Upgrade plan →</Link>
        )}
      </div>

      {/* Usage cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {meters.map(m => (
          <div key={m.meter} className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{m.icon}</span>
              <span className="text-sm font-medium">{m.label}</span>
            </div>

            {m.limit === 0 ? (
              <div className="text-sm text-brand-muted space-y-2">
                <div>Not available on {plan}.</div>
                <Link href="/billing" className="text-xs underline hover:text-white">View plans</Link>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold">{fmt(m.used)}</span>
                  <span className="text-sm text-brand-muted">/ {fmt(m.limit)}</span>
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor(m.p)}`} style={{ width: `${m.p}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-brand-muted">
                    <span>{m.p}% used</span>
                    <span>{fmt(Math.max(0, m.limit - m.used))} remaining</span>
                  </div>
                </div>
                {m.p >= 80 && (
                  <div className="text-xs text-amber-400 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>
                      {m.p >= 100 ? 'Limit reached — ' : 'Near limit — '}
                      <Link href="/billing" className="underline hover:text-white">upgrade or enable overage</Link>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
