/**
 * ClipPilot Worker (Node.js + fluent-ffmpeg)
 *
 * Responsibilities:
 * - Poll or receive jobs (mocked inline; swap with BullMQ/SQS/etc.)
 * - Download input video from S3 by inputKey
 * - Probe metadata with ffprobe
 * - Cut a short clip, overlay text, optionally mix music
 * - Upload output to S3 and mark job completed with outputKey
 *
 * Assumptions:
 * - ffmpeg and ffprobe binaries are available on PATH (or set FFMPEG_PATH/FFPROBE_PATH)
 * - AWS creds + S3_BUCKET/AWS_REGION env vars are set (see lib/s3.ts)
 * - MongoDB URI configured via MONGODB_URI
 */

import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import ffmpeg from "fluent-ffmpeg";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { dbConnect } from "../../lib/db";
import { s3, putBuffer, guessContentType } from "../../lib/s3";
import ClipJobLite from "../../models/ClipJobLite";
import { configureFfmpeg } from "../../lib/clippilot/ffmpeg-config";
import type { ClipJob } from "../../types/clip-job";

configureFfmpeg(ffmpeg);

type QueuedJob = ClipJob & { musicKey?: string; overlayText?: string };

// --- Queue integration placeholders ---
// Replace fetchNextJob/processLoop with:
// - BullMQ: worker = new Worker('clip-simple', handler, { connection })
// - SQS: poll ReceiveMessage, then handle payload
// - Any other queue: wire its consume callback to processJob()

async function fetchNextJob(): Promise<QueuedJob | null> {
  // Mocked polling via Mongo; swap this with queue consumer
  await dbConnect();
  const doc = await (ClipJobLite as any).findOneAndUpdate(
    { status: "queued" },
    { status: "processing" },
    { sort: { createdAt: 1 }, new: true }
  ).lean();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    userId: doc.userId || undefined,
    inputKey: doc.inputKey,
    outputKey: doc.outputKey || undefined,
    status: doc.status,
    error: doc.error || undefined,
    createdAt: doc.createdAt,
  };
}

async function downloadFromS3(key: string): Promise<string> {
  const outPath = path.join("/tmp", `clipjob-${Date.now()}-${path.basename(key) || "input"}.mp4`);
  const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
  if (!obj.Body) throw new Error("S3 object has no body");
  await pipeline(obj.Body as any, fs.createWriteStream(outPath));
  return outPath;
}

async function probeMeta(inputPath: string) {
  return new Promise<{ durationSec: number }>((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err: any, data: any) => {
      if (err) return reject(err);
      const durationSec = Number(data.format?.duration || 0);
      resolve({ durationSec: durationSec > 0 ? durationSec : 0 });
    });
  });
}

async function renderClip(opts: {
  inputPath: string;
  overlayText?: string;
  musicPath?: string | null;
  targetDurationSec?: number;
}): Promise<string> {
  const { inputPath, overlayText, musicPath, targetDurationSec = 20 } = opts;
  const outputPath = path.join("/tmp", `clipjob-output-${Date.now()}.mp4`);
  const hasMusic = musicPath && fs.existsSync(musicPath);

  return new Promise((resolve, reject) => {
    const filters: string[] = ["scale=iw*0.9:ih*0.9,pad=iw/0.9:ih/0.9:(ow-iw)/2:(oh-ih)/2"];
    if (overlayText) {
      const escaped = overlayText.replace(/:/g, "\\:").replace(/'/g, "\\'");
      filters.push(
        `drawtext=font=Arial:text='${escaped}':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=12:x=(w-text_w)/2:y=h*0.15`
      );
    }

    const cmd = ffmpeg(inputPath)
      .setStartTime(0)
      .setDuration(targetDurationSec)
      .videoCodec("libx264")
      .audioCodec("aac")
      .format("mp4");

    if (filters.length) {
      cmd.videoFilters(filters.join(","));
    }

    if (hasMusic) {
      cmd.input(musicPath as string);
      const audioFilter =
        "[0:a]volume=1.0[a0];" +
        "[1:a]volume=0.2[a1];" +
        "[a0][a1]amix=inputs=2:duration=shortest:dropout_transition=0[aout]";
      cmd.complexFilter(audioFilter);
      cmd.outputOptions(["-map 0:v:0", "-map [aout]"]);
    }

    cmd
      .on("end", () => resolve(outputPath))
      .on("error", (err: any) => reject(err))
      .save(outputPath);
  });
}

async function uploadOutput(localPath: string, userId?: string): Promise<string> {
  const filename = path.basename(localPath) || "clip.mp4";
  const key = `clippilot/outputs/${userId ? `${userId}/` : ""}${Date.now()}-${filename}`;
  const buffer = await fs.promises.readFile(localPath);
  await putBuffer(key, buffer, guessContentType(filename));
  return key;
}

async function updateJob(id: string, patch: Partial<QueuedJob>) {
  await (ClipJobLite as any).findByIdAndUpdate(id, patch, { new: true });
}

async function processJob(job: QueuedJob) {
  const localInput = await downloadFromS3(job.inputKey);
  const meta = await probeMeta(localInput);
  const targetDuration = Math.min(meta.durationSec || 20, 30) || 20;

  const localMusic = null; // placeholder; map job.musicKey to S3 download if desired
  const rendered = await renderClip({
    inputPath: localInput,
    overlayText: job.overlayText || "ClipPilot",
    musicPath: localMusic,
    targetDurationSec: targetDuration,
  });
  const outputKey = await uploadOutput(rendered, job.userId);

  await updateJob(job.id, { status: "completed", outputKey });
  // cleanup tmp files
  try {
    fs.unlinkSync(localInput);
    fs.unlinkSync(rendered);
  } catch {}
}

async function main() {
  const job = await fetchNextJob();
  if (!job) {
    console.log("[clippilot/worker] no queued jobs");
    return;
  }
  console.log("[clippilot/worker] processing job", job.id);
  try {
    await processJob(job);
    console.log("[clippilot/worker] completed job", job.id);
  } catch (err: any) {
    console.error("[clippilot/worker] failed job", job.id, err);
    await updateJob(job.id, { status: "failed", error: err?.message || String(err) });
  }
}

// For local/manual runs. In real use, wire processJob into a queue consumer.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
