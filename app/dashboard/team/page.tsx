import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import Link from 'next/link';

export default async function TeamPage() {
  await dbConnect();
  // replace with session->orgId
  const org = await Org.findOne({}).lean();

  return (
    <section className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Team</h1>
      <ul className="space-y-2">
        {org?.members?.map((m:any, i:number) => (
          <li key={i} className="flex items-center justify-between border border-white/10 rounded-lg px-3 py-2">
            <span>{String(m.userId)}</span>
            <span className="text-sm text-brand-muted">{m.role}</span>
          </li>
        )) ?? <li>No members yet.</li>}
      </ul>
      <Link className="btn-gold inline-block mt-2" href="/dashboard/team/invite">Invite Member</Link>
    </section>
  );
}
