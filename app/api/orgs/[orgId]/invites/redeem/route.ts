// app/api/invites/redeem/route.ts
import { NextResponse } from 'next/server';
import { Invite } from '@/models/Invite';
import { Org } from '@/models/Org';
import { dbConnect } from '@/lib/db';

export async function POST(req: Request) {
  await dbConnect();
  const { token, userId } = await req.json();
  const inv = await Invite.findOne({ token }).lean();
  if (!inv || inv.status !== 'pending' || inv.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });
  }
  await Org.updateOne({ _id: inv.orgId }, { $push: { members: { userId, role: inv.role, joinedAt: new Date() } } });
  await Invite.updateOne({ _id: inv._id }, { $set: { status: 'accepted', acceptedBy: userId } });
  return NextResponse.json({ ok: true });
}
