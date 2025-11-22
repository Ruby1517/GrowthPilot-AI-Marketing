import { modulePlan, DEV_UNLOCK_ALL, ADMIN_ROLES, Plan, ModuleKey } from './modules';

const RANK: Record<Plan, number> = { Trial: 0, Starter: 1, Pro: 2, Business: 3 };
const ADMIN_OVERRIDE_ENABLED = process.env.NEXT_PUBLIC_ALLOW_ADMIN_OVERRIDE === 'true';
const TRIAL_UNLOCK_MODULES = new Set<ModuleKey>(['postpilot', 'blogpilot']);

function normalizePlan(v: Plan | string | null | undefined): Plan {
  const s = String(v ?? '').toLowerCase();
  if (s === 'starter') return 'Starter';
  if (s === 'pro') return 'Pro';
  if (s === 'business') return 'Business';
  // treat misspellings like "trail" or unknown as Trial
  return 'Trial';
}

export function canAccess(opts: {
  userPlan: Plan | null | undefined;
  module: ModuleKey;
  userRole?: string | null;
  nodeEnv?: string; // injectable for tests
}) {
  const { userPlan, module, userRole, nodeEnv = process.env.NODE_ENV } = opts;
  const effectivePlan: Plan | null = normalizePlan(userPlan);

  // 1) Optional admin bypass (opt-in via env)
  if (ADMIN_OVERRIDE_ENABLED && userRole && ADMIN_ROLES.has(userRole)) {
    return true;
  }

  // 2) Dev unlock (only when not production)
  if (nodeEnv !== 'production' && DEV_UNLOCK_ALL) return true;

  // 3) Trial unlocks some modules even if required rank is Starter
  if (effectivePlan === 'Trial' && TRIAL_UNLOCK_MODULES.has(module)) return true;

  // 4) Production gating via rank compare (Trial < Starter < Pro < Business)
  const required = modulePlan[module];
  if (!effectivePlan) return false; // not logged in or unknown plan
  return RANK[effectivePlan] >= RANK[required];
}
