export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import Link from 'next/link';
import PendingInvites from './pending-invites';

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.email) return <div className="p-6">Please sign in.</div>;
  await dbConnect();
  const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean();
  if (!me) return <div className="p-6">User not found.</div>;
  const org = me.orgId ? await Org.findById(me.orgId).lean() : null;
  if (!org) return <div className="p-6">Org not found.</div>;

  // fetch member emails for display
  const userIds = (org.members || []).map((m: any) => m.userId).filter(Boolean);
  const Users = (await import('mongoose')).default.connection.collection('users');
  const users = userIds.length
    ? await Users
        .find({ _id: { $in: userIds } }, { projection: { email: 1, name: 1, image: 1 } })
        .toArray()
    : [];
  const byId = new Map(users.map((u: any) => [String(u._id), u]));

  return (
    <section className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Team</h1>
      <ul className="space-y-2">
        {org?.members?.length
          ? org.members.map((m:any, i:number) => {
              const u = byId.get(String(m.userId));
              const name = u?.name || u?.email || String(m.userId);
              const email = u?.email;
              const image = u?.image;
              return (
                <li key={i} className="flex items-center justify-between border border-white/10 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    {image ? (
                      <img src={image} alt="avatar" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-white/10" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm">{name}</span>
                      {email && <span className="text-xs text-brand-muted">{email}</span>}
                    </div>
                  </div>
                  <span className="text-sm text-brand-muted">{m.role}</span>
                </li>
              );
            })
          : <li>No members yet.</li>
        }
      </ul>
      <Link className="btn-gold inline-block mt-2" href="/dashboard/team/invite">Invite Member</Link>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Pending Invites</h2>
        <PendingInvites />
      </div>
    </section>
  );
}
