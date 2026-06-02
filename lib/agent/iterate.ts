import OpenAI from 'openai'

export type IterateModule = 'postpilot' | 'blogpilot' | 'adpilot' | 'mailpilot' | 'leadpilot'

export type IterateResult = {
  content: any
  explanation: string
}

// Module-specific instructions so the LLM knows the content shape and constraints
const MODULE_CONTEXT: Record<IterateModule, string> = {
  postpilot: `You are refining social media post content.
Content is a single post object with: platform, headline, caption, hashtags (array of tokens, no #), altText, visualIdeas.
Constraints: respect platform character limits (X: 280, Instagram/TikTok: 2200, LinkedIn: 3000, Facebook: 63206).
Keep hashtags as plain tokens without the # symbol.
Preserve all fields; only change what the feedback requires.`,

  blogpilot: `You are refining an SEO blog post.
Content has: title (H1), metaDescription (max 155 chars), outline (array of section headings), draft (full markdown text).
Preserve markdown formatting, heading structure, and internal links.
Only modify what the feedback requires. Do not remove sections unless asked.`,

  adpilot: `You are refining paid ad copy.
Content has: platforms object (meta, google, tiktok) each with variant arrays containing: angle, hook, primaryText, headlines (array), descriptions (array), cta, audience, creativeIdeas, utm.
Keep all platform variants; only apply feedback to the relevant ones (or all if feedback is global).
Preserve UTM structure.`,

  mailpilot: `You are refining an email sequence.
Content has: emails (array) each with: step (number), subject, preheader, body (plain text with \\n), htmlBody (optional).
Keep all emails in the sequence; only modify what the feedback requires.
Keep plain-text body clean — no HTML tags in the body field.`,

  leadpilot: `You are refining a lead capture chatbot configuration.
Content has: greeting, questions (array), cta, systemPrompt, embedInstructions.
Keep the conversational tone friendly and on-brand.`,
}

export async function iterateContent({
  module,
  content,
  feedback,
  brief,
}: {
  module: IterateModule
  content: any
  feedback: string
  brief?: string
}): Promise<IterateResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const moduleCtx = MODULE_CONTEXT[module] || 'You are refining marketing content.'

  const system = `${moduleCtx}

You MUST return a JSON object with exactly two keys:
- "content": the updated content object (same shape as input, with your changes applied)
- "explanation": a single short sentence describing what you changed and why

Do not add commentary outside the JSON. Do not change the content structure or rename fields.`

  const user = [
    brief ? `Original brief: ${brief}` : '',
    '',
    `Current content:`,
    JSON.stringify(content, null, 2),
    '',
    `User feedback: ${feedback}`,
    '',
    'Apply the feedback. Return the updated content object and a one-sentence explanation.',
  ].filter(s => s !== undefined).join('\n')

  const resp = await openai.chat.completions.create({
    model: process.env.ITERATE_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: user },
    ],
    temperature: 0.4,
  })

  const raw = resp.choices[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(raw)
    return {
      content:     parsed.content     ?? content,
      explanation: parsed.explanation ?? 'Content updated.',
    }
  } catch {
    return { content, explanation: 'Could not parse response — content unchanged.' }
  }
}
