// lib/plan-gate.ts
import { PLAN_LIMITS } from '@/lib/limits';
import { Org } from '@/models/Org';

type Feature = 'postpilot'|'clippilot'|'blogpilot'|'adpilot'|'mailpilot'|'leadpilot'|'brandpilot'|'viralpilot';

export async function canUseFeature(orgId: string, feature: Feature) {
  const org = await Org.findById(orgId).lean();
  if (!org) return { ok: false, reason: 'org_not_found' };
  const plan = (org.plan ?? 'Starter') as keyof typeof PLAN_LIMITS;
  // you can encode plan→feature matrix here; for now all plans can use
  return { ok: true, plan };
}
