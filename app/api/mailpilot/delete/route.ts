import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import MailCampaign from '@/models/MailCampaign';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  await dbConnect();
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body?.id as string | undefined;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const deleted = await MailCampaign.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
