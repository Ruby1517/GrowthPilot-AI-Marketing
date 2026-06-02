import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import { Invite } from '@/models/Invite';
import Org from '@/models/Org';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean();
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const orgId = (me as any)?.orgId;
  const org = orgId ? await Org.findById(orgId).lean() : null;
  if (!org) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });
  const myRole = org.members?.find((m: any) => String(m.userId) === String((me as any)._id))?.role || 'editor'

  const { email, role } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ ok: false, error: 'Email required' }, { status: 400 });

  // Only owner or manager can create invites; only owner can assign manager role
  if (!['owner','manager'].includes(myRole)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const requestedRole = String(role || 'editor');
  if (requestedRole === 'owner') {
    return NextResponse.json({ ok: false, error: 'Cannot invite as owner' }, { status: 400 });
  }
  if (requestedRole === 'manager' && myRole !== 'owner') {
    return NextResponse.json({ ok: false, error: 'Only owner can assign manager role' }, { status: 403 });
  }

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000);
  const inv = await Invite.create({ orgId: org._id, email, role: (requestedRole as any) || 'editor', token, expiresAt, status: 'pending' });
  return NextResponse.json({ ok: true, token: inv.token });
}
