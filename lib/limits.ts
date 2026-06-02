export const PLAN_LIMITS = {
  Trial: {
    postpilot_generated: 10,
    blogpilot_words: 5000,
    mailpilot_emails: 3,
    adpilot_variants: 5,
    leadpilot_convos: 10,

    watermark: true,
    priority_processing: false,
    team_seats: 1,
    api_access: false,
  },

  Starter: {
    postpilot_generated: 200,
    blogpilot_words: 50000,
    mailpilot_emails: 50,
    adpilot_variants: 50,
    leadpilot_convos: 50,

    watermark: false,
    priority_processing: false,
    team_seats: 1,
    api_access: false,
  },

  Pro: {
    postpilot_generated: 2000,
    blogpilot_words: 500000,
    mailpilot_emails: 2000,
    adpilot_variants: 500,
    leadpilot_convos: 1000,

    watermark: false,
    priority_processing: true,
    team_seats: 3,
    api_access: false,
  },

  Business: {
    postpilot_generated: 20000,
    blogpilot_words: 2000000,
    mailpilot_emails: 20000,
    adpilot_variants: 5000,
    leadpilot_convos: 5000,

    watermark: false,
    priority_processing: true,
    team_seats: 10,
    api_access: true,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;
export type MeterKey = keyof typeof PLAN_LIMITS['Starter'];
export type PlanLimitKey = keyof typeof PLAN_LIMITS;

export const USAGE_KEYS = {
  POSTPILOT_GENERATED: 'postpilot_generated' as MeterKey,
  BLOGPILOT_WORDS: 'blogpilot_words' as MeterKey,
  MAILPILOT_EMAILS: 'mailpilot_emails' as MeterKey,
  ADPILOT_VARIANTS: 'adpilot_variants' as MeterKey,
  LEADPILOT_CONVOS: 'leadpilot_convos' as MeterKey,
} as const;

export const OVERAGE_PRICING = {
  blogpilot_words: 0.00001,
  mailpilot_emails: 0.001,
  postpilot_generated: 0.01,
  adpilot_variants: 0.01,
  leadpilot_convos: 0.02,
} as const;

export function getPlanCap(plan: PlanKey, key: MeterKey) {
  return PLAN_LIMITS[plan][key];
}
export function getOveragePrice(key: keyof typeof OVERAGE_PRICING) {
  return OVERAGE_PRICING[key];
}
