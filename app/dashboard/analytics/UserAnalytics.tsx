'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PLAN_LIMITS, type MeterKey } from '@/lib/limits';
import { canAccess } from '@/lib/access';
import type { Plan, ModuleKey } from '@/lib/modules';

type AnalyticsData = {
  usage?: Partial<Record<MeterKey, number>>;
  period?: { plan?: Plan | null };
};

type Props = {
  initial: AnalyticsData;
  plan: Plan;
  role: string;
};

const MODULE_METERS: Array<{ module: ModuleKey; meter: MeterKey; label: string }> = [
  { module: 'postpilot', meter: 'postpilot_generated', label: 'PostPilot Posts' },
  { module: 'blogpilot', meter: 'blogpilot_words', label: 'BlogPilot Words' },
  { module: 'mailpilot', meter: 'mailpilot_emails', label: 'MailPilot Emails' },
  { module: 'adpilot', meter: 'adpilot_variants', label: 'AdPilot Variants' },
  { module: 'leadpilot', meter: 'leadpilot_convos', label: 'LeadPilot Conversations' },
  { module: 'brandpilot', meter: 'brandpilot_assets', label: 'BrandPilot Assets' },
];

export default function UserAnalytics({ initial, plan, role }: Props) {
  const usage = initial?.usage || {};
  const unlocked = useMemo(
    () =>
      MODULE_METERS.filter((m) =>
        canAccess({
          userPlan: plan,
          module: m.module,
          userRole: role,
        })
      ),
    [plan, role]
  );

  const meterCard = (m: { meter: MeterKey; label: string }) => {
    const used = Number(usage?.[m.meter] ?? 0);
    const limit = Number(PLAN_LIMITS[plan]?.[m.meter] ?? 0);
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const locked = limit === 0;

    return (
      <Card key={m.meter} className="border-white/20 bg-transparent dark:bg-card shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{m.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {locked ? (
            <div className="text-sm text-brand-muted space-y-2">
              <div>Not included in {plan}. Upgrade to unlock.</div>
              <Link href="/billing" className="btn-ghost text-xs inline-flex">View plans</Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm mb-2">
                <span>
                  <span className="text-[color:var(--gold,theme(colors.brand.gold))]">{used.toLocaleString()}</span>
                  <span> / </span>
                  <span className="text-[color:var(--gold,theme(colors.brand.gold))]">{limit.toLocaleString()}</span>
                </span>
                <span className="text-[color:var(--gold,theme(colors.brand.gold))]">{pct}%</span>
              </div>
              <Progress value={pct} />
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-white/20 bg-transparent dark:bg-card shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Your usage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>
            Plan: <b>{plan}</b>
          </div>
          <div className="text-brand-muted">
            You can use the modules listed below based on your current plan. These limits are per organization; usage shown here reflects your team&apos;s totals.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {unlocked.map((m) => meterCard(m))}
        {unlocked.length === 0 && (
          <Card className="border-white/20 bg-transparent dark:bg-card shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-none">
            <CardHeader><CardTitle className="text-base">No modules available</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>Upgrade to unlock modules for your team.</div>
              <Link href="/billing" className="btn-ghost text-xs inline-flex">See plans</Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
