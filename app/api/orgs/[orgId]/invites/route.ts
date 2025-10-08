import { NextResponse } from 'next/server';
import { Invite } from '@/models/Invite';
import { randomBytes } from 'crypto';
import { dbConnect } from '@/lib/db';

export async function POST(req: Request, { params }: { params: { orgId: string } }) {
  await dbConnect();
  const { email, role } = await req.json();
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000);
  const inv = await Invite.create({ orgId: params.orgId, email, role, token, expiresAt, status: 'pending' });
  return NextResponse.json({ ok: true, token: inv.token });
}
