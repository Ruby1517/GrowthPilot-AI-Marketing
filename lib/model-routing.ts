// /lib/model-routing.ts
export type ModuleKey =
  | 'postpilot' | 'clippilot' | 'blogpilot' | 'adpilot'
  | 'leadpilot' | 'mailpilot' | 'brandpilot' | 'viralpilot';

export type TaskKind =
  | 'text.generate'       // structured writing (BlogPilot, PostPilot captions, Ad copy)
  | 'image.generate'      // thumbnails, logos, hero images
  | 'embedding.create'    // search/ranking
  | 'moderation.check'    // safety gate
  | 'speech.synthesize';  // ElevenLabs TTS

export type ProviderId = 'openai:text' | 'openai:image' | 'openai:embedding' | 'openai:moderation' | 'elevenlabs:tts';

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
  brandpilot: {
    'image.generate':    { provider: 'openai:image',     model: process.env.BRANDPILOT_IMAGE_MODEL|| 'gpt-image-1' },
    'text.generate':     { provider: 'openai:text',      model: process.env.BRANDPILOT_TEXT_MODEL || 'gpt-4o-mini' },
  },
  clippilot: {
    'speech.synthesize': { provider: 'elevenlabs:tts',   model: process.env.ELEVENLABS_MODEL     || 'eleven_multilingual_v2' },
    'text.generate':     { provider: 'openai:text',      model: process.env.CLIPPILOT_SCRIPT_MODEL|| 'gpt-4o-mini' },
  },
  viralpilot: {
    'speech.synthesize': { provider: 'elevenlabs:tts',   model: process.env.ELEVENLABS_MODEL     || 'eleven_multilingual_v2' },
    'text.generate':     { provider: 'openai:text',      model: process.env.VIRALPILOT_SCRIPT_MODEL|| 'gpt-4o-mini' },
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
    'text.generate':     { provider: 'openai:text', model: process.env.PRO_TEXT_MODEL     || 'gpt-4o'      },
  },
  Business: {
    'text.generate':     { provider: 'openai:text', model: process.env.BIZ_TEXT_MODEL     || 'gpt-4.1'     },
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
