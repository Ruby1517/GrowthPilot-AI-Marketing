import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import MailCampaign from '@/models/MailCampaign';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await auth().catch(()=>null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const doc = await MailCampaign.create({ ...body, userId });
  return NextResponse.json({ id: String(doc._id) }, { status: 201 });
}
