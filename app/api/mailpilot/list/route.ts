import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import MailCampaign from '@/models/MailCampaign';
import mongoose from 'mongoose';

export async function GET() {
  await dbConnect();
  const session = await auth().catch(()=>null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const items = await MailCampaign.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json({ items });
}
