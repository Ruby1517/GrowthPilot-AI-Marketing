import OpenAI from 'openai'
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })


export type GenInput = {
  topic: string
  tone: 'casual'|'professional'|'witty'|'inspirational'|'authoritative'
  platforms: Array<'instagram'|'tiktok'|'linkedin'|'x'>
}

export const SYSTEM = `You are PostPilot, an assistant that writes platform-aware social posts.
Rules:
- Tailor voice and length per platform.
- Add concise, high-signal hashtags (3-8) relevant to topic; never spam.
- Always include an image alt text suggestion.
- Provide 1-3 visual/image ideas ("suggestions") for thumbnails/photos. 
- Respect tone exactly. Avoid emojis unless platform benefits (IG/TikTok ok; LinkedIn minimal; X sparing).
- For TikTok output caption only (no #TikTok, no camera directions).
- Never fabricate statistics; be generic if uncertain.`

export function platformStyle(p: string) {
  switch (p) {
    case 'instagram': return 'Instagram: punchy 1–2 sentences, optional emojis, include 5–8 relevant hashtags.'
    case 'tiktok':    return 'TikTok caption: 1 sentence hook + 3–6 compact hashtags.'
    case 'linkedin':  return 'LinkedIn: 2–4 sentences, value-first, professional, no more than 3 hashtags.'
    case 'x':         return 'X (Twitter): <= 240 chars, crisp, 2–4 hashtags max.'
    default:          return ''
  }
}

export function costUSD(model: string, inTok: number, outTok: number) {
  // rough defaults (adjust per your chosen model/pricing)
  // GPT-4o-mini-ish example:
  const inRate = 0.00015;   // $/1k tokens
  const outRate = 0.0006;
  return ((inTok/1000)*inRate) + ((outTok/1000)*outRate)
}

export async function generatePosts(input: GenInput) {
  const prompt = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content:
`Topic/Brief/URL:
${input.topic}

Tone: ${input.tone}

Platforms:
${input.platforms.join(', ')}

For each platform, produce JSON ONLY as an array of items with:
- platform: one of instagram|tiktok|linkedin|x
- text: the post text
- hashtags: array of strings
- altText: a sentence for image alt text
- suggestions: array of 1-3 short visual ideas

Constraints:
- 3 to 5 total variants across platforms (you may produce 1 per platform, or extra for top-fit platforms).
- Keep JSON strictly valid.` }
  ]

  const model = process.env.OPENAI_MODEL
  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: prompt.map(p => ({ role: p.role as any, content: p.content })),
  })

  const text = resp.choices[0]?.message?.content || '{}'
  let parsed: any
  try { parsed = JSON.parse(text) } catch { parsed = {} }

  // basic token accounting (approx using usage if available)
  const inTok = (resp.usage?.prompt_tokens ?? 0)
  const outTok = (resp.usage?.completion_tokens ?? 0)
  const usd = costUSD(model, inTok, outTok)

  // expect either { items: [...] } or just [...]
  const items = Array.isArray(parsed) ? parsed : (parsed.items || [])
  return { items, cost: { inputTokens: inTok, outputTokens: outTok, usd, model } }
}


export async function suggestIdeas(niche: string) {
  const sys = "You are a YouTube strategist. Return exactly 5 evergreen, high-CTR ideas.";
  const user = `Niche: ${niche}. Output JSON: {"ideas":[{"title": "...", "hook":"...", "angle":"..."}]}`;
  const r = await openai.chat.completions.create({
    model: mo,
    messages: [{ role:"system", content: sys }, { role:"user", content: user }],
    response_format: { type: "json_object" }
  });
  const j = JSON.parse(r.choices[0].message.content || "{}");
  return j.ideas || [];
}

export async function writeScript(title: string, niche: string) {
  const sys = "You write 4–6 minute YouTube scripts optimized for retention and clarity.";
  const user = `Title: ${title}\nNiche: ${niche}\nReturn JSON:
{
 "title":"...","description":"...",
 "beats":[
   {"caption":"on-screen one-liner","narration":"spoken text for this beat"},
   ...
 ]
}`;
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role:"system", content: sys }, { role:"user", content: user }],
    response_format: { type: "json_object" }
  });
  return JSON.parse(r.choices[0].message.content || "{}");
}

