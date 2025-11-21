import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import ClipJob from '@/models/ClipJob';
import ClipOutput from '@/models/ClipOutput';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const userId = (session.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ outputs: [] });
  }

  const jobs = await ClipJob.find({ userId }).select('_id').lean();
  if (!jobs.length) {
    return NextResponse.json({ outputs: [] });
  }
  const jobIds = jobs.map((j) => j._id);

  const outputs = await ClipOutput.find({ jobId: { $in: jobIds } })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const payload = outputs.map((o) => ({
    _id: String(o._id),
    jobId: String(o.jobId),
    index: o.index ?? 0,
    aspect: o.aspect || '9:16',
    durationSec: o.durationSec,
    title: o.title || '',
    hook: o.hook || '',
    hashtags: o.hashtags || [],
    captionText: o.captionText || '',
    thumbnailKey: o.thumbnailKey || null,
    thumbnailText: o.thumbnailText || '',
    publishTargets: o.publishTargets || [],
    url: o.url,
    createdAt: o.createdAt,
  }));

  return NextResponse.json({ outputs: payload });
}
