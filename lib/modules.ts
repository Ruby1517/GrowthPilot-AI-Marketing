export type Plan = 'Trial' | 'Starter' | 'Pro' | 'Business';
export type ModuleKey =
  | 'postpilot' | 'blogpilot' | 'adpilot'
  | 'leadpilot' | 'mailpilot';

export type ModuleStatus = 'live' | 'coming_soon';

export const modulePlan: Record<ModuleKey, Plan> = {
  postpilot: 'Trial',
  blogpilot: 'Trial',
  adpilot: 'Trial',
  leadpilot: 'Trial',
  mailpilot: 'Trial',
};

export const moduleLabels: Record<ModuleKey, string> = {
  postpilot: 'PostPilot',
  blogpilot: 'BlogPilot',
  adpilot: 'AdPilot',
  leadpilot: 'LeadPilot',
  mailpilot: 'MailPilot',
};

export const moduleStatus: Record<ModuleKey, ModuleStatus> = {
  postpilot: 'live',
  blogpilot: 'live',
  adpilot: 'live',
  leadpilot: 'live',
  mailpilot: 'live',
};

// Dev switch: unlock all modules locally or in preview if you want
export const DEV_UNLOCK_ALL =
  process.env.NEXT_PUBLIC_DEV_UNLOCK_ALL === 'true';

// Platform-level role that bypasses plan gating
export const ADMIN_ROLES = new Set(['superadmin']);
