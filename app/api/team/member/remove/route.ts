import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import mongoose from 'mongoose';
import { syncSeatQuantity } from '@/lib/billing/seats';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await dbConnect();

  const me = await (await import('@/models/User')).default
    .findOne({ email: session.user.email })
    .lean<{ _id: mongoose.Types.ObjectId; orgId?: mongoose.Types.ObjectId | string }>();
  if (!me?.orgId) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });
  const org = await Org.findById(me.orgId).lean();
  if (!org) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });
  if (String((org as any).plan || 'Trial') !== 'Business') {
    return NextResponse.json({ ok: false, error: 'Team management requires Business plan' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const memberId = String(body?.memberId || '');
  if (!memberId) return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });

  const toId = (v: any) => (v && typeof (v as any).toString === 'function') ? (v as any).toString() : String(v);
  const meRole = org.members?.find((m: { userId: unknown; role?: string }) => toId(m.userId) === toId(me._id))?.role || 'member';
  const target = org.members?.find((m: { userId: unknown; role?: string }) => toId(m.userId) === toId(memberId));
  if (!target) return NextResponse.json({ ok: false, error: 'Member not found' }, { status: 404 });

  // Authorization rules
  if (target.role === 'owner') return NextResponse.json({ ok: false, error: 'Cannot remove owner' }, { status: 403 });
  if (meRole === 'admin' && target.role !== 'member' && target.role !== 'viewer') {
    return NextResponse.json({ ok: false, error: 'Admins can remove only members/viewers' }, { status: 403 });
  }
  if (!['owner','admin'].includes(meRole)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  if (String(memberId) === String(me._id)) {
    return NextResponse.json({ ok: false, error: 'Cannot remove yourself' }, { status: 403 });
  }

  await Org.updateOne(
    { _id: org._id },
    { $pull: { members: { userId: new mongoose.Types.ObjectId(memberId) } } }
  );
  const refreshed = await Org.findById(org._id);
  if (refreshed) {
    await syncSeatQuantity(refreshed);
  }
  return NextResponse.json({ ok: true });
}
