// /lib/modules.ts
export type Plan = 'Starter' | 'Pro' | 'Business';
export type ModuleKey =
  | 'postpilot' | 'clippilot' | 'blogpilot' | 'adpilot'
  | 'leadpilot' | 'mailpilot' | 'brandpilot' | 'viralpilot';

export const modulePlan: Record<ModuleKey, Plan> = {
  postpilot: 'Starter',
  clippilot: 'Pro',
  blogpilot: 'Starter',
  adpilot: 'Pro',
  leadpilot: 'Business',
  mailpilot: 'Pro',
  brandpilot: 'Business',
  viralpilot: 'Pro',
};

// Dev switch: unlock all modules locally or in preview if you want
export const DEV_UNLOCK_ALL =
  process.env.NEXT_PUBLIC_DEV_UNLOCK_ALL === 'true';

// Simple role override (e.g., admin bypass)
export const ADMIN_ROLES = new Set(['admin', 'owner']);
