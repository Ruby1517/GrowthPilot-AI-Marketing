import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await dbConnect();

  const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean();
  if (!me?.orgId) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });
  const org = await Org.findById(me.orgId).lean();
  if (!org) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });

  const body = await req.json().catch(() => ({} as any));
  const memberId = String(body?.memberId || '');
  const role = String(body?.role || '');
  if (!memberId || !['admin','member','viewer'].includes(role)) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
  }

  if (String((org as any).plan || 'Trial') !== 'Business') {
    return NextResponse.json({ ok: false, error: 'Team management requires Business plan' }, { status: 403 });
  }

  const toId = (v: any) => (v && typeof (v as any).toString === 'function') ? (v as any).toString() : String(v);
  const meRole = org.members?.find(m => toId(m.userId) === toId(me._id))?.role || 'member';
  const target = org.members?.find(m => toId(m.userId) === toId(memberId));
  if (!target) return NextResponse.json({ ok: false, error: 'Member not found' }, { status: 404 });

  // Authorization: owners can change any; admins can only change member/viewer and cannot assign admin
  if (meRole !== 'owner') {
    if (meRole !== 'admin') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    if (target.role === 'owner') return NextResponse.json({ ok: false, error: 'Cannot modify owner' }, { status: 403 });
    if (target.role === 'admin') return NextResponse.json({ ok: false, error: 'Cannot modify admin' }, { status: 403 });
    if (role === 'admin') return NextResponse.json({ ok: false, error: 'Only owner can assign admin' }, { status: 403 });
  }

  // Prevent changing own role to avoid lockouts (optional: allow downgrade by owner)
  if (String(memberId) === String(me._id) && meRole !== 'owner') {
    return NextResponse.json({ ok: false, error: 'Cannot change your own role' }, { status: 403 });
  }

  await Org.updateOne(
    { _id: org._id, 'members.userId': new mongoose.Types.ObjectId(memberId) },
    { $set: { 'members.$.role': role } }
  );
  return NextResponse.json({ ok: true });
}
