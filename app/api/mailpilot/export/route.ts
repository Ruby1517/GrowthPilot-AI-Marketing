import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import MailCampaign from '@/models/MailCampaign';
import mongoose from 'mongoose';

function toEML(from: string, to: string, subject: string, html: string, text?: string) {
  const boundary = '----=_MailPilot_' + Math.random().toString(36).slice(2);
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    (text || ''),
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    html,
    `--${boundary}--`,
    ``
  ].join('\r\n');
}

async function handle(req: NextRequest) {
  await dbConnect();
  const session = await auth().catch(()=>null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Accept id/format/from both querystring AND JSON body for flexibility
  const url = new URL(req.url);
  const qpId = url.searchParams.get('id');
  const qpFormat = url.searchParams.get('format');
  const qpTo = url.searchParams.get('to');

  let body: any = {};
  if (req.method === 'POST') {
    try { body = await req.json(); } catch {}
  }

  const id = qpId || body.id;
  const format = (qpFormat || body.format || 'html').toLowerCase(); // 'html' | 'eml'
  const recipient = qpTo || body.to || 'example@example.com';

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const doc = await MailCampaign.findOne({ _id: id, userId }).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const e = (doc.emails && doc.emails[0]) || {};
  const subject = e.subjectA || e.subjectB || 'Your campaign';
  const html = e.html || '<p>Hello</p>';

  if (format === 'eml') {
    const eml = toEML(process.env.FROM_EMAIL || 'noreply@example.com', recipient, subject, html, e.text || '');
    return new NextResponse(eml, {
      headers: {
        'Content-Type': 'message/rfc822',
        'Content-Disposition': `attachment; filename="mailpilot-${id}.eml"`,
      }
    });
  }

  // default: html
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="mailpilot-${id}.html"`,
    }
  });
}

export async function GET(req: NextRequest)  { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
