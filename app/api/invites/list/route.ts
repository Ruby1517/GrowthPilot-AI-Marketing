import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import { Invite } from '@/models/Invite';
import Org from '@/models/Org';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean();
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const orgId = (me as any)?.orgId;
  const org = orgId ? await Org.findById(orgId).lean() : null;
  if (!org) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });
  if (String((org as any).plan || 'Trial') !== 'Business') {
    return NextResponse.json({ ok: false, error: 'Team management requires Business plan' }, { status: 403 });
  }

  const invites = await Invite.find({ orgId: org._id, status: 'pending' }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ ok: true, invites: invites.map((i: any) => ({ _id: String(i._id), email: i.email, role: i.role, token: i.token, expiresAt: i.expiresAt })) });
}
