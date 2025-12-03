export const PLAN_LIMITS = {
  Trial: {
    // Free plan (mapped from "Free" in billing)
    postpilot_generated: 10,
    blogpilot_words: 5000,
    mailpilot_emails: 3,
    adpilot_variants: 5,
    clippilot_exports: 3,        // Up to 3 shorts / month
    leadpilot_convos: 10,
    brandpilot_assets: 3,

    watermark: true,             // Billing page reads this
    video_length_upload: 60,     // ~1 min max upload (seconds)
    priority_processing: false,
    team_seats: 1,
    api_access: false,
  },

  Starter: {
    postpilot_generated: 200,
    blogpilot_words: 50000,
    mailpilot_emails: 50,
    adpilot_variants: 50,
    clippilot_exports: 30,       // Up to 30 shorts / month
    leadpilot_convos: 50,
    brandpilot_assets: 20,

    watermark: false,
    video_length_upload: 180,    // ~3 min
    priority_processing: false,
    team_seats: 1,
    api_access: false,
  },

  Pro: {
    postpilot_generated: 2000,
    blogpilot_words: 500000,
    mailpilot_emails: 2000,
    adpilot_variants: 500,
    clippilot_exports: 100,      // Up to 100 shorts / month
    leadpilot_convos: 1000,
    brandpilot_assets: 200,

    watermark: false,
    video_length_upload: 600,    // ~10 min
    priority_processing: true,
    team_seats: 3,
    api_access: false,
  },

  Business: {
    postpilot_generated: 20000,
    blogpilot_words: 2000000,
    mailpilot_emails: 20000,
    adpilot_variants: 5000,
    clippilot_exports: 500,      // 500+ shorts / month
    leadpilot_convos: 5000,
    brandpilot_assets: 2000,

    watermark: false,
    video_length_upload: 1800,   // ~30 min
    priority_processing: true,
    team_seats: 10,
    api_access: true,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;
export type MeterKey = keyof typeof PLAN_LIMITS['Starter'];
export type PlanLimitKey = keyof typeof PLAN_LIMITS; // "Trial" | "Starter" | "Pro" | "Business"

// Canonical meter keys
export const USAGE_KEYS = {
  CLIPPILOT_EXPORTS: 'clippilot_exports' as MeterKey,
  POSTPILOT_GENERATED: 'postpilot_generated' as MeterKey,
  BLOGPILOT_WORDS: 'blogpilot_words' as MeterKey,
  MAILPILOT_EMAILS: 'mailpilot_emails' as MeterKey,
  ADPILOT_VARIANTS: 'adpilot_variants' as MeterKey,
  LEADPILOT_CONVOS: 'leadpilot_convos' as MeterKey,
  BRANDPILOT_ASSETS: 'brandpilot_assets' as MeterKey,
} as const;

export const OVERAGE_PRICING = {
  blogpilot_words: 0.00001,      // $/word
  mailpilot_emails: 0.001,       // $/email
  clippilot_exports: 0.05,       // per extra rendered clip
  postpilot_generated: 0.01,     // $/post
  adpilot_variants: 0.01,
  leadpilot_convos: 0.02,
  brandpilot_assets: 0.01,
} as const;

// Handy helpers:
export function getPlanCap(plan: PlanKey, key: MeterKey) {
  return PLAN_LIMITS[plan][key];
}
export function getOveragePrice(key: keyof typeof OVERAGE_PRICING) {
  return OVERAGE_PRICING[key];
}
