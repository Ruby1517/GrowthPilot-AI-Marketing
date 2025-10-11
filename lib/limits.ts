export const PLAN_LIMITS = {
  Starter: {
    postpilot_generated: 100,
    blogpilot_words: 20000,
    mailpilot_emails: 200,
    adpilot_variants: 50,
    clippilot_minutes: 15,
    viralpilot_minutes: 15,
    leadpilot_convos: 50,
    brandpilot_assets: 50,
  },
  Pro: {
    postpilot_generated: 1000,
    blogpilot_words: 200000,
    mailpilot_emails: 5000,
    adpilot_variants: 500,
    clippilot_minutes: 120,
    viralpilot_minutes: 120,
    leadpilot_convos: 500,
    brandpilot_assets: 500,
  },
  Business: {
    postpilot_generated: 10000,
    blogpilot_words: 2000000,
    mailpilot_emails: 50000,
    adpilot_variants: 5000,
    clippilot_minutes: 1000,
    viralpilot_minutes: 1000,
    leadpilot_convos: 5000,
    brandpilot_assets: 5000,
  },
} as const;

export const OVERAGE_PRICING = {
  blogpilot_words: 0.00001,      // $/word
  mailpilot_emails: 0.001,       // $/email
  clippilot_minutes: 0.05,       // 0.05 per extra render minute
  viralpilot_minutes: 0.05,
  postpilot_generated: 0.01,     // $/post
  adpilot_variants: 0.01,
  leadpilot_convos: 0.02,
  brandpilot_assets: 0.01,
} as const;


export type PlanKey = keyof typeof PLAN_LIMITS;
export type MeterKey = keyof typeof PLAN_LIMITS['Starter'];


// Canonical meter keys
export const USAGE_KEYS = {
  CLIPPILOT_MINUTES: 'clippilot_minutes' as MeterKey,
  VIRALPILOT_MINUTES: 'viralp ilot_minutes' as MeterKey, // if used
  POSTPILOT_GENERATED: 'postpilot_generated' as MeterKey,
  BLOGPILOT_WORDS: 'blogpilot_words' as MeterKey,
  MAILPILOT_EMAILS: 'mailpilot_emails' as MeterKey,
  ADPILOT_VARIANTS: 'adpilot_variants' as MeterKey,
  LEADPILOT_CONVOS: 'leadpilot_convos' as MeterKey,
  BRANDPILOT_ASSETS: 'brandpilot_assets' as MeterKey,
} as const;