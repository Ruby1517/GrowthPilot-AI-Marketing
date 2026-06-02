export type ModuleKey =
  | 'postpilot' | 'blogpilot' | 'adpilot'
  | 'leadpilot' | 'mailpilot';

export type TaskKind =
  | 'text.generate'
  | 'image.generate'
  | 'embedding.create'
  | 'moderation.check';

export type ProviderId = 'openai:text' | 'openai:image' | 'openai:embedding' | 'openai:moderation';

export type ModelSpec = { provider: ProviderId; model: string };

// Central defaults per (module, task).
// You can safely change models per plan or taste.
export const ROUTING: Record<ModuleKey, Partial<Record<TaskKind, ModelSpec>>> = {
  blogpilot: {
    'text.generate':     { provider: 'openai:text',      model: process.env.BLOGPILOT_MODEL      || 'gpt-4o-mini' },
    'moderation.check':  { provider: 'openai:moderation',model: process.env.MODERATION_MODEL     || 'omni-moderation-latest' },
    'embedding.create':  { provider: 'openai:embedding', model: process.env.EMBED_MODEL          || 'text-embedding-3-large' },
  },
  postpilot: {
    'text.generate':     { provider: 'openai:text',      model: process.env.POSTPILOT_MODEL      || 'gpt-4o-mini' },
    'image.generate':    { provider: 'openai:image',     model: process.env.POSTPILOT_IMAGE_MODEL|| 'gpt-image-1' },
    'moderation.check':  { provider: 'openai:moderation',model: process.env.MODERATION_MODEL     || 'omni-moderation-latest' },
  },
  adpilot: {
    'text.generate':     { provider: 'openai:text',      model: process.env.ADPILOT_MODEL        || 'gpt-4o-mini' },
    'moderation.check':  { provider: 'openai:moderation',model: process.env.MODERATION_MODEL     || 'omni-moderation-latest' },
  },
  mailpilot: {
    'text.generate':     { provider: 'openai:text',      model: process.env.MAILPILOT_MODEL      || 'gpt-4o-mini' },
    'moderation.check':  { provider: 'openai:moderation',model: process.env.MODERATION_MODEL     || 'omni-moderation-latest' },
  },
  leadpilot: {
    'text.generate':     { provider: 'openai:text',      model: process.env.LEADPILOT_MODEL      || 'gpt-4o-mini' },
    'embedding.create':  { provider: 'openai:embedding', model: process.env.EMBED_MODEL          || 'text-embedding-3-large' },
    'moderation.check':  { provider: 'openai:moderation',model: process.env.MODERATION_MODEL     || 'omni-moderation-latest' },
  },
};

// Optional per-plan overrides
export type Plan = 'Starter' | 'Pro' | 'Business';
export const PLAN_MODEL_OVERRIDES: Partial<Record<Plan, Partial<Record<TaskKind, ModelSpec>>>> = {
  Starter: {
    'text.generate':     { provider: 'openai:text', model: process.env.STARTER_TEXT_MODEL || 'gpt-4o-mini' },
  },
  Pro: {
    'text.generate':     { provider: 'openai:text', model: process.env.PRO_TEXT_MODEL     || 'gpt-4.1-mini' },
  },
  Business: {
    // gpt-5-mini is default; set BIZ_TEXT_MODEL=gpt-4.1 if you prefer longer-context SEO generations
    'text.generate':     { provider: 'openai:text', model: process.env.BIZ_TEXT_MODEL     || 'gpt-5-mini'   },
  },
};

// The resolver: (module, task, plan, orgOverrides?) -> ModelSpec
export function resolveModelSpec(params: {
  module: ModuleKey;
  task: TaskKind;
  plan?: Plan;
  orgOverrides?: Partial<Record<TaskKind, ModelSpec>> | null;
}): ModelSpec {
  const base = ROUTING[params.module]?.[params.task];
  if (!base) throw new Error(`No base routing for ${params.module}:${params.task}`);

  // 1) Org-level override (from DB), if present
  if (params.orgOverrides?.[params.task]) return params.orgOverrides[params.task]!;

  // 2) Plan-level override
  if (params.plan && PLAN_MODEL_OVERRIDES[params.plan]?.[params.task]) {
    return PLAN_MODEL_OVERRIDES[params.plan]![params.task]!;
  }

  // 3) Fallback to base routing
  return base;
}
