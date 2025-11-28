export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import ViralProject from '@/models/ViralProject';
import Asset from '@/models/Asset';
import User from '@/models/User';
import { viralpQueue } from '@/lib/viralp-queues';
import { s3, S3_BUCKET, presignGet, putBuffer, publicUrlOrSigned } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { composeTTSVideo } from '@/lib/clipPilot/makeVideo';
import { assertWithinLimit } from '@/lib/usage';
import { recordOverageRow } from '@/lib/overage';
import { track } from '@/lib/track';
import { limiterPerOrg } from '@/lib/ratelimit';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = String((session.user as any).id);

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await dbConnect();
  const doc = await ViralProject.findById(id);
  if (!doc?.tts?.key) return NextResponse.json({ error: 'Generate TTS first' }, { status: 400 });

  // Resolve org for usage/analytics
  const me = (await User.findOne({ email: (session.user as any).email })
    .lean()
    .catch(() => null)) as { orgId?: mongoose.Types.ObjectId | string } | null;
  const orgId = me?.orgId ? String(me.orgId) : null;

  // Optional per-org rate limit (if Upstash configured)
  try {
    if (orgId && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { success } = await limiterPerOrg.limit(orgId);
      if (!success) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
  } catch {}

  // If Redis is not configured or inline mode is requested, do an in-process assembly fallback.
  const inline = process.env.VIRALPILOT_INLINE === '1' || !process.env.REDIS_HOST;

  async function assembleInline() {
    // 1) Download MP3 bytes from S3
    const key = doc!.tts!.key as string;
    const get = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const res = await s3.send(get);
    const mp3 = Buffer.from(await res.Body!.transformToByteArray());

    // 2) Compose a simple 16:9 MP4 using the shared helper
    const title = (doc!.script?.title || doc!.selectedIdea || '').slice(0, 80);
    const { mp4 } = await composeTTSVideo({ ttsMp3: mp3, title, aspect: '16:9' });

    // Usage enforcement (minutes)
    const durationSec = Number((doc as any)?.tts?.durationSec || 0) || Math.ceil(mp3.length / 16000); // fallback rough guess
    const minutes = Math.max(1, Math.ceil(durationSec / 60));
    if (orgId) {
      const gate = await assertWithinLimit({ orgId, key: 'viralpilot_minutes', incBy: minutes, allowOverage: true });
      if (!gate.ok) {
        return NextResponse.json({ ok: false, error: 'usage_limit', details: gate }, { status: 402 });
      }
      if (gate.overage && gate.overUnits) {
        try { await recordOverageRow({ orgId, key: 'viralpilot_minutes', overUnits: gate.overUnits }); } catch {}
      }
    }

    // 3) Upload and get URL
    const videoKey = `assets/user_${userId}/viralp/${id}/video.mp4`;
    await putBuffer(videoKey, mp4, 'video/mp4');
    const signed = await presignGet(videoKey, 3600);
    const url = publicUrlOrSigned(videoKey, signed);

    // 4) Save asset + update project
    await Asset.create({
      userId,
      key: videoKey,
      bucket: S3_BUCKET,
      region: process.env.AWS_REGION || 'us-west-1',
      contentType: 'video/mp4',
      size: mp4.length,
      status: 'ready',
      type: 'video',
    } as any);

    doc!.video = { key: videoKey, bucket: S3_BUCKET, region: process.env.AWS_REGION || 'us-west-1', url, status: 'ready' } as any;
    doc!.status = 'video-ready';
    await doc!.save();

    if (orgId) {
      try { await track(orgId, userId, { module: 'viralpilot', type: 'watchtime.added', meta: { minutes } }); } catch {}
    }

    return NextResponse.json({ ok: true, inline: true, url });
  }

  if (inline) {
    try {
      return await assembleInline();
    } catch (e: any) {
      const msg = String(e?.message || e || 'Inline assembly failed');
      const status = /ffmpeg not found/i.test(msg) ? 400 : 500;
      return NextResponse.json({ error: msg }, { status });
    }
  }

  // Default: enqueue for the worker; fallback to inline if queuing fails.
  try {
    const job = await viralpQueue.add('assemble', {
      projectId: id,
      userId,
    });

    doc.video = { ...doc.video, status: 'queued' } as any;
    await doc.save();
    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    try {
      return await assembleInline();
    } catch (e2: any) {
      return NextResponse.json({ error: e2?.message || 'Assembly failed' }, { status: 500 });
    }
  }
}
