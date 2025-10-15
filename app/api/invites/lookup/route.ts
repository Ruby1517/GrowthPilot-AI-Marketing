import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Invite } from '@/models/Invite';
import Org from '@/models/Org';

export async function POST(req: Request) {
  await dbConnect();
  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ ok: false, error: 'token required' }, { status: 400 });
  const inv = await Invite.findOne({ token }).lean();
  if (!inv || inv.status !== 'pending' || inv.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: 'Invalid invite' }, { status: 404 });
  }
  const org = await Org.findById(inv.orgId).lean();
  return NextResponse.json({ ok: true, orgName: org?.name || 'Organization' });
}

