import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import MailCampaign from '@/models/MailCampaign';
import mongoose from 'mongoose';
import { sendSMTP, sendSendGrid } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await auth().catch(()=>null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const id = body.id;
  const to = body.to;
  const variant = (body.variant || 'A').toUpperCase();

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!to) return NextResponse.json({ error: 'to required' }, { status: 400 });

  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const doc = await MailCampaign.findOne({ _id: id, userId }).lean<{ emails?: Array<{ subjectA?: string; subjectB?: string; html?: string; text?: string }> }>();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const e = (doc.emails && doc.emails[0]) || {};
  const subject = variant === 'B'
    ? (e.subjectB || e.subjectA || 'MailPilot')
    : (e.subjectA || e.subjectB || 'MailPilot');
  const html = e.html || '<p>Hello</p>';
  const text = e.text || '';

  try {
    if (process.env.SENDGRID_API_KEY) await sendSendGrid(to, subject, html, text);
    else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) await sendSMTP(to, subject, html, text);
    else return NextResponse.json({ error: 'Email sending is not configured. Set SENDGRID_API_KEY or SMTP_* env vars.' }, { status: 501 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'send failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
