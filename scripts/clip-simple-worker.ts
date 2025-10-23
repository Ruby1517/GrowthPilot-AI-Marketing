import 'dotenv/config';
import { Worker as BullWorker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import ClipJob from '@/models/ClipJob';
import ClipOutput from '@/models/ClipOutput';
import { assertWithinLimit } from '@/lib/usage';
import { recordOverageRow } from '@/lib/overage';
import { track } from '@/lib/track';
import { FFPROBE_BIN } from '@/lib/ffbins';
import { exec as _exec } from 'child_process';
import { promisify } from 'util';
const exec = promisify(_exec);

const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

async function connectDb() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);
}

async function presignFromAsset(key: string): Promise<string | null> {
  const Asset = (await import('@/models/Asset')).default as any;
  const doc = await Asset.findOne({ key }).lean();
  if (!doc) return null;
  const s3 = new S3Client({ region: doc.region });
  const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: doc.bucket, Key: doc.key }), { expiresIn: 600 });
  return signed;
}

async function probeDurationSec(url: string): Promise<number> {
  const bin = FFPROBE_BIN || 'ffprobe';
  try {
    const { stdout } = await exec(`${bin} -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "${url}"`);
    const sec = parseFloat(stdout);
    return Number.isFinite(sec) ? Math.max(1, Math.floor(sec)) : 60;
  } catch { return 60; }
}

new BullWorker(
  'clip-simple',
  async (job) => {
    await connectDb();
    const { jobId } = job.data as { jobId: string };
    const j = await ClipJob.findById(jobId);
    if (!j) return;

    try {
      j.status = 'processing'; await j.save();
      let sourceUrl = String(j.src || '');
      if (!/^https?:\/\//i.test(sourceUrl)) {
        sourceUrl = (await presignFromAsset(sourceUrl)) || sourceUrl;
      }

      const durationSec = await probeDurationSec(sourceUrl);
      const actualMinutes = Math.max(1, Math.ceil(durationSec / 60));

      // Enforce usage and record overage
      const gate = await assertWithinLimit({ orgId: String(j.orgId), key: 'clippilot_minutes', incBy: actualMinutes, allowOverage: true });
      if (!gate.ok) throw new Error('usage_limit');
      if (gate.overage && gate.overUnits) {
        try { await recordOverageRow({ orgId: String(j.orgId), key: 'clippilot_minutes', overUnits: gate.overUnits }); } catch {}
      }

      await ClipOutput.deleteMany({ jobId: j._id });
      await ClipOutput.create({ jobId: j._id, index: 0, url: sourceUrl, durationSec });

      j.status = 'done'; j.actualMinutes = actualMinutes; j.estimateMinutes = Math.max(j.estimateMinutes || 0, actualMinutes);
      await j.save();

      try { await track(String(j.orgId), String(j.userId), { module: 'clippilot', type: 'watchtime.added', meta: { minutes: actualMinutes } }); } catch {}
    } catch (e) {
      j.status = 'error'; j.error = (e as any)?.message || 'error'; await j.save();
      throw e;
    }
  },
  { connection: redis }
);

