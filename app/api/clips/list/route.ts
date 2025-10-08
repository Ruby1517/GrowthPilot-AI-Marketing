import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; import { dbConnect } from "@/lib/db";
import ClipJob from "@/models/ClipJob";

export async function GET() {
  const session = await auth(); 
  if (!session?.user) return NextResponse.json({ error:"Unauthorized"},{status:401});
  await dbConnect();

  const jobs = await ClipJob.find({ userId: (session.user as any).id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("_id status stage progress source createdAt error")
    .lean();
  return NextResponse.json({ jobs });
}
