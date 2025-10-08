// import { NextRequest, NextResponse } from "next/server";
// import { dbConnect } from "@/lib/db";
// import ClipJob from "@/models/ClipJob";
// import ClipOutput from "@/models/ClipOutput";

// export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
//   await dbConnect();

//   const job = await ClipJob.findById(params.id)
//     .select("_id status stage progress error source createdAt updatedAt maxClips minClipSec maxClipSec")
//     .lean();

//   if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

//   const outputs = await ClipOutput.find({ jobId: job._id })
//     .sort({ idx: 1 })
//     .select("idx startSec endSec score title thumbText srt mp4_916 mp4_11 createdAt")
//     .lean();

//   return NextResponse.json({ job, outputs });
// }


// app/api/clippilot/status/[id]/route.ts
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Clip from '@/models/Clip';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const job = await Clip.findById(params.id).lean();
  if (!job) return new Response('Not found', { status: 404 });
  return NextResponse.json({
    status: job.status,
    outputs: job.outputs || [],
    estimateMinutes: job.estimateMinutes,
    actualMinutes: job.actualMinutes,
    error: job.error || null,
  });
}
