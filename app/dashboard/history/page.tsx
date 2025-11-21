// app/dashboard/history/page.tsx
import { dbConnect } from '@/lib/db';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Org from '@/models/Org';
import ClipJob from '@/models/ClipJob';
import Link from 'next/link';

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.email) return <div className="p-6">Please sign in.</div>;

  await dbConnect();
  const me = await User.findOne({ email: session.user.email }).lean();
  if (!me) return <div className="p-6">User not found.</div>;
  const org = me.orgId ? await Org.findById(me.orgId).lean() : null;
  if (!org) return <div className="p-6">Org not found.</div>;

  const jobs = await ClipJob.find({ orgId: org._id }).sort({ createdAt: -1 }).limit(100).lean();

  return (
    <section className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>
      <div className="grid grid-cols-6 gap-2 text-sm">
        <div className="text-brand-muted">ID</div>
        <div className="text-brand-muted">Status</div>
        <div className="text-brand-muted">Dur</div>
        <div className="text-brand-muted">Variants</div>
        <div className="text-brand-muted">Actual min</div>
        <div className="text-brand-muted">Created</div>

        {jobs.map((j:any) => (
          <Link key={String(j._id)} href={`/clippilot/${j._id}`} className="contents">
            <div className="truncate">{String(j._id).slice(-8)}</div>
            <div className="capitalize">{j.status}</div>
            <div>{Math.round(j.durationSec)}s</div>
            <div>{j.variants}</div>
            <div>{j.actualMinutes ?? 0}</div>
            <div>{new Date(j.createdAt).toLocaleString()}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
