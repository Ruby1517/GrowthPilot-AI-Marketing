import { Org } from '@/models/Org';
import { PLAN_LIMITS, MeterKey } from '@/lib/limits';

type Plan = keyof typeof PLAN_LIMITS;                  // 'Starter' | 'Pro' | 'Business'
// type UsageKey = keyof typeof PLAN_LIMITS['Starter'];   // union of meter keys, e.g. 'clippilot_videos' | ...

const PLAN_NORMALIZE: Record<string, Plan> = {
  Trial: 'Trial', trial: 'Trial', free: 'Trial',
  Starter: 'Starter', starter: 'Starter',
  Pro: 'Pro', pro: 'Pro',
  Business: 'Business', business: 'Business',
};

type AssertWithinLimitResult =
  | { ok: true; overage: boolean; overUnits?: number }
  | {
      ok: false;
      reason:
        | 'org_not_found'
        | 'unknown_usage_key_or_plan'
        | 'invalid_plan_limit'
        | 'limit_exceeded';
      details?: any;
      limit?: number;
      current?: number;
      requested?: number;
    };

export async function assertWithinLimit(opts: {
  orgId: string;
  key: MeterKey;
  incBy: number;             // units to add/consume (must be >= 1)
  allowOverage: boolean;     // whether org can exceed plan if org.overageEnabled
  dryRun?: boolean;          // if true, only checks; no mutation
}): Promise<AssertWithinLimitResult> {
  const org = await Org.findById(opts.orgId).lean();
  if (!org) return { ok: false, reason: 'org_not_found' };

  // normalize plan with a safe fallback
  const plan: Plan = PLAN_NORMALIZE[String((org as any).plan ?? '')] ?? 'Trial';

  // make sure the key exists for this plan definition
  const planObj = PLAN_LIMITS[plan];
  if (!planObj || !(opts.key in planObj)) {
    return { ok: false, reason: 'unknown_usage_key_or_plan', details: { plan, key: opts.key } };
  }

  const limit = Number(planObj[opts.key]);
  if (Number.isNaN(limit)) {
    return { ok: false, reason: 'invalid_plan_limit', details: { plan, key: opts.key, limit } };
  }

  const incBy = Math.max(1, Number(opts.incBy ?? 0));
  const current = Number((org as any).usage?.[opts.key] ?? 0);
  const next = current + incBy;

  // DRY RUN: only report whether it would pass/fail and if overage applies
  if (opts.dryRun) {
    if (next <= limit) return { ok: true, overage: false };
    if ((org as any).overageEnabled && opts.allowOverage) {
      return { ok: true, overage: true, overUnits: next - limit };
    }
    return { ok: false, reason: 'limit_exceeded', limit, current, requested: incBy };
  }

  // MUTATING: consume usage or apply overage
  if (next <= limit) {
    await Org.updateOne(
      { _id: org._id },
      { $inc: { [`usage.${opts.key}`]: incBy } }
    );
    return { ok: true, overage: false };
  }

  // over limit
  if ((org as any).overageEnabled && opts.allowOverage) {
    await Org.updateOne(
      { _id: org._id },
      { $set: { [`usage.${opts.key}`]: next } } // record actual usage past limit
    );
    return { ok: true, overage: true, overUnits: next - limit };
  }

  return { ok: false, reason: 'limit_exceeded', limit, current, requested: incBy };
}

/**
 * Wrapper with the name your route expects.
 * Call once with dryRun:true (pre-check), then again with dryRun:false (to consume).
 */
export async function checkUsageAndConsume(opts: {
  orgId: string;
  key: MeterKey;
  incBy?: number;
  allowOverage?: boolean;
  dryRun?: boolean;
}) {
  return assertWithinLimit({
    orgId: opts.orgId,
    key: opts.key,
    incBy: Math.max(1, Number(opts.incBy ?? 1)),
    allowOverage: Boolean(opts.allowOverage),
    dryRun: Boolean(opts.dryRun),
  });
}
