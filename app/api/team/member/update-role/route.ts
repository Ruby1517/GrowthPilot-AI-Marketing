import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import mongoose from 'mongoose';

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

  const body = await req.json().catch(() => ({} as any));
  const memberId = String(body?.memberId || '');
  const role = String(body?.role || '');
  if (!memberId || !['manager','editor','viewer'].includes(role)) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
  }

  const toId = (v: any) => (v && typeof (v as any).toString === 'function') ? (v as any).toString() : String(v);
  const meRole = org.members?.find((m: { userId: unknown; role?: string }) => toId(m.userId) === toId(me._id))?.role || 'editor';
  const target = org.members?.find((m: { userId: unknown; role?: string }) => toId(m.userId) === toId(memberId));
  if (!target) return NextResponse.json({ ok: false, error: 'Member not found' }, { status: 404 });

  // Authorization: owners can change any; managers can change editor/viewer but not assign manager
  if (meRole !== 'owner') {
    if (meRole !== 'manager') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    if (target.role === 'owner') return NextResponse.json({ ok: false, error: 'Cannot modify owner' }, { status: 403 });
    if (target.role === 'manager') return NextResponse.json({ ok: false, error: 'Cannot modify another manager' }, { status: 403 });
    if (role === 'manager') return NextResponse.json({ ok: false, error: 'Only owner can assign manager role' }, { status: 403 });
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
