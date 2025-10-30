import OpenAI from 'openai';

export type PostSpec = {
  topic: string;
  voice?: 'Friendly' | 'Professional' | 'Witty' | 'Inspirational' | 'Authoritative';
  language?: string; // e.g., 'en-US'
  platform: 'instagram' | 'tiktok' | 'linkedin' | 'x'| 'facebook';
};

export type GeneratedPost = {
  platform: PostSpec['platform'];
  caption: string;
  hashtags: string[];   // tokens only, no leading '#'
  altText: string;      // 1–2 sentence image alt text
  suggestions: string[];// 1–3 short visual ideas
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
};

const PLATFORM_CFG = {
  instagram: { max: 2200, hashMax: 8 },
  tiktok:    { max: 2200, hashMax: 6 },
  linkedin:  { max: 3000, hashMax: 3 },
  x:         { max: 280,  hashMax: 4 },
} as const;

const SYSTEM = `You are PostPilot, an expert social copywriter.
Write platform-native posts; respect character limits; be brand-safe; never invent facts.
Always include hashtags (tokens, no leading #), altText, and 1–3 visual suggestions.
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

Return JSON matching exactly:
{
  "platform": "instagram|tiktok|linkedin|x",
  "caption": "string (within platform limit)",
  "hashtags": ["growth","ai","marketing"],  // tokens, NO leading '#'
  "altText": "1–2 sentence image alt text",
  "suggestions": ["1–3 short visual ideas"]
}`.trim();

  const resp = await client.chat.completions.create({
    model,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt },
    ],
  });

  let data: any = {};
  try { data = JSON.parse(resp.choices[0]?.message?.content ?? '{}'); } catch {}

  // normalize & clamp
  const caption = String(data.caption ?? '').slice(0, cfg.max);
  const hashtags = Array.isArray(data.hashtags)
    ? data.hashtags.slice(0, cfg.hashMax).map((h: string) => h.replace(/^#/,'').trim()).filter(Boolean)
    : [];
  const altText = String(data.altText ?? '');
  const suggestions = Array.isArray(data.suggestions) ? data.suggestions.slice(0, 3) : [];

  const usage = {
    inputTokens: resp.usage?.prompt_tokens ?? 0,
    outputTokens: resp.usage?.completion_tokens ?? 0,
    totalTokens: (resp.usage?.prompt_tokens ?? 0) + (resp.usage?.completion_tokens ?? 0),
  };

  return { platform: p, caption, hashtags, altText, suggestions, usage };
}
