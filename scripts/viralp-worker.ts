/* Run with:
   pnpm dlx tsx -r tsconfig-paths/register scripts/viralp-worker.ts
*/
import { Worker, QueueEvents } from 'bullmq';
import { s3 } from '@/lib/s3';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import ViralProject from '@/models/ViralProject';
import Asset from '@/models/Asset';
import mongoose from 'mongoose';
import ffmpeg from 'fluent-ffmpeg';
import { writeFileSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const MONGODB_URI = process.env.MONGODB_URI!;
const REGION = process.env.AWS_REGION || 'us-west-1';
const BUCKET = process.env.S3_BUCKET!;

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as any,
  enableReadyCheck: false,
};

async function downloadToTmp(key: string) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  const arrayBuf = await res.Body?.transformToByteArray();
  const tmpDir = join(process.cwd(), 'tmp');
  mkdirSync(tmpDir, { recursive: true });
  const filePath = join(tmpDir, key.split('/').pop() || 'audio.mp3');
  writeFileSync(filePath, Buffer.from(arrayBuf!));
  return filePath;
}

function ffprobeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const sec = data.format.duration || 60;
      resolve(sec);
    });
  });
}

async function assembleSimpleVideo(audioPath: string, outPath: string, duration: number): Promise<void> {
  // Solid dark background 1920x1080 @30fps with audio overlay
  // On Windows, drawtext may need font path; we skip text to avoid font issues.
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(`color=c=#0a0a0a:size=1920x1080:rate=30:duration=${Math.ceil(duration + 1)}`)
      .input(audioPath)
      .outputOptions(['-shortest', '-pix_fmt yuv420p', '-c:v libx264', '-preset veryfast', '-movflags +faststart'])
      .save(outPath)
      .on('end', () => resolve())
      .on('error', (e) => reject(e));
  });
}

async function run() {
  await mongoose.connect(MONGODB_URI);

  const worker = new Worker(
    'viralp-assemble',
    async (job) => {
      const { projectId, userId } = job.data as { projectId: string; userId: string };
      const doc = await ViralProject.findById(projectId);
      if (!doc?.tts?.key) throw new Error('No TTS asset');

      // Download MP3
      const audioPath = await downloadToTmp(doc.tts.key);
      const duration = await ffprobeDuration(audioPath);

      // Assemble MP4
      const tmpOut = join(process.cwd(), 'tmp', `viralp-${projectId}.mp4`);
      await assembleSimpleVideo(audioPath, tmpOut, duration);
      const buf = readFileSync(tmpOut);

      // Upload MP4 to S3
      const videoKey = `assets/user_${userId}/viralp/${projectId}/video.mp4`;
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: videoKey,
        Body: buf,
        ContentType: 'video/mp4',
      }));
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: videoKey }), { expiresIn: 3600 });

      // Asset + update
      await Asset.create({
        userId,
        key: videoKey,
        bucket: BUCKET,
        region: REGION,
        contentType: 'video/mp4',
        size: buf.length,
        status: 'ready',
        type: 'video',
      });

      doc.video = { key: videoKey, bucket: BUCKET, region: REGION, url, status: 'ready' };
      doc.status = 'video-ready';
      await doc.save();

      // cleanup
      try { unlinkSync(audioPath); } catch {}
      try { unlinkSync(tmpOut); } catch {}

      return { videoKey };
    },
    { connection }
  );

  const events = new QueueEvents('viralp-assemble', { connection });
  events.on('failed', async ({ jobId, failedReason }) => {
    // You can log or update the project via jobId mapping if you store it.
    console.error('ViralPilot job failed', jobId, failedReason);
  });

  console.log('ViralPilot worker up. Queue: viralp-assemble');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
