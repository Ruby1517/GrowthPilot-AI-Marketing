import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { fetchBlogContext } from '@/lib/kb';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUPPORT_PROMPT = `
You are GrowthPilot's in-app support assistant.
Explain pricing plans (Starter, Pro, Business), module capabilities (PostPilot, BlogPilot, AdPilot, LeadPilot, MailPilot, BrandPilot, ViralPilot, ClipPilot),
usage limits, billing/overage, and onboarding steps. Keep answers concise.
If you don't know something, say so and offer to connect support@growthpilot.ai.
`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const convo = Array.isArray(messages) ? messages : [];
  const userText = convo.filter((m: Msg) => m.role === 'user').map((m: Msg) => m.content).join('\n');
  const kb = await fetchBlogContext(userText, 3);

  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  const openai = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  let reply = '';

  if (openai) {
    const r = await openai.chat.completions.create({
      model: process.env.SUPPORT_CHAT_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: SUPPORT_PROMPT + (kb ? `\nReference:\n${kb}` : '') },
        ...convo,
      ],
    });
    reply = r.choices?.[0]?.message?.content?.trim() || '';
  }

  if (!reply) {
    const lower = userText.toLowerCase();
    if (/price|plan|cost/.test(lower)) {
      reply = 'We offer Starter (10 seats, $49/mo), Pro (unlocks ClipPilot, 50 seats, $149/mo), and Business (custom seats, SLA, usage pooling). Need help choosing? Email support@growthpilot.ai.';
    } else if (/module|feature|can.*do/.test(lower)) {
      reply = 'GrowthPilot bundles PostPilot (social), BlogPilot (SEO), AdPilot, LeadPilot, MailPilot, BrandPilot, ViralPilot, and ClipPilot. Let me know which workflow you want and I can outline steps.';
    } else {
      reply = 'I can help with plans, modules, and onboarding. Could you share more detail? Or email support@growthpilot.ai for a human follow-up.';
    }
  }

  return NextResponse.json({ reply });
}
