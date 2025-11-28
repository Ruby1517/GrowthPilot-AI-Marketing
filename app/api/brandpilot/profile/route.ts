import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import BrandDoc from '@/models/BrandDoc';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const userId = (session.user as any).id;

  let doc = null;
  const me = await (await import('@/models/User')).default
    .findOne({ email: session.user.email })
    .lean()
    .catch(() => null);

  const orgId = (me as any)?.orgId;
  if (orgId) {
    doc = await BrandDoc.findOne({ orgId }).sort({ updatedAt: -1 }).lean();
  }

  if (!doc) {
    doc = await BrandDoc.findOne({ userId }).sort({ updatedAt: -1 }).lean();
  }

  return NextResponse.json({ doc });
}
