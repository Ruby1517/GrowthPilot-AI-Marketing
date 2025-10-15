import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import { Invite } from '@/models/Invite';
import Org from '@/models/Org';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean();
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const org = me.orgId ? await Org.findById(me.orgId).lean() : null;
  if (!org) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  const _id = new mongoose.Types.ObjectId(String(id));
  const inv = await Invite.findOne({ _id, orgId: org._id, status: 'pending' }).lean();
  if (!inv) return NextResponse.json({ ok: false, error: 'Invite not found' }, { status: 404 });
  await Invite.updateOne({ _id }, { $set: { status: 'revoked' } });
  return NextResponse.json({ ok: true });
}

