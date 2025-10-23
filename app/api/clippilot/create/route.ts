// import { NextRequest, NextResponse } from "next/server";
// import { z } from "zod";
// import mongoose from "mongoose";
// import { auth } from "@/lib/auth";
// import { dbConnect } from "@/lib/db";
// import ClipJob from "@/models/ClipJob";
// import { getClipQueue } from "@/lib/clip-queues"; // lazy/optional queue accessor

// // Accept bucket/region as optional; fallback to env
// const BodySchema = z.object({
//   bucket: z.string().optional(),
//   region: z.string().optional(),
//   key: z.string().min(1),
//   contentType: z.string().optional(),
//   maxClips: z.number().int().min(1).max(12).optional(),
//   minClipSec: z.number().int().min(5).max(120).optional(),
//   maxClipSec: z.number().int().min(10).max(180).optional(),
//   projectId: z.string().optional(),
// });

// export async function POST(req: NextRequest) {
//   try {
//     // 1) Auth
//     const session = await auth();
//     if (!session?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // 2) Parse body
//     const raw = await req.json().catch(() => ({}));
//     const parsed = BodySchema.safeParse(raw);
//     if (!parsed.success) {
//       return NextResponse.json({ error: "Bad Request", issues: parsed.error.issues }, { status: 400 });
//     }
//     const body = parsed.data;

//     // 3) Resolve bucket/region (fallback to env)
//     const bucket = body.bucket ?? process.env.S3_BUCKET;
//     const region = body.region ?? process.env.AWS_REGION;
//     const missing: any[] = [];
//     if (!bucket) missing.push({ path: ["bucket"], message: "Missing and no S3_BUCKET fallback" });
//     if (!region) missing.push({ path: ["region"], message: "Missing and no AWS_S3_REGION fallback" });
//     if (missing.length) {
//       return NextResponse.json({ error: "Bad Request", issues: missing }, { status: 400 });
//     }

//     // 4) DB connect
//     await dbConnect();

//     // 5) Create job
//     const jobDoc = await ClipJob.create({
//       userId: new mongoose.Types.ObjectId((session.user as any).id),
//       source: { bucket, region, key: body.key, contentType: body.contentType },
//       ...(body.maxClips ? { maxClips: body.maxClips } : {}),
//       ...(body.minClipSec ? { minClipSec: body.minClipSec } : {}),
//       ...(body.maxClipSec ? { maxClipSec: body.maxClipSec } : {}),
//       ...(body.projectId ? { projectId: new mongoose.Types.ObjectId(body.projectId) } : {}),
//       status: "queued",
//       stage: "queued",
//       progress: 0,
//     });

//     // 6) Enqueue (if Redis available)
//     const q = getClipQueue(); // may be null if REDIS_URL not set / not reachable
//     if (q) {
//       try {
//         await q.add("clip", { jobId: String(jobDoc._id) }, { attempts: 1, removeOnComplete: true });
//       } catch (e: any) {
//         console.warn("[clips/create] queue add failed:", e?.message || e);
//         // still return 201; the job exists and can be enqueued later if you add a retry UI
//       }
//     } else {
//       console.warn("[clips/create] queue disabled; job created but not enqueued (check REDIS_URL)");
//     }

//     return NextResponse.json({ id: jobDoc._id }, { status: 201 });
//   } catch (err: any) {
//     console.error("[clips/create] fatal:", err);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }



// app/api/clippilot/create/route.ts (relevant parts)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import mongoose from 'mongoose';
import ClipJob from '@/models/ClipJob';
import { getSimpleClipQueue } from '@/lib/clip-simple-queue';
import { track } from '@/lib/track';

// ClipPilot create: video-only (long video → short video)

export async function POST(req: NextRequest) {
  try {
    const session = await auth().catch(()=>null);
    const body = await req.json();
    const { orgId, aspect = '9:16' } = body;

    if (!orgId) return NextResponse.json({ error: 'org_required' }, { status: 400 });

    // Accept either a direct URL or a storage key (already uploaded)
    const srcUrl = (body?.srcUrl || '').toString();
    const storageKey = (body?.storageKey || '').toString();
    if (!srcUrl && !storageKey) {
      return NextResponse.json({ error: 'missing_source' }, { status: 400 });
    }
    // Guard: avoid using presigned PUT URLs as source (not fetchable by GET)
    if (!storageKey && /X-Amz-Algorithm=/i.test(srcUrl) && /PutObject/i.test(srcUrl)) {
      return NextResponse.json({ error: 'invalid_source_url', hint: 'Use storageKey from uploader completion or provide a GET-accessible URL.' }, { status: 400 });
    }

    await dbConnect();
    const userId = (session?.user as any)?.id ? new mongoose.Types.ObjectId((session!.user as any).id) : new mongoose.Types.ObjectId();
    const job = await ClipJob.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      userId,
      src: storageKey || srcUrl,
      prompt: '',
      aspect,
      durationSec: 0,
      variants: 1,
      status: 'queued',
      estimateMinutes: 0,
      actualMinutes: 0,
    } as any);

    // Optional analytics: request event
    try { await track(orgId, userId.toString(), { module: 'clippilot', type: 'generation.requested', meta: { mode: 'video' } }); } catch {}
    // Enqueue lightweight processor if Redis available
    try {
      const q = getSimpleClipQueue();
      if (q) await q.add('process', { jobId: String(job._id) }, { attempts: 1, removeOnComplete: true });
    } catch {}
    return NextResponse.json({ ok: true, jobId: String(job._id) }, { status: 201 });
  } catch (err: any) {
    console.error('[clippilot/create]', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
