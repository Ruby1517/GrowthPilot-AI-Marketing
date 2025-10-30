export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import Link from 'next/link';
import PendingInvites from './pending-invites';
import MemberRow from './member-row';
import { hasFeature } from '@/lib/features';

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

  const myRole = org.members?.find((m:any) => String(m.userId) === String(me._id))?.role || 'member';
  const plan = (org as any).plan || 'Trial';
  const canManageTeam = hasFeature(plan as any, 'team_management') && ['owner','admin'].includes(String(myRole));

  async function refresh() {}

  return (
    <section className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Team</h1>
      <div className="text-sm text-brand-muted">Plan: <b>{String(plan)}</b> {(!canManageTeam) && <span className="ml-2">• Team management requires Business</span>}</div>
      <ul className="space-y-2 mt-2">
        {org?.members?.length
          ? org.members.map((m:any, i:number) => {
              const u = byId.get(String(m.userId));
              return (
                <li key={i}>
                  <MemberRow m={{ userId: String(m.userId), role: m.role, name: u?.name, email: u?.email, image: u?.image }} meRole={canManageTeam ? (myRole as any) : 'viewer'} onChanged={undefined} />
                </li>
              );
            })
          : <li>No members yet.</li>
        }
      </ul>
      {canManageTeam ? (
        <Link className="btn-gold inline-block mt-2" href="/dashboard/team/invite">Invite Member</Link>
      ) : (
        <a className="btn-ghost inline-block mt-2" href="/billing">Upgrade to manage team</a>
      )}

      {canManageTeam && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Pending Invites</h2>
          <PendingInvites />
        </div>
      )}
    </section>
  );
}
