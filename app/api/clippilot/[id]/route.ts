import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import ClipJob from '@/models/ClipJob';
import ClipOutput from '@/models/ClipOutput';
import mongoose from 'mongoose';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  await dbConnect();
  const userId = new mongoose.Types.ObjectId((session.user as any).id);

  // Ensure the job belongs to the requester
  const job = await (ClipJob as any).findOne({ _id: params.id, userId }).lean();
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await (ClipOutput as any).deleteMany({ jobId: job._id });
  await (ClipJob as any).deleteOne({ _id: job._id });

  return NextResponse.json({ ok: true });
}
