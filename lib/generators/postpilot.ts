import OpenAI from 'openai';

export type PostSpec = {
  topic: string;
  voice?: 'Friendly' | 'Professional' | 'Witty' | 'Inspirational' | 'Authoritative';
  language?: string; // e.g., 'en-US'
  platform: 'instagram' | 'tiktok' | 'linkedin' | 'x'| 'facebook';
  industry?: string;
  offers?: string;
  audience?: string;
  sourceSummary?: string | null;
  sourceUrl?: string | null;
};

export type GeneratedPost = {
  platform: PostSpec['platform'];
  headline: string;
  caption: string;
  hashtags: string[];   // tokens only, no leading '#'
  altText: string;      // 1–2 sentence image alt text
  visualIdeas: string[];// 1–3 short visual ideas / concepts
  visualPrompt: string; // one-line prompt for AI image generation
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
};

const PLATFORM_CFG = {
  instagram: { max: 2200, hashMax: 8 },
  tiktok:    { max: 2200, hashMax: 6 },
  linkedin:  { max: 3000, hashMax: 3 },
  x:         { max: 280,  hashMax: 4 },
  facebook:  { max: 63206, hashMax: 8 },
} as const;

const SYSTEM = `You are PostPilot, an expert social copywriter.
Write platform-native posts; respect character limits; be brand-safe; never invent facts.
Always include hashtags (tokens, no leading #), altText, a punchy HEADLINE, and 1–3 visual suggestions.
If SOURCE_SUMMARY is provided, use it to stay factual.
Return ONLY valid JSON (no extra prose).`;

export async function generatePlatformPost(
  spec: PostSpec,
  {
    model = 'gpt-4o-mini',
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }),
  }: { model?: string; client?: OpenAI } = {}
): Promise<GeneratedPost> {
  const p = spec.platform;
  const cfg = PLATFORM_CFG[p];

  const userPrompt = `
TOPIC/BRIEF: ${spec.topic}
VOICE: ${spec.voice ?? 'Friendly'}
LANGUAGE: ${spec.language ?? 'en-US'}
  PLATFORM: ${p} (max ${cfg.max} chars, hashtags ≤ ${cfg.hashMax})
  INDUSTRY: ${spec.industry || 'General'}
  OFFERS: ${spec.offers || 'None'}
  TARGET AUDIENCE: ${spec.audience || 'General social audience'}
  SOURCE SUMMARY: ${spec.sourceSummary ? spec.sourceSummary.slice(0, 1800) : 'N/A'}

Return JSON matching exactly:
{
  "platform": "instagram|tiktok|linkedin|x",
  "headline": "string (max 120 chars, on-brand teaser)",
  "caption": "string (within platform limit)",
  "hashtags": ["growth","ai","marketing"],  // tokens, NO leading '#'
  "altText": "1–2 sentence image alt text",
  "visualIdeas": ["1–3 short visual ideas"],
  "visualPrompt": "one-sentence detailed prompt for an AI image"
}`.trim();

  const resp = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt },
    ],
  });

  let data: any = {};
  try { data = JSON.parse(resp.choices[0]?.message?.content ?? '{}'); } catch {}

  // normalize & clamp
  const headline = String(data.headline ?? '').slice(0, 120);
  const caption = String(data.caption ?? '').slice(0, cfg.max);
  const hashtags = Array.isArray(data.hashtags)
    ? data.hashtags.slice(0, cfg.hashMax).map((h: string) => h.replace(/^#/,'').trim()).filter(Boolean)
    : [];
  const altText = String(data.altText ?? '');
  const visualIdeas = Array.isArray(data.visualIdeas || data.suggestions)
    ? (data.visualIdeas || data.suggestions).slice(0, 3)
    : [];
  const visualPrompt = String(data.visualPrompt || visualIdeas?.[0] || `${spec.platform} social post about ${spec.topic}`);

  const usage = {
    inputTokens: resp.usage?.prompt_tokens ?? 0,
    outputTokens: resp.usage?.completion_tokens ?? 0,
    totalTokens: (resp.usage?.prompt_tokens ?? 0) + (resp.usage?.completion_tokens ?? 0),
  };

  return { platform: p, headline, caption, hashtags, altText, visualIdeas, visualPrompt, usage };
}
