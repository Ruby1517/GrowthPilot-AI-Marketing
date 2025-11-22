import type { Plan } from '@/lib/modules';

export type FeatureKey = 'team_management' | 'api_access' | 'sla' | 'demo_mode';

// Minimum plan required per feature
export const featurePlan: Record<FeatureKey, Plan> = {
  team_management: 'Business',
  api_access: 'Business',
  sla: 'Business',
  demo_mode: 'Trial',
};

const RANK: Record<Plan, number> = { Trial: 0, Starter: 1, Pro: 2, Business: 3 };

export function hasFeature(plan: Plan, feature: FeatureKey) {
  return RANK[plan] >= RANK[featurePlan[feature]];
}
