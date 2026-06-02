import OpenAI from 'openai'

export type ResearchResult = {
  topic: string
  angle: string            // Best content angle to take
  keywords: string[]       // SEO keywords to target (8-12)
  questions: string[]      // Key questions this content should answer (5-8)
  gaps: string[]           // What existing content misses (3-5)
  competitorAngles: string[] // Angles already covered — differentiate from these
  enrichedBrief: string    // Ready-to-use brief for any GrowthPilot module
  suggestedTitle: string   // Suggested H1 / post title
  targetAudience: string   // Who this content is really for
}

const SYSTEM = `You are a senior content strategist and SEO expert.
Given a topic and optional URL context, produce a research brief that will make AI-generated marketing content genuinely useful and competitive.

Focus on:
- Finding the best angle that differentiates from generic content
- Identifying what questions the target audience is actually asking
- Spotting gaps in existing content on this topic
- Surfacing keywords that are specific enough to rank but broad enough to matter

Return ONLY valid JSON. No extra prose.`

async function fetchUrlContext(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'GrowthPilotResearchBot/1.0' },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)
    return text || null
  } catch {
    return null
  }
}

export async function runResearch({
  topic,
  url,
  targetAudience,
  module,
}: {
  topic: string
  url?: string
  targetAudience?: string
  module?: 'postpilot' | 'blogpilot' | 'adpilot' | 'mailpilot' | 'leadpilot' | 'any'
}): Promise<ResearchResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const urlContext = url ? await fetchUrlContext(url) : null

  const moduleHint = module && module !== 'any'
    ? `The content will be used for: ${module === 'postpilot' ? 'social media posts' : module === 'blogpilot' ? 'an SEO blog post' : module === 'adpilot' ? 'paid ad copy' : module === 'mailpilot' ? 'an email campaign' : 'lead generation'}.`
    : 'This research will be used to create marketing content across channels.'

  const userPrompt = `
Topic: ${topic}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${urlContext ? `URL context (scraped content):\n${urlContext}` : ''}
${moduleHint}

Research this topic and return a JSON object:
{
  "topic": "cleaned/refined version of the topic",
  "angle": "The single best content angle — what makes this piece different and more useful than generic content on this topic",
  "keywords": ["primary keyword", "secondary keyword", "long-tail keyword", ...],
  "questions": ["Question 1 the audience is actually asking", "Question 2", ...],
  "gaps": ["Gap 1 — what existing content fails to cover", "Gap 2", ...],
  "competitorAngles": ["Common angle 1 to avoid repeating", "Common angle 2", ...],
  "enrichedBrief": "A detailed 3-5 sentence brief that incorporates the best angle, key questions, and target audience. Ready to paste directly into any content generator.",
  "suggestedTitle": "A specific, compelling title (not generic)",
  "targetAudience": "Refined description of who this content is really for"
}

Be specific. Avoid vague statements. Keywords should be real phrases people search for.`

  const resp = await openai.chat.completions.create({
    model: process.env.RESEARCH_MODEL || 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: userPrompt },
    ],
    temperature: 0.4,
  })

  try {
    const parsed = JSON.parse(resp.choices[0]?.message?.content ?? '{}')
    return {
      topic:              parsed.topic              ?? topic,
      angle:              parsed.angle              ?? '',
      keywords:           Array.isArray(parsed.keywords)          ? parsed.keywords          : [],
      questions:          Array.isArray(parsed.questions)         ? parsed.questions         : [],
      gaps:               Array.isArray(parsed.gaps)              ? parsed.gaps              : [],
      competitorAngles:   Array.isArray(parsed.competitorAngles)  ? parsed.competitorAngles  : [],
      enrichedBrief:      parsed.enrichedBrief      ?? '',
      suggestedTitle:     parsed.suggestedTitle      ?? '',
      targetAudience:     parsed.targetAudience      ?? targetAudience ?? '',
    }
  } catch {
    return {
      topic, angle: '', keywords: [], questions: [], gaps: [],
      competitorAngles: [], enrichedBrief: topic, suggestedTitle: '',
      targetAudience: targetAudience ?? '',
    }
  }
}
