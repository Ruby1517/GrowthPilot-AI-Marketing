import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { spamScore } from '@/lib/spamWords';
import Usage from '@/models/Usage';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import { assertWithinLimit } from '@/lib/usage';
import { recordOverageRow } from '@/lib/overage';
import { track } from '@/lib/track';

const GenSchema = z.object({
  type: z.enum(['cold','warm','newsletter','nurture']),
  title: z.string().optional(),
  offer: z.string().optional(),
  audience: z.string().optional(),
  tone: z.string().optional(),
  sender: z.object({
    sender_name: z.string().optional(),
    sender_company: z.string().optional(),
    sender_email: z.string().optional(),
  }).optional(),
  steps: z.number().min(1).max(6).default(3), // for nurture
});

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await auth().catch(()=>null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean().catch(()=>null);
  const orgId = me?.orgId ? String(me.orgId) : null;

  const body = await req.json();
  const parsed = GenSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Bad Request', issues: parsed.error.issues }, { status: 400 });
  const { type, title, offer, audience, tone, sender, steps } = parsed.data;

  const sys = `You are MailPilot, an expert email marketer.
Return STRICT JSON only with:
{
  "mergeVars": ["first_name","company","offer","sender_name","sender_company"],
  "emails": [
    // For cold/warm/newsletter -> one item step=1
    // For nurture -> N items
    { "step": 1, "delayDays": 0, "subjectA": "string", "subjectB": "string", "preheader": "string", "html": "<html>..." }
  ]
}
Rules:
- Use clean, mobile-friendly HTML (no external CSS), inline styles minimal.
- Insert merge tags like {{first_name}}, {{company}}, {{offer}}, {{sender_name}}, {{sender_company}}.
- Subject lines concise; preheader 35–80 chars.
- Tone: ${tone || 'friendly, clear, professional'}.
- For nurture: create ${steps} steps with staggered delayDays (0,3,7,14,...).`;

  const userPrompt = `Type: ${type}
Title: ${title || ''}
Offer: ${offer || ''}
Audience: ${audience || ''}
Sender: ${JSON.stringify(sender || {})}`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.MAILPILOT_MODEL || 'gpt-4o-mini';

  let r;
  for (let i=0;i<3;i++) {
    try {
      r = await openai.chat.completions.create({
        model,
        temperature: 0.5,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userPrompt },
        ],
      });
      break;
    } catch (e) {
      if (i === 2) throw e;
      await new Promise(res => setTimeout(res, 400*(i+1)));
    }
  }

  const raw = r!.choices?.[0]?.message?.content?.trim() || '';
  const cleaned = raw.replace(/^```json\s*/i,'').replace(/```$/,'');
  let out: any;
  try { out = JSON.parse(cleaned); } catch {
    return NextResponse.json({ error: 'Model returned invalid JSON', raw }, { status: 502 });
  }

  // quick spam score on concatenated content
  const combined = (out.emails || []).map((e:any)=>`${e.subjectA}\n${e.subjectB}\n${e.preheader}\n${e.html}`).join('\n');
  const spam = spamScore(combined);

  // Enforce plan usage (emails count)
  const emailsCount = Array.isArray(out?.emails) ? out.emails.length : 0;
  if (orgId && emailsCount > 0) {
    const gate = await assertWithinLimit({ orgId, key: 'mailpilot_emails', incBy: emailsCount, allowOverage: true });
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: 'Plan limit reached', details: gate }, { status: 402 });
    }
    if (gate.overage && gate.overUnits) {
      try { await recordOverageRow({ orgId, key: 'mailpilot_emails', overUnits: gate.overUnits }); } catch {}
    }
  }

  // log naive cost if usage available
  try {
    await Usage.create({
      userId,
      module: 'mailpilot',
      unit: 'tokens',
      amount: r.usage?.total_tokens || 0,
      meta: { model },
    });
  } catch {}

  // Analytics
  if (orgId) {
    try {
      await track(orgId, userId, { module: 'mailpilot', type: 'generation.completed', meta: { emails: emailsCount } });
      if (emailsCount > 0) {
        await track(orgId, userId, { module: 'mailpilot', type: 'email.drafted', meta: { count: emailsCount } });
      }
    } catch {}
  }

  return NextResponse.json({ result: { ...out, spam } });
}
