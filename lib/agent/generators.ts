import OpenAI from 'openai'
import { generatePlatformPost } from '@/lib/generators/postpilot'

function client() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

async function jsonChat(prompt: string, system: string): Promise<any> {
  const resp = await client().chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  })
  try {
    return JSON.parse(resp.choices[0]?.message?.content ?? '{}')
  } catch {
    return { error: 'Failed to parse response' }
  }
}

// ── Blog ─────────────────────────────────────────────────────────────────────

export async function runBlogGenerator({
  topic, keywords, tone = 'professional',
}: {
  topic: string
  keywords: string[]
  tone?: string
}) {
  const prompt = `Write an SEO blog post.

Topic: ${topic}
Target keywords: ${keywords.join(', ')}
Tone: ${tone}

Return JSON:
{
  "title": "Final headline (H1)",
  "metaDescription": "155-char SEO meta description",
  "outline": ["Section 1 heading", "Section 2 heading", "..."],
  "draft": "Full blog post in markdown (700–1000 words). Use the keywords naturally. Include a CTA at the end."
}`

  return jsonChat(prompt, 'You are an expert SEO content writer. Return only valid JSON.')
}

// ── Social Posts ──────────────────────────────────────────────────────────────

export async function runSocialGenerator({
  brief, platforms, count = 1, company, audience,
}: {
  brief: string
  platforms: string[]
  count?: number
  company?: string
  audience?: string
}) {
  const validPlatforms = ['instagram', 'tiktok', 'linkedin', 'x', 'facebook'] as const
  type Platform = typeof validPlatforms[number]

  const filtered = platforms.filter((p): p is Platform => validPlatforms.includes(p as Platform)).slice(0, 4)
  const results: any[] = []

  for (const platform of filtered) {
    for (let i = 0; i < Math.min(count, 2); i++) {
      const post = await generatePlatformPost({
        topic: brief,
        platform,
        industry: company || 'General',
        audience: audience || 'General audience',
        voice: 'Friendly',
      })
      results.push({ ...post, variant: i + 1 })
    }
  }

  return { posts: results }
}

// ── Ads ───────────────────────────────────────────────────────────────────────

export async function runAdGenerator({
  offer, platforms, angle = 'benefit',
}: {
  offer: string
  platforms: string[]
  angle?: string
}) {
  const prompt = `Generate performance ad copy.

Offer: ${offer}
Platforms: ${platforms.join(', ')}
Creative angle: ${angle}

Return JSON:
{
  "ads": [
    {
      "platform": "meta|google|tiktok",
      "headline": "Primary headline (max 40 chars for Google, 125 for Meta)",
      "body": "Ad body copy (1–3 sentences)",
      "hook": "First 3 seconds hook for video/feed",
      "cta": "Call to action text",
      "audience": "Targeting description"
    }
  ]
}`

  return jsonChat(prompt, 'You are an expert performance marketer. Return only valid JSON.')
}

// ── Email ─────────────────────────────────────────────────────────────────────

export async function runEmailGenerator({
  type, offer, steps = 3, audience,
}: {
  type: string
  offer: string
  steps?: number
  audience?: string
}) {
  const prompt = `Write a ${type} email sequence.

Offer / goal: ${offer}
Audience: ${audience || 'General audience'}
Number of emails: ${Math.min(steps, 5)}

Return JSON:
{
  "emails": [
    {
      "step": 1,
      "subject": "Email subject line",
      "preheader": "Preview text (max 90 chars)",
      "body": "Full email body in plain text. Use \\n for line breaks. Include a clear CTA."
    }
  ]
}`

  return jsonChat(prompt, 'You are an expert email copywriter. Return only valid JSON.')
}

// ── Lead Chatbot ──────────────────────────────────────────────────────────────

export async function runLeadChatbotGenerator({
  product, goal,
}: {
  product: string
  goal: string
}) {
  const prompt = `Create a lead capture chatbot configuration.

Product/service: ${product}
Conversion goal: ${goal}

Return JSON:
{
  "greeting": "Opening message the chatbot sends",
  "questions": ["Question 1", "Question 2", "Question 3"],
  "cta": "Final CTA message with next step",
  "systemPrompt": "Full system prompt for the chatbot (2–4 sentences describing persona, goal, and tone)",
  "embedInstructions": "One-sentence tip for where to embed this chatbot"
}`

  return jsonChat(prompt, 'You are an expert in conversational marketing. Return only valid JSON.')
}
