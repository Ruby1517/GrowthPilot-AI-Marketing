import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { dbConnect } from '@/lib/db';
import ClipJob from '@/models/ClipJob';
import ClipOutput from '@/models/ClipOutput';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function ClipDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  await dbConnect();
  const userId = (session!.user as any).id;
  const jobs = await ClipJob.find({ userId }).select('_id').lean();
  const jobIds = jobs.map((doc) => doc._id);

  const outputs = jobIds.length
    ? await ClipOutput.find({ jobId: { $in: jobIds } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
    : [];

  const payload = outputs.map((o: any) => ({
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
    createdAt: o.createdAt?.toISOString?.() || '',
  }));

  return <DashboardClient initialOutputs={payload} />;
}
