import { Org } from '@/models/Org';
import type { Plan, ModuleKey } from '@/lib/modules';
import { modulePlan } from '@/lib/modules';

const RANK: Record<Plan, number> = { Trial: 0, Starter: 1, Pro: 2, Business: 3 };

export async function canUseFeature(orgId: string, feature: ModuleKey) {
  const org = await Org.findById(orgId).lean();
  if (!org) return { ok: false, reason: 'org_not_found' as const };
  const plan = (String((org as any).plan ?? 'Starter') as Plan);
  const required = modulePlan[feature];
  const ok = RANK[plan] >= RANK[required];
  return ok ? { ok: true as const, plan, required }
            : { ok: false as const, reason: 'plan_restricted' as const, plan, required };
}
