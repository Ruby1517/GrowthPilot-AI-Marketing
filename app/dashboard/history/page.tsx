import { dbConnect } from '@/lib/db';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Org from '@/models/Org';
import Generation from '@/models/Generation';
import mongoose from 'mongoose';

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.email) return <div className="p-6">Please sign in.</div>;

  await dbConnect();
  const me = await User.findOne({ email: session.user.email }).lean<{ _id: mongoose.Types.ObjectId; orgId?: mongoose.Types.ObjectId }>();
  if (!me) return <div className="p-6">User not found.</div>;
  const org = me.orgId ? await Org.findById(me.orgId).lean<{ _id: mongoose.Types.ObjectId }>() : null;
  if (!org) return <div className="p-6">Org not found.</div>;

  const gens = await (Generation as any).find({ orgId: org._id }).sort({ createdAt: -1 }).limit(100).lean().exec() as any[];

  return (
    <section className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Generation History</h1>
      {gens.length === 0 && (
        <p className="text-sm text-muted-foreground">No generations yet. Create your first piece of content from the sidebar.</p>
      )}
      <div className="grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground">
        <div>Module</div>
        <div>Status</div>
        <div>Tokens</div>
        <div>Created</div>
        {gens.map((g: any) => (
          <div key={String(g._id)} className="contents">
            <div className="capitalize">{g.module}</div>
            <div className="capitalize">{g.status}</div>
            <div>{g.cost?.tokens ?? '—'}</div>
            <div>{new Date(g.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
