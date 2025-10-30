'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { PLAN_LIMITS } from '@/lib/limits';

// Derive types from PLAN_LIMITS so keys always stay in sync
type Plan = keyof typeof PLAN_LIMITS;
type UsageKey = keyof typeof PLAN_LIMITS['Starter'];

type AnalyticsData = {
  usage?: Partial<Record<UsageKey, number>>;
  kpi?: {
    contentsProduced?: number;
    watchTimeMinutes?: number;
    leadsCaptured?: number;
    adVariants?: number;
    emailsDrafted?: number;
  };
  period?: {
    start?: string | Date | null;
    end?: string | Date | null;
    plan?: Plan | null;
  };
};

export default function AnalyticsCards({ initial }: { initial: AnalyticsData }) {
  const [data] = useState<AnalyticsData>(initial);

  // Safe plan fallback
  const validPlans = Object.keys(PLAN_LIMITS) as Plan[];
  const plan: Plan =
    (data?.period?.plan && (validPlans as readonly Plan[]).includes(data.period.plan as Plan))
      ? (data.period.plan as Plan)
      : 'Trial';

  const meter = (key: UsageKey, label: string) => {
    const used = Number(data?.usage?.[key] ?? 0);
    const limit = Number(PLAN_LIMITS[plan][key] ?? 0);
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

    return (
      <Card key={key} className="border-white/20">
        <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm mb-2">
            <span>
              <span className="text-[color:var(--gold,theme(colors.brand.gold))]">{used.toLocaleString()}</span>
              <span> / </span>
              <span className="text-[color:var(--gold,theme(colors.brand.gold))]">{limit.toLocaleString()}</span>
            </span>
            <span className="text-[color:var(--gold,theme(colors.brand.gold))]">{pct}%</span>
          </div>
          <Progress value={pct} />
        </CardContent>
      </Card>
    );
  };

  // For Trial plan: show a lean set of meters and an upgrade CTA
  const isTrial = plan === 'Trial';

  const metersOrder: Array<{ key: UsageKey; label: string }> = [
    { key: 'blogpilot_words', label: 'BlogPilot Words' },
    { key: 'postpilot_generated', label: 'PostPilot Posts' },
    { key: 'mailpilot_emails', label: 'MailPilot Emails' },
    { key: 'adpilot_variants', label: 'AdPilot Variants' },
    { key: 'clippilot_minutes', label: 'ClipPilot Render Minutes' },
    { key: 'viralpilot_minutes', label: 'ViralPilot Render/Watch Minutes' },
    { key: 'leadpilot_convos', label: 'LeadPilot Conversations' },
    { key: 'brandpilot_assets', label: 'BrandPilot Assets' },
  ];
  const visibleMeters = isTrial
    ? metersOrder.slice(0, 2) // only BlogPilot + PostPilot on Trial
    : metersOrder;

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <Card className="border-white/20">
        <CardHeader>
          <CardTitle>{isTrial ? 'Trial Usage' : 'Org KPIs (MTD)'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isTrial ? (
            <>
              <div>Your plan: <b>Trial</b>. You can generate limited BlogPilot words and PostPilot posts.</div>
              <div>
                Upgrade to unlock more modules and higher limits.
                <Link href="/billing" className="ml-2 underline text-brand-muted hover:text-white">View plans</Link>
              </div>
            </>
          ) : (
            <>
              <div>Contents produced: <b>{Number(data?.kpi?.contentsProduced ?? 0).toLocaleString()}</b></div>
              <div>Watch-time (min): <b>{Number(data?.kpi?.watchTimeMinutes ?? 0).toLocaleString()}</b></div>
              <div>Leads captured: <b>{Number(data?.kpi?.leadsCaptured ?? 0).toLocaleString()}</b></div>
              <div>Ad variants: <b>{Number(data?.kpi?.adVariants ?? 0).toLocaleString()}</b></div>
              <div>Emails drafted: <b>{Number(data?.kpi?.emailsDrafted ?? 0).toLocaleString()}</b></div>
            </>
          )}
        </CardContent>
      </Card>

      {!isTrial && (
        <Card className="border-white/20">
          <CardHeader><CardTitle>Brand Assets (MTD)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Total assets generated: <b>{Number((data?.usage as any)?.brandpilot_assets ?? 0).toLocaleString()}</b></div>
            <Link href="/brandpilot" className="inline-block text-xs underline text-brand-muted hover:text-white">Open BrandPilot</Link>
          </CardContent>
        </Card>
      )}
      {visibleMeters.map(m => meter(m.key, m.label))}
    </div>
  );
}
