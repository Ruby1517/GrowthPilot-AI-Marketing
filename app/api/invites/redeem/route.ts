import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Invite } from '@/models/Invite';
import Org from '@/models/Org';

export async function POST(req: Request) {
  await dbConnect();
  const { token, userId } = await req.json();
  const inv = await Invite.findOne({ token }).lean();
  if (!inv || inv.status !== 'pending' || inv.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: 'Invalid invite' }, { status: 400 });
  }
  await Org.updateOne(
    { _id: inv.orgId, 'members.userId': { $ne: userId } },
    { $push: { members: { userId, role: inv.role, joinedAt: new Date() } } }
  );
  await Invite.updateOne({ _id: inv._id }, { $set: { status: 'accepted', acceptedBy: userId } });
  return NextResponse.json({ ok: true });
}
