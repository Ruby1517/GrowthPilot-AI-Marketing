// /lib/access.ts
import { modulePlan, DEV_UNLOCK_ALL, ADMIN_ROLES, Plan, ModuleKey } from './modules';

export function canAccess(opts: {
  userPlan: Plan | null | undefined;
  module: ModuleKey;
  userRole?: string | null;
  nodeEnv?: string; // injectable for tests
}) {
  const { userPlan, module, userRole, nodeEnv = process.env.NODE_ENV } = opts;

  // 1) Admin bypass
  if (userRole && ADMIN_ROLES.has(userRole)) return true;

  // 2) Dev unlock (only when not production)
  if (nodeEnv !== 'production' && DEV_UNLOCK_ALL) return true;

  // 3) Production gating
  const required = modulePlan[module];
  if (!userPlan) return false; // not logged in or unknown plan

  if (userPlan === 'Business') return true;
  if (userPlan === 'Pro') return required === 'Starter' || required === 'Pro';
  return required === 'Starter';
}
