export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import ViralProject from '@/models/ViralProject';
import { viralpQueue } from '@/lib/viralp-queues';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await dbConnect();
  const doc = await ViralProject.findById(id);
  if (!doc?.tts?.key) return NextResponse.json({ error: 'Generate TTS first' }, { status: 400 });

  const job = await viralpQueue.add('assemble', {
    projectId: id,
    userId: (session.user as any).id,
  });

  doc.video = { ...doc.video, status: 'queued' };
  await doc.save();

  return NextResponse.json({ jobId: job.id });
}
