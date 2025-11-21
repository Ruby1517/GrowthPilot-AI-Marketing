import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { pushKlaviyoSequence } from '@/lib/klaviyo';

const EmailSchema = z.object({
  step: z.number().int().min(1),
  subject: z.string().min(3),
  preheader: z.string().optional(),
  html: z.string().min(10),
  text: z.string().optional(),
  sendAt: z.string().min(10),
  variant: z.enum(['A', 'B']).optional(),
});

const BodySchema = z.object({
  listId: z.string().optional(),
  segmentId: z.string().optional(),
  sequenceName: z.string().min(2),
  sender: z.object({
    sender_name: z.string().optional(),
    sender_company: z.string().optional(),
    sender_email: z.string().email(),
  }),
  emails: z.array(EmailSchema).min(1),
});

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const payload = await req.json();
    body = BodySchema.parse(payload);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid payload', details: err?.message }, { status: 400 });
  }

  if (!body.listId && !body.segmentId) {
    return NextResponse.json({ error: 'listId or segmentId required' }, { status: 400 });
  }

  try {
    const result = await pushKlaviyoSequence(body);
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error('Klaviyo push failed', err);
    return NextResponse.json({ error: err?.message || 'Failed to push to Klaviyo' }, { status: 500 });
  }
}
