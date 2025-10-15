'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  const plan: Plan =
    (data?.period?.plan && (['Starter', 'Pro', 'Business'] as const).includes(data.period.plan)) 
      ? (data.period.plan as Plan)
      : 'Starter';

  const meter = (key: UsageKey, label: string) => {
    const used = Number(data?.usage?.[key] ?? 0);
    const limit = Number(PLAN_LIMITS[plan][key] ?? 0);
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

    return (
      <Card key={key}>
        <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm mb-2">
            <span>{used.toLocaleString()} / {limit.toLocaleString()}</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Org KPIs (MTD)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Contents produced: <b>{Number(data?.kpi?.contentsProduced ?? 0).toLocaleString()}</b></div>
          <div>Watch-time (min): <b>{Number(data?.kpi?.watchTimeMinutes ?? 0).toLocaleString()}</b></div>
          <div>Leads captured: <b>{Number(data?.kpi?.leadsCaptured ?? 0).toLocaleString()}</b></div>
          <div>Ad variants: <b>{Number(data?.kpi?.adVariants ?? 0).toLocaleString()}</b></div>
          <div>Emails drafted: <b>{Number(data?.kpi?.emailsDrafted ?? 0).toLocaleString()}</b></div>
        </CardContent>
      </Card>

      {meter('blogpilot_words', 'BlogPilot Words')}
      {meter('mailpilot_emails', 'MailPilot Emails')}
      {meter('clippilot_minutes', 'ClipPilot Render Minutes')}
      {meter('viralpilot_minutes', 'ViralPilot Render/Watch Minutes')}
      {meter('postpilot_generated', 'PostPilot Posts')}
      {meter('leadpilot_convos', 'LeadPilot Conversations')}
      {meter('adpilot_variants', 'AdPilot Variants')}
    </div>
  );
}
