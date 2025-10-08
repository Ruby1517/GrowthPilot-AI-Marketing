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


// app/api/clippilot/create/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Org from '@/models/Org';
import Clip from '@/models/Clip';
import { assertWithinLimit } from '@/lib/usage';
import { trackEvent } from '@/lib/events';

const Body = z.object({
  src: z.string().url().or(z.string().min(1)),           // allow s3 key
  prompt: z.string().default(''),
  aspect: z.enum(['9:16','1:1','16:9']).default('9:16'),
  durationSec: z.number().min(5).max(600),               // 5s..10m
  variants: z.number().int().min(1).max(10).default(1),
});

const METER_KEY = 'clippilot_minutes' as const;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  await dbConnect();
  const me = await User.findOne({ email: session.user.email });
  if (!me) return new Response('Unauthorized', { status: 401 });
  const org = me.orgId ? await Org.findById(me.orgId) : null;
  if (!org) return new Response('Org not found', { status: 404 });

  const parse = Body.safeParse(await req.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ ok: false, error: parse.error.flatten() }, { status: 400 });
  }
  const { src, prompt, aspect, durationSec, variants } = parse.data;

  // Estimate render minutes (ceil per variant)
  const estimateMinutes = Math.max(1, Math.ceil((durationSec / 60) * variants));

  // Enforce plan limit BEFORE enqueuing
  const gate = await assertWithinLimit({
    orgId: String(org._id),
    key: METER_KEY,
    incBy: estimateMinutes,
    allowOverage: true,        // let them exceed; we’ll charge on completion
  });
  if (!gate.ok && gate.reason === 'limit_exceeded') {
    return NextResponse.json({ ok:false, error:`Plan limit reached for ${METER_KEY}` }, { status: 402 });
  }

  // Create job (your worker will pick it up)
  const job = await Clip.create({
    orgId: org._id,
    userId: me._id,
    src, prompt, aspect, durationSec, variants,
    estimateMinutes,
    status: 'queued',
  });

  // Analytics
  await trackEvent({
    orgId: String(org._id),
    userId: String(me._id),
    module: 'clippilot',
    type: 'render.queued',
    meta: { aspect, durationSec, variants, estimateMinutes },
  });

  return NextResponse.json({ ok: true, jobId: String(job._id) });
}
