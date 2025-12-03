
'use client';
import { useMemo, useState } from 'react';
import { moduleLabels } from '@/lib/modules';
import { PLAN_LIMITS } from '@/lib/limits';

type PlanName = 'Free' | 'Starter' | 'Pro' | 'Business';

const PLANS: Array<{
  key: PlanName;
  price: string;
  subtitle: string;
  highlight?: boolean;
}> = [
  { key: 'Free', price: '$0', subtitle: 'Try every module with limited usage' },
  { key: 'Starter', price: '$19', subtitle: 'Launch projects with steady usage' },
  { key: 'Pro', price: '$49', subtitle: 'Higher caps + priority processing', highlight: true },
  { key: 'Business', price: '$149', subtitle: 'Teams, API, and extended uploads' },
];

const PLAN_LIMIT_KEY: Record<PlanName, keyof typeof PLAN_LIMITS> = {
  Free: 'Trial',
  Starter: 'Starter',
  Pro: 'Pro',
  Business: 'Business',
};

const pillModules = (Object.keys(moduleLabels) as Array<keyof typeof moduleLabels>).map((m) => moduleLabels[m]);

function formatFeatures(plan: PlanName) {
  const limits = PLAN_LIMITS[PLAN_LIMIT_KEY[plan]];
  const list: string[] = [];
  list.push('All modules included');
  list.push('Usage caps apply per plan');
  list.push(limits.watermark ? 'Watermark on exports' : 'No watermark on exports');
  if (limits.clippilot_exports) {
    list.push(`Up to ${limits.clippilot_exports}+ shorts / month`);
  }
  const uploadMins = Math.max(1, Math.round((limits.video_length_upload || 0) / 60));
  list.push(`Max video upload ~${uploadMins} min`);
  if (limits.priority_processing) list.push('Priority AI processing');
  if (limits.team_seats) list.push(`${limits.team_seats} team seats`);
  if (limits.api_access) list.push('API access');
  return list;
}

export default function BillingPage() {
  const [currentPlan] = useState<PlanName>('Free');
  const [loading, setLoading] = useState<string | null>(null);

  const featureCache = useMemo(() => {
    const map: Record<PlanName, string[]> = {
      Free: formatFeatures('Free'),
      Starter: formatFeatures('Starter'),
      Pro: formatFeatures('Pro'),
      Business: formatFeatures('Business'),
    };
    return map;
  }, []);

  async function go(plan: 'starter' | 'pro' | 'business') {
    setLoading(plan);
    const res = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const text = await res.text();
      alert(`Checkout failed: ${text}`);
      setLoading(null);
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
  }

  async function portal() {
    const res = await fetch('/api/billing/create-portal', { method: 'POST' });
    if (!res.ok) {
      alert('Unable to open billing portal');
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
  }

  return (
    <div className="space-y-8 max-w-[1200px] w-full mx-auto border border-white/5 rounded-3xl p-6 bg-[rgba(0,0,0,0.08)]">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Plans & Pricing</h1>
        <p className="text-sm text-neutral-400">
          All modules included. Start free with limited usage, then upgrade to lift caps and add team features.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isCheckout = plan.key !== 'Free';
          const isLoading = loading === plan.key.toLowerCase();
          const features = featureCache[plan.key];
          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-3xl border border-neutral-700/60 bg-gradient-to-b from-[#111827] via-[#0b1220] to-[#0a0f1c] p-6 shadow-lg ${
                plan.highlight ? 'ring-1 ring-emerald-400/60' : ''
              }`}
            >
              {plan.highlight && (
                <span className="absolute right-4 top-4 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                  MOST POPULAR
                </span>
              )}
              <div className="mb-4 space-y-1">
                <h2 className="text-lg font-semibold">{plan.key}</h2>
                <p className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-base text-neutral-400">/mo</span>
                </p>
                <p className="text-xs text-neutral-400">{plan.subtitle}</p>
              </div>
              <button
                className={`mb-4 w-full rounded-full px-4 py-2 text-sm font-semibold ${
                  isCurrent
                    ? 'bg-neutral-700 text-neutral-100 cursor-default'
                    : 'bg-amber-400 text-black hover:bg-amber-300'
                }`}
                disabled={isCurrent || isLoading}
                onClick={() => {
                  if (!isCheckout) return;
                  return go(plan.key.toLowerCase() as any);
                }}
              >
                {isCurrent ? 'Current plan' : isLoading ? '…' : 'Get started'}
              </button>
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  What you can do
                </p>
                <ul className="space-y-2 text-sm text-neutral-200">
                  {features.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Modules included
                </p>
                <div className="flex flex-wrap gap-2">
                  {pillModules.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-100 border border-neutral-700"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-4">
        <button onClick={portal} className="rounded-full border border-neutral-600 px-4 py-2 text-xs text-neutral-200 hover:border-neutral-400">
          Manage Subscription
        </button>
      </div>
    </div>
  );
}
