import 'dotenv/config';
import { Worker as BullWorker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import ClipJob from '@/models/ClipJob';
import ClipOutput from '@/models/ClipOutput';
import Asset from '@/models/Asset';
import { assertWithinLimit } from '@/lib/usage';
import { recordOverageRow } from '@/lib/overage';
import { track } from '@/lib/track';
import { FFPROBE_BIN } from '@/lib/ffbins';
import { exec as _exec } from 'child_process';
import { promisify } from 'util';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import ffmpegBin from '@ffmpeg-installer/ffmpeg';
import OpenAI from 'openai';
import crypto from 'node:crypto';
const exec = promisify(_exec);

const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
const TMP = process.env.TMPDIR || '/tmp';
const FFMPEG = ffmpegBin.path;
const S3_BUCKET = process.env.S3_BUCKET || '';
const S3_REGION = process.env.AWS_REGION || 'us-west-2';
const s3 = new S3Client({ region: S3_REGION });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function connectDb() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);
}

type AssetDoc = {
  key: string;
  bucket: string;
  region: string;
};

async function presignFromAsset(key: string): Promise<{ signedUrl: string; viewUrl: string; asset: AssetDoc } | null> {
  const Asset = (await import('@/models/Asset')).default as any;
  const doc = await Asset.findOne({ key }).lean();
  if (!doc) return null;
  const s3 = new S3Client({ region: doc.region });
  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: doc.bucket, Key: doc.key }),
    { expiresIn: 600 }
  );
  const viewUrl = `/api/assets/view?key=${encodeURIComponent(doc.key)}`;
  return { signedUrl, viewUrl, asset: doc };
}

async function probeDurationSec(url: string): Promise<number> {
  const bin = FFPROBE_BIN || 'ffprobe';
  try {
    const { stdout } = await exec(`${bin} -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "${url}"`);
    const sec = parseFloat(stdout);
    return Number.isFinite(sec) ? Math.max(1, Math.floor(sec)) : 60;
  } catch { return 60; }
}

async function downloadFile(url: string, outPath: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download_failed: ${res.status}`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const stream = fss.createWriteStream(outPath);
  await new Promise((resolve, reject) => {
    res.body!.pipe(stream);
    res.body!.on('error', reject);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function detectScenes(file: string): Promise<number[]> {
  const { stderr } = await exec(`${FFMPEG} -i "${file}" -filter:v "select='gt(scene,0.3)',showinfo" -f null -`, { maxBuffer: 20_000_000 });
  const result: number[] = [];
  stderr.split('\n').forEach(line => {
    const m = line.match(/pts_time:([0-9.]+)/);
    if (m) result.push(parseFloat(m[1]!));
  });
  return result.filter((t) => Number.isFinite(t));
}

async function cutClip(file: string, start: number, end: number, outPath: string) {
  const dur = Math.max(1, end - start);
  await exec(`${FFMPEG} -ss ${start.toFixed(3)} -i "${file}" -t ${dur.toFixed(3)} -c:v libx264 -preset veryfast -crf 20 -c:a aac -movflags +faststart "${outPath}"`, { maxBuffer: 50_000_000 });
}

async function uploadClip(localPath: string, key: string) {
  const data = await fs.readFile(localPath);
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: data, ContentType: 'video/mp4' }));
  const { size } = await fs.stat(localPath);
  return size;
}

function planScenes(times: number[], duration: number, target: number, maxClips: number) {
  const starts = [0, ...times].filter((t) => t < duration);
  const minLen = Math.max(5, target * 0.5);
  const clips: Array<{ start: number; end: number }> = [];
  for (const start of starts) {
    if (clips.length >= maxClips) break;
    const end = Math.min(duration, start + target);
    if (end - start >= minLen) clips.push({ start, end });
  }
  if (!clips.length) clips.push({ start: 0, end: Math.min(duration, target) });
  return clips.slice(0, maxClips);
}

type TranscriptSegment = { start: number; end: number; text: string };

async function transcribeWhisper(filePath: string): Promise<TranscriptSegment[]> {
  if (!process.env.OPENAI_API_KEY) return [];
  const stream = fss.createReadStream(filePath);
  const resp: any = await openai.audio.transcriptions.create({
    file: stream,
    model: 'whisper-1',
    response_format: 'verbose_json',
  });
  return (resp.segments || []).map((seg: any) => ({
    start: seg.start,
    end: seg.end,
    text: (seg.text || '').trim(),
  }));
}

function buildSrtForWindow(segments: TranscriptSegment[], start: number, end: number) {
  const filtered = segments.filter((s) => s.end > start && s.start < end);
  if (!filtered.length) return '';
  const lines: string[] = [];
  let idx = 1;
  const format = (sec: number) => {
    const t = Math.max(0, sec);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
  };
  for (const seg of filtered) {
    const segStart = Math.max(start, seg.start) - start;
    const segEnd = Math.min(end, seg.end) - start;
    const text = seg.text || '';
    if (!text.trim()) continue;
    lines.push(`${idx++}\n${format(segStart)} --> ${format(segEnd)}\n${text.trim()}\n`);
  }
  return lines.join('\n');
}

async function burnCaptions(inFile: string, srtFile: string, outFile: string, branding?: any, clipLength = 0) {
  const subtitleColor = branding?.subtitles?.color || '#FFFFFF';
  const subtitleBg = branding?.subtitles?.background || '#000000';
  const watermark = branding?.watermark?.text;
  const progressEnabled = branding?.progressBar?.enabled !== false;
  const progressColor = branding?.progressBar?.color || '#FFFFFF';

  const srtEscaped = srtFile.replace(/'/g, "\\'");
  let vf = `subtitles='${srtEscaped}',format=yuv420p`;

  if (progressEnabled && clipLength > 0) {
    vf += `,drawbox=x=0:y=ih-10:w=iw*(t/${clipLength.toFixed(3)}):h=8:color=${progressColor}@0.8:t=max`;
  }

  vf += `,drawtext=text='':fontcolor=${subtitleColor}:box=1:boxcolor=${subtitleBg}@0`;

  if (watermark) {
    vf += `,drawtext=text='${watermark.replace(/'/g, "\\'")}':fontcolor=white:fontsize=28:x=w-tw-40:y=40:box=1:boxcolor=black@0.4:boxborderw=12`;
  }

  await exec(`${FFMPEG} -i "${inFile}" -vf ${vf} -c:v libx264 -preset veryfast -crf 20 -c:a copy -movflags +faststart "${outFile}"`, { maxBuffer: 100_000_000 });
}

async function convertAspect(inFile: string, outFile: string, aspect: '9:16' | '1:1' | '16:9') {
  let vf = '';
  if (aspect === '9:16') {
    vf = "scale=-2:1920,crop=1080:1920";
  } else if (aspect === '1:1') {
    vf = "scale=1080:-2,crop=1080:1080";
  } else {
    vf = "scale=1920:-2";
  }
  await exec(`${FFMPEG} -i "${inFile}" -vf ${vf} -c:v libx264 -preset veryfast -crf 20 -c:a copy -movflags +faststart "${outFile}"`, { maxBuffer: 100_000_000 });
}

async function mixMusic(inFile: string, outFile: string, branding?: any) {
  const musicSource = branding?.music || process.env.CLIPPILOT_MUSIC_URL || '';
  if (!musicSource) {
    await fs.copyFile(inFile, outFile);
    return;
  }
  try {
    const musicPath = path.join(TMP, `music-${crypto.randomUUID()}.mp3`);
    await downloadFile(musicSource, musicPath);
    await exec(`${FFMPEG} -i "${inFile}" -i "${musicPath}" -filter_complex "[1:a]volume=0.25[a1];[0:a][a1]amix=inputs=2:duration=first:dropout_transition=3" -c:v copy -c:a aac -shortest "${outFile}"`, { maxBuffer: 100_000_000 });
    try { await fs.unlink(musicPath); } catch {}
  } catch {
    await fs.copyFile(inFile, outFile);
  }
}

function extractJson(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }
  return null;
}

async function generateClipMetadata(transcript: string) {
  if (!transcript.trim() || !process.env.OPENAI_API_KEY) {
    return { title: '', hook: '', hashtags: [], caption: '', thumbnail: '', publishTargets: [] };
  }
  const prompt = `Transcript:\n${transcript}\n\nReturn JSON with keys title, hook, hashtags (array), caption, thumbnail, publishTargets (array of TikTok/Reels/Shorts etc).`;
  try {
    const resp = await openai.responses.create({ model: 'gpt-4.1-mini', input: prompt });
    const text = resp.output_text || '';
    const parsed = extractJson(text);
    if (parsed) return parsed;
  } catch {}
  return { title: '', hook: '', hashtags: [], caption: '', thumbnail: '', publishTargets: [] };
}

async function generateThumbnailImage(promptText: string, baseKey: string) {
  if (!promptText || !process.env.OPENAI_API_KEY) return null;
  try {
    const img = await openai.images.generate({ model: 'gpt-image-1', prompt: promptText, size: '1024x1024' });
    const b64 = img.data?.[0]?.b64_json;
    if (!b64) return null;
    const buffer = Buffer.from(b64, 'base64');
    const key = `${baseKey}_thumb.png`;
    await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: 'image/png' }));
    return key;
  } catch {
    return null;
  }
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
      const rawSrc = String(j.src || '');
      const srcIsUrl = /^https?:\/\//i.test(rawSrc);
      let storageKey: string | undefined = srcIsUrl ? undefined : rawSrc;
      let sourceUrl = rawSrc;
      if (!srcIsUrl) {
        const asset = await presignFromAsset(rawSrc);
        if (!asset) throw new Error('asset_not_found');
        sourceUrl = asset.signedUrl;
      }
      const localSrc = path.join(TMP, `clip-src-${j._id}.mp4`);
      await downloadFile(sourceUrl, localSrc);

      const durationSec = await probeDurationSec(sourceUrl);
      const actualMinutes = Math.max(1, Math.ceil(durationSec / 60));

      // Enforce usage and record overage
      const gate = await assertWithinLimit({ orgId: String(j.orgId), key: 'clippilot_minutes', incBy: actualMinutes, allowOverage: true });
      if (!gate.ok) throw new Error('usage_limit');
      if (gate.overage && gate.overUnits) {
        try { await recordOverageRow({ orgId: String(j.orgId), key: 'clippilot_minutes', overUnits: gate.overUnits }); } catch {}
      }

      const scenes = await detectScenes(localSrc);
      const transcript = await transcribeWhisper(localSrc);
      const target = Math.min(Math.max(j.durationSec || 30, 5), 120);
      const segments = planScenes(scenes, durationSec, target, j.variants || 1);

      await ClipOutput.deleteMany({ jobId: j._id });
      const outputs: any[] = [];

      for (let idx = 0; idx < segments.length; idx++) {
        const seg = segments[idx];
        const clipId = `${j._id}-${idx}`;
        const clipPath = path.join(TMP, `clip-${clipId}.mp4`);
        const srtPath = path.join(TMP, `clip-${clipId}.srt`);
        const captionPath = path.join(TMP, `clip-${clipId}-caption.mp4`);

        await cutClip(localSrc, seg.start, seg.end, clipPath);
        const srtContent = buildSrtForWindow(transcript, seg.start, seg.end);
        if (srtContent.trim()) {
          await fs.writeFile(srtPath, srtContent, 'utf8');
          await burnCaptions(clipPath, srtPath, captionPath, j.branding, seg.end - seg.start);
        } else {
          await fs.copyFile(clipPath, captionPath);
        }
        const combinedText = transcript
          .filter((t) => t.end > seg.start && t.start < seg.end)
          .map((t) => t.text)
          .join(' ')
          .trim();
        const meta = await generateClipMetadata(combinedText);
        const title = meta.title || combinedText.slice(0, 80);
        const hookText = meta.hook || combinedText.slice(0, 120);
        const hashtags = Array.isArray(meta.hashtags) ? meta.hashtags.slice(0, 8) : [];
        const captionSuggestion = meta.caption || hookText;
        const thumbnailText = meta.thumbnail || hookText;
        const publishTargets = Array.isArray(meta.publishTargets) ? meta.publishTargets : [];

        if (!S3_BUCKET) throw new Error('S3_BUCKET missing');
        const baseKey = storageKey
          ? `${storageKey.replace(/\.[^.]+$/, '')}/clips/clip_${idx}`
          : `clips/user_${j.userId}/${j._id}/clip_${idx}`;
        const rawKey = `${baseKey}_raw.mp4`;
        const captionBaseKey = `${baseKey}_caption`;
        const srtKey = `${baseKey}.srt`;
        const rawSize = await uploadClip(clipPath, rawKey);
        if (srtContent.trim()) {
          const srtData = await fs.readFile(srtPath);
          await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: srtKey, Body: srtData, ContentType: 'text/plain' }));
        }

        const variants: Array<{ aspect: '9:16' | '1:1' | '16:9'; key: string; size: number }> = [];
        const aspects: Array<'9:16' | '1:1' | '16:9'> = ['9:16','1:1','16:9'];
        for (const aspect of aspects) {
          const variantPath = path.join(TMP, `${clipId}-${aspect.replace(':','_')}.mp4`);
          const baseVariantPath = path.join(TMP, `${clipId}-${aspect.replace(':','_')}-base.mp4`);
          await convertAspect(captionPath, baseVariantPath, aspect);
          await mixMusic(baseVariantPath, variantPath, j.branding);
          const aspectKey = `${captionBaseKey}_${aspect.replace(':','x')}.mp4`;
          const aspectSize = await uploadClip(variantPath, aspectKey);
          await Asset.create({
            userId: j.userId,
            key: aspectKey,
            bucket: S3_BUCKET,
            region: S3_REGION,
            contentType: 'video/mp4',
            size: aspectSize,
            status: 'ready',
            type: 'video',
          });
          variants.push({ aspect, key: aspectKey, size: aspectSize });
          try { await fs.unlink(variantPath); } catch {}
        }

        const thumbKey = await generateThumbnailImage(thumbnailText, baseKey);
        if (thumbKey) {
          await Asset.create({
            userId: j.userId,
            key: thumbKey,
            bucket: S3_BUCKET,
            region: S3_REGION,
            contentType: 'image/png',
            status: 'ready',
            type: 'image',
          });
        }
        outputs.push(
          ...variants.map((variant, variantIdx) => ({
            jobId: j._id,
            index: idx * aspects.length + variantIdx,
            url: `/api/assets/view?key=${encodeURIComponent(variant.key)}`,
            storageKey: variant.key,
            durationSec: Math.round(seg.end - seg.start),
            bytes: variant.size,
            title,
            hook: hookText,
            hashtags,
            captionText: captionSuggestion,
            thumbnailText,
            thumbnailKey: thumbKey ?? undefined,
            publishTargets,
            rawKey,
            captionKey: variant.key,
            srtKey: srtContent.trim() ? srtKey : undefined,
            aspect: variant.aspect,
          }))
        );
        try { await fs.unlink(clipPath); } catch {}
        try { await fs.unlink(captionPath); } catch {}
        try { await fs.unlink(srtPath); } catch {}
      }

      if (outputs.length) await ClipOutput.insertMany(outputs);

      j.status = 'done'; j.actualMinutes = actualMinutes; j.estimateMinutes = Math.max(j.estimateMinutes || 0, actualMinutes);
      await j.save();
      try { await fs.unlink(localSrc); } catch {}

      try { await track(String(j.orgId), String(j.userId), { module: 'clippilot', type: 'watchtime.added', meta: { minutes: actualMinutes } }); } catch {}
    } catch (e) {
      j.status = 'error'; j.error = (e as any)?.message || 'error'; await j.save();
      throw e;
    }
  },
  { connection: redis }
);
