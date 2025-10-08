export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import ViralProject from '@/models/ViralProject';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, idea } = await req.json().catch(() => ({}));
  if (!id || !idea) return NextResponse.json({ error: 'id and idea required' }, { status: 400 });

  await dbConnect();
  const doc = await ViralProject.findById(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const scriptPrompt = `
You are a YouTube scriptwriter. Topic: "${idea}".
Write a concise, high-retention script as JSON:
{
  "title": "...",
  "sections": [
    {"type":"intro","title":"Hook","text":"...","ts":"00:00"},
    {"type":"point","title":"Point 1","text":"...","ts":"00:20"},
    {"type":"point","title":"Point 2","text":"...","ts":"00:50"},
    {"type":"point","title":"Point 3","text":"...","ts":"01:20"},
    {"type":"outro","title":"Wrap + CTA","text":"...","ts":"01:50"}
  ],
  "cta":"Subscribe for more..."
}
Return JSON only.
`;

  const comp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: scriptPrompt }],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(comp.choices[0].message?.content || '{}');

  doc.selectedIdea = idea;
  doc.script = {
    title: parsed.title || idea,
    sections: parsed.sections || [],
    cta: parsed.cta || 'Subscribe for more.',
  };
  await doc.save();

  return NextResponse.json({ doc });
}
