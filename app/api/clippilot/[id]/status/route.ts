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


// app/api/clips/[id]/status/route.ts
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import ClipJob from '@/models/ClipJob';
import ClipOutput from '@/models/ClipOutput';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  const job = await ClipJob.findById(params.id).lean();
  if (!job) return new Response('Not found', { status: 404 });

  const outputs = await ClipOutput.find({ jobId: job._id })
    .sort({ index: 1 })
    .lean();

  return NextResponse.json({
    id: String(job._id),
    status: job.status,
    estimateMinutes: job.estimateMinutes || 0,
    actualMinutes: job.actualMinutes || 0,
    durationSec: job.durationSec || 0,
    variants: job.variants || 1,
    error: job.error || null,
    outputs: outputs.map(o => ({
      index: o.index ?? 0,
      url: o.url,
      thumb: o.thumb,
      bytes: o.bytes ?? null,
      durationSec: o.durationSec ?? null,
    })),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
