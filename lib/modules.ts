export type Plan = 'Trial' | 'Starter' | 'Pro' | 'Business';
export type ModuleKey =
  | 'postpilot' | 'clippilot' | 'blogpilot' | 'adpilot'
  | 'leadpilot' | 'mailpilot' | 'brandpilot';

export type ModuleStatus = 'live' | 'coming_soon';

export const modulePlan: Record<ModuleKey, Plan> = {
  // All modules accessible on Trial; usage is governed by PLAN_LIMITS caps.
  postpilot: 'Trial',
  clippilot: 'Trial',
  blogpilot: 'Trial',
  adpilot: 'Trial',
  leadpilot: 'Trial',
  mailpilot: 'Trial',
  brandpilot: 'Trial',
};

// Human-friendly labels for modules
export const moduleLabels: Record<ModuleKey, string> = {
  postpilot: 'PostPilot',
  clippilot: 'ClipPilot',
  blogpilot: 'BlogPilot',
  adpilot: 'AdPilot',
  leadpilot: 'LeadPilot',
  mailpilot: 'MailPilot',
  brandpilot: 'BrandPilot',
};

export const moduleStatus: Record<ModuleKey, ModuleStatus> = {
  postpilot: 'live',
  clippilot: 'live',
  blogpilot: 'live',
  adpilot: 'live',
  leadpilot: 'live',
  mailpilot: 'live',
  brandpilot: 'live',
};

// Dev switch: unlock all modules locally or in preview if you want
export const DEV_UNLOCK_ALL =
  process.env.NEXT_PUBLIC_DEV_UNLOCK_ALL === 'true';

// Simple role override (e.g., admin bypass)
export const ADMIN_ROLES = new Set(['admin', 'owner']);
