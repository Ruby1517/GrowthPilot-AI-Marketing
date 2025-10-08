// lib/usage.ts
import { Org } from '@/models/Org';
import { PLAN_LIMITS } from '@/lib/limits';

type Plan = keyof typeof PLAN_LIMITS;                         // 'Starter' | 'Pro' | 'Business'
type UsageKey = keyof typeof PLAN_LIMITS['Starter'];          // union of your meter keys

const PLAN_NORMALIZE: Record<string, Plan> = {
  Starter: 'Starter', starter: 'Starter',
  Pro: 'Pro', pro: 'Pro',
  Business: 'Business', business: 'Business',
};

export async function assertWithinLimit(opts: {
  orgId: string;
  key: UsageKey;
  incBy: number;
  allowOverage: boolean;
}) {
  const org = await Org.findById(opts.orgId).lean();
  if (!org) return { ok: false as const, reason: 'org_not_found' };

  // normalize plan with a safe fallback
  const plan: Plan = PLAN_NORMALIZE[String(org.plan ?? '')] ?? 'Starter';

  // make sure the key exists for this plan definition
  const planObj = PLAN_LIMITS[plan];
  if (!planObj || !(opts.key in planObj)) {
    return {
      ok: false as const,
      reason: 'unknown_usage_key_or_plan',
      details: { plan, key: opts.key },
    };
  }

  const limit = planObj[opts.key];
  const current = Number((org as any).usage?.[opts.key] ?? 0);
  const next = current + Number(opts.incBy ?? 0);

  if (Number.isNaN(limit)) {
    return { ok: false as const, reason: 'invalid_plan_limit', details: { plan, key: opts.key, limit } };
  }

  // under limit
  if (next <= limit) {
    await Org.updateOne(
      { _id: org._id },
      { $inc: { [`usage.${opts.key}`]: Number(opts.incBy) } }
    );
    return { ok: true as const, overage: false };
  }

  // over limit
  if ((org as any).overageEnabled && opts.allowOverage) {
    await Org.updateOne(
      { _id: org._id },
      { $set: { [`usage.${opts.key}`]: next } }
    );
    return { ok: true as const, overage: true, overUnits: next - limit };
  }

  return {
    ok: false as const,
    reason: 'limit_exceeded',
    limit,
    current,
    requested: opts.incBy,
  };
}
