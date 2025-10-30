import { modulePlan, DEV_UNLOCK_ALL, ADMIN_ROLES, Plan, ModuleKey } from './modules';

const RANK: Record<Plan, number> = { Trial: 0, Starter: 1, Pro: 2, Business: 3 };

export function canAccess(opts: {
  userPlan: Plan | null | undefined;
  module: ModuleKey;
  userRole?: string | null;
  nodeEnv?: string; // injectable for tests
}) {
  const { userPlan, module, userRole, nodeEnv = process.env.NODE_ENV } = opts;

  // 1) Admin bypass (disabled on Trial plan)
  if (userRole && ADMIN_ROLES.has(userRole) && userPlan !== 'Trial') return true;

  // 2) Dev unlock (only when not production)
  if (nodeEnv !== 'production' && DEV_UNLOCK_ALL) return true;

  // 3) Production gating via rank compare (Trial < Starter < Pro < Business)
  const required = modulePlan[module];
  if (!userPlan) return false; // not logged in or unknown plan
  return RANK[userPlan] >= RANK[required];
}
