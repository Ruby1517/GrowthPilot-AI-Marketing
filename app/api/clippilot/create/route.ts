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
import { synthesizeTTS } from '@/lib/clipPilot/tts';
import { composeTTSVideo } from '@/lib/clipPilot/makeVideo';
import { uploadBufferToS3 } from '@/lib/s3-upload';
import { checkUsageAndConsume } from '@/lib/usage';
import { USAGE_KEYS } from '@/lib/limits';
import { durationFromMp3Buffer } from '@/lib/clipPilot/duration';
import { FFPROBE_BIN } from '@/lib/ffbins';
import { exec as _exec } from 'child_process';
import { promisify } from 'util';
const exec = promisify(_exec);

function estimateMinutesFromScript(script: string) {
  const wpm = 150; // rough speech rate
  const words = script.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wpm));
}

async function probeDurationSeconds(audioPath: string) {
  const out = await exec(`ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "${audioPath}"`);
  const sec = parseFloat(out.stdout);
  return Math.max(1, Math.floor(Number.isFinite(sec) ? sec : 0));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, mode, script, aspect = '9:16', voiceStyle = 'Friendly' } = body;

    if (!orgId) return NextResponse.json({ error: 'org_required' }, { status: 400 });

    if (mode !== 'tts') {
      return NextResponse.json({ error: 'unsupported_mode', details: { mode } }, { status: 400 });
    }
    if (!script || script.trim().length < 10) {
      return NextResponse.json({ error: 'script_too_short' }, { status: 400 });
    }

    // 1) PRE-CHECK usage by estimated minutes
    const estMin = estimateMinutesFromScript(script);
    const pre = await checkUsageAndConsume({
      orgId,
      key: USAGE_KEYS.CLIPPILOT_MINUTES,
      incBy: estMin,
      dryRun: true,
      allowOverage: true,
    });
    if (!pre.ok) {
      return NextResponse.json({ error: 'usage_limit', details: pre }, { status: 402 });
    }

    // 2) TTS
    const ttsMp3 = await synthesizeTTS(script, voiceStyle); // returns Buffer (mp3)

    // 3) Compose simple video
    const { mp4, tempAudioPath } = await composeTTSVideo({
      ttsMp3,
      title: script.length > 60 ? script.slice(0, 60) + '…' : script,
      aspect,
    });

    // 4) Measure ACTUAL minutes from audio (safer than estimating)
    let durationSec = 60 * estMin;
    try {
      durationSec = await probeDurationSeconds(tempAudioPath); // make composeTTSVideo return the audio path
    } catch { /* fallback to estimate */ }
    const actualMin = Math.max(1, Math.ceil(durationSec / 60));

    // If actual > estimate, ensure the delta also fits (or goes to overage if enabled)
    const delta = actualMin - estMin;
    if (delta > 0) {
      const deltaCheck = await checkUsageAndConsume({
        orgId,
        key: USAGE_KEYS.CLIPPILOT_MINUTES,
        incBy: delta,
        dryRun: true,
        allowOverage: true,
      });
      if (!deltaCheck.ok) {
        return NextResponse.json({ error: 'usage_limit', details: deltaCheck }, { status: 402 });
      }
    }

    // 5) Upload
    const key = `clippilot/tts/${Date.now()}.mp4`;
    const url = await uploadBufferToS3(mp4, key, 'video/mp4');

    // 6) Consume ACTUAL minutes
    await checkUsageAndConsume({
      orgId,
      key: USAGE_KEYS.CLIPPILOT_MINUTES,
      incBy: actualMin,
      dryRun: false,
      allowOverage: true,
    });

    return NextResponse.json({
      ok: true,
      url,
      meters: { estMin, actualMin },
      durationSec,
    });
  } catch (err: any) {
    console.error('[clippilot/create]', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
