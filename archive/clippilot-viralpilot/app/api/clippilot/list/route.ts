// import { NextResponse } from "next/server";
// import { auth } from "@/lib/auth"; import { dbConnect } from "@/lib/db";
// import ClipJob from "@/models/ClipJob";

// export async function GET() {
//   const session = await auth(); 
//   if (!session?.user) return NextResponse.json({ error:"Unauthorized"},{status:401});
//   await dbConnect();

//   const jobs = await ClipJob.find({ userId: (session.user as any).id })
//     .sort({ createdAt: -1 })
//     .limit(20)
//     .select("_id status stage progress source createdAt error")
//     .lean();
//   return NextResponse.json({ jobs });
// }


// app/api/clips/list/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Org from '@/models/Org';
import ClipJob from '@/models/ClipJob';
import mongoose from 'mongoose';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  await dbConnect();
  const me = await User.findOne({ email: session.user.email }).lean<{ _id: mongoose.Types.ObjectId; orgId?: mongoose.Types.ObjectId }>();
  if (!me) return new Response('Unauthorized', { status: 401 });
  const org = me.orgId ? await Org.findById(me.orgId).lean<{ _id: mongoose.Types.ObjectId }>() : null;
  if (!org) return new Response('Org not found', { status: 404 });

  const jobs = await (ClipJob as any).find({ orgId: org._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
    .exec();

  return NextResponse.json({
    items: jobs.map((j: any) => ({
      id: String(j._id),
      status: j.status,
      durationSec: j.durationSec,
      variants: j.variants,
      estimateMinutes: j.estimateMinutes,
      actualMinutes: j.actualMinutes,
      createdAt: j.createdAt,
    }))
  });
}
