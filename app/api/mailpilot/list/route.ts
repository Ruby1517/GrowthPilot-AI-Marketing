import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import MailCampaign from '@/models/MailCampaign';
import mongoose from 'mongoose';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ items: [] });
  }
  await dbConnect();
  const session = await auth().catch(()=>null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const items = await MailCampaign.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json({ items });
}
