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

  const { keyword } = await req.json().catch(() => ({}));
  if (!keyword) return NextResponse.json({ error: 'keyword required' }, { status: 400 });

  await dbConnect();

  const prompt = `
You are a YouTube growth strategist. Given the niche keyword "${keyword}",
produce JSON with two arrays: "trending" and "evergreen". Each item:
{ "title": "...", "angle": "..." }.
Return only JSON.
`;

  const comp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(comp.choices[0].message?.content || '{}');
  const ideas = [
    ...(parsed.trending || []).map((x: any) => ({ ...x, type: 'trending' })),
    ...(parsed.evergreen || []).map((x: any) => ({ ...x, type: 'evergreen' })),
  ];

  const doc = await ViralProject.create({
    userId: (session.user as any).id,
    keyword,
    ideas,
    status: 'draft',
  });

  return NextResponse.json({ doc });
}
