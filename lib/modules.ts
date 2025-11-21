export type Plan = 'Trial' | 'Starter' | 'Pro' | 'Business';
export type ModuleKey =
  | 'postpilot' | 'clippilot' | 'blogpilot' | 'adpilot'
  | 'leadpilot' | 'mailpilot' | 'brandpilot' | 'viralpilot';

export type ModuleStatus = 'live' | 'coming_soon';

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

// Human-friendly labels for modules
export const moduleLabels: Record<ModuleKey, string> = {
  postpilot: 'PostPilot',
  clippilot: 'ClipPilot',
  blogpilot: 'BlogPilot',
  adpilot: 'AdPilot',
  leadpilot: 'LeadPilot',
  mailpilot: 'MailPilot',
  brandpilot: 'BrandPilot',
  viralpilot: 'ViralPilot',
};

export const moduleStatus: Record<ModuleKey, ModuleStatus> = {
  postpilot: 'live',
  clippilot: 'coming_soon',
  blogpilot: 'live',
  adpilot: 'live',
  leadpilot: 'live',
  mailpilot: 'live',
  brandpilot: 'live',
  viralpilot: 'coming_soon',
};

// Dev switch: unlock all modules locally or in preview if you want
export const DEV_UNLOCK_ALL =
  process.env.NEXT_PUBLIC_DEV_UNLOCK_ALL === 'true';

// Simple role override (e.g., admin bypass)
export const ADMIN_ROLES = new Set(['admin', 'owner']);
