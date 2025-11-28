import { NextResponse } from 'next/server';
import { Invite } from '@/models/Invite';
import { randomBytes } from 'crypto';
import { dbConnect } from '@/lib/db';
import { auth } from '@/lib/auth';
import Org from '@/models/Org';
import mongoose from 'mongoose';

export async function POST(req: Request, { params }: { params: { orgId: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const me = await (await import('@/models/User')).default
    .findOne({ email: session.user.email })
    .lean<{ _id: mongoose.Types.ObjectId }>();
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const org = await Org.findById(params.orgId).lean();
  if (!org) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });
  const myRole = org.members?.find((m: { userId: unknown; role?: string }) => String(m.userId) === String(me._id))?.role || 'member';
  if (!['owner','admin'].includes(myRole)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email) return NextResponse.json({ ok: false, error: 'Email required' }, { status: 400 });
  const requestedRole = String(role || 'member');
  if (requestedRole === 'owner') {
    return NextResponse.json({ ok: false, error: 'Cannot invite as owner' }, { status: 400 });
  }
  if (requestedRole === 'admin' && myRole !== 'owner') {
    return NextResponse.json({ ok: false, error: 'Only owner can assign admin' }, { status: 403 });
  }

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000);
  const inv = await Invite.create({ orgId: params.orgId, email, role: (requestedRole as any) || 'member', token, expiresAt, status: 'pending' });
  return NextResponse.json({ ok: true, token: inv.token });
}
