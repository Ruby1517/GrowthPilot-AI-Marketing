
import "dotenv/config";
import { Worker as BullWorker } from "bullmq";
import IORedis from "ioredis";
import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import ffmpegBin from "@ffmpeg-installer/ffmpeg";
import ffprobeBin from "@ffprobe-installer/ffprobe";
import OpenAI from "openai";

import ClipJob from "@/models/ClipJob";
import ClipOutput from "@/models/ClipOutput";

const pexec = promisify(execFile);
// ⬇️ configure ioredis for BullMQ Worker
const redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,   // <- REQUIRED for BullMQ Worker
  enableReadyCheck: false,      // <- recommended
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const TMP = process.env.TMPDIR || "/tmp";
const FFMPEG = ffmpegBin.path;
const FFPROBE = ffprobeBin.path;

async function connectDb() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);
}

function pct(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

async function update(jobDoc: any, stage: string, progress: number) {
  jobDoc.stage = stage;
  jobDoc.progress = pct(progress);
  await jobDoc.save();
}

// ===== S3 helpers =====
async function s3Download(s3: S3Client, bucket: string, key: string, outPath: string) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = res.Body as any;
  const fsStream = (await import("node:fs")).createWriteStream(outPath);
  await new Promise((resolve, reject) => {
    stream.pipe(fsStream);
    stream.on("error", reject);
    fsStream.on("finish", resolve);
  });
}

async function s3Upload(s3: S3Client, bucket: string, key: string, filePath: string, contentType: string) {
  const data = await fs.readFile(filePath);
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType }));
  return data.length;
}

// ===== ffprobe / ffmpeg helpers =====
async function ffprobe(file: string) {
  const { stdout } = await pexec(FFPROBE, ["-v","error","-print_format","json","-show_format","-show_streams", file], { maxBuffer: 20_000_000 });
  return JSON.parse(stdout);
}

function getFps(meta: any) {
  const v = meta.streams?.find((s: any) => s.codec_type === "video");
  if (!v?.r_frame_rate) return 30;
  const [a, b] = v.r_frame_rate.split("/").map(Number);
  return b ? a / b : a;
}

async function detectSilences(file: string) {
  const { stderr } = await pexec(FFMPEG, ["-i", file, "-af", "silencedetect=noise=-35dB:d=0.6", "-f", "null", "-"], { maxBuffer: 50_000_000 });
  const segs: { start: number; end: number }[] = [];
  let cur: any = null;
  stderr.split("\n").forEach((l) => {
    let m = l.match(/silence_start:\s*([0-9.]+)/);
    if (m) cur = { start: parseFloat(m[1]), end: 0 };
    m = l.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration/);
    if (m && cur) {
      cur.end = parseFloat(m[1]); segs.push(cur); cur = null;
    }
  });
  return segs;
}

async function ffmpegCut(inFile: string, outFile: string, start: number, end: number) {
  const dur = (end - start).toFixed(3);
  await pexec(FFMPEG, ["-ss", String(start), "-i", inFile, "-t", dur, "-c:v","libx264","-preset","veryfast","-crf","20","-c:a","aac","-movflags","+faststart", outFile], { maxBuffer: 50_000_000 });
}

async function ffmpegBurnAndResize(inFile: string, srt: string, outFile: string, aspect: "9:16" | "1:1") {
  const vf =
    aspect === "9:16"
      ? `subtitles='${srt.replace(/'/g,"\\'")}',scale=-2:1920,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black`
      : `subtitles='${srt.replace(/'/g,"\\'")}',scale=1080:-2,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black`;
  await pexec(FFMPEG, ["-i", inFile, "-vf", vf, "-c:v","libx264","-preset","veryfast","-crf","20","-c:a","aac","-movflags","+faststart", outFile], { maxBuffer: 100_000_000 });
}

// ===== Whisper + LLM helpers =====
type Word = { t0: number; t1: number; text: string };

async function transcribeWhisper(filePath: string): Promise<Word[]> {
  const fsNative = await import("node:fs");
  const file = fsNative.createReadStream(filePath);
  const resp: any = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });
  const words: Word[] = (resp.words || []).map((w: any) => ({ t0: w.start, t1: w.end, text: w.word }));
  return words;
}

function chunkTranscript(words: Word[], silences: { start: number; end: number }[], min = 6, max = 20) {
  const out: any[] = [];
  if (!words.length) return out;
  let cur: any = { startSec: words[0].t0, words: [] as Word[] };
  let last = words[0].t0;

  const flush = () => {
    if (!cur.words.length) return;
    out.push({ ...cur, endSec: last, text: cur.words.map((w: any) => w.text).join("").trim() });
    cur = { startSec: last, words: [] as Word[] };
  };

  for (const w of words) {
    if (!cur.words.length) cur.startSec = w.t0;
    cur.words.push(w);
    last = w.t1;
    const len = w.t1 - cur.startSec;
    const nearSilence = silences.find((s) => Math.abs(s.start - w.t1) < 0.5);
    if ((len >= min && nearSilence) || len >= max || /[.!?]/.test(w.text)) {
      flush();
    }
  }
  flush();
  return out.filter((c) => c.endSec - c.startSec >= min);
}

function scoreHeuristics(chunks: any[]) {
  return chunks.map((c: any) => {
    const len = c.endSec - c.startSec;
    const wpm = (c.words.length / Math.max(1, len)) * 60;
    const emotive = /you|we|now|today|best|secret|tip|how|why|[0-9]/i.test(c.text) ? 1 : 0;
    const score = wpm * 0.4 + emotive * 0.6;
    return { ...c, score };
  });
}

async function rerankLLM(chunks: any[], pre: any[], maxClips: number) {
  const ranked = pre.sort((a: any, b: any) => b.score - a.score).slice(0, Math.max(12, maxClips * 2));
  const prompt =
    `Pick the top ${maxClips} clip indices (in brackets) that are most engaging and self-contained.\n` +
    ranked.map((c: any, i: number) => `[${i}] (${(c.endSec - c.startSec).toFixed(1)}s) ${c.text}`).join("\n");
  const r = await openai.responses.create({ model: "gpt-4.1-mini", input: prompt });
  const text = r.output_text || "";
  const ids = Array.from(text.matchAll(/\[(\d+)\]/g)).map((m) => parseInt(m[1]!, 10)).slice(0, maxClips);
  return ids.map((i) => ranked[i]);
}

function toSRT(words: Word[]) {
  if (!words.length) return "";
  let idx = 1;
  const lines: string[] = [];
  let cur: Word[] = [];
  let t0 = words[0].t0;
  let last = t0;

  const ts = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
  };

  const flush = () => {
    if (!cur.length) return;
    lines.push(`${idx++}\n${ts(t0)} --> ${ts(last)}\n${cur.map((w) => w.text).join("").trim()}\n`);
    cur = [];
    t0 = last;
  };

  for (const w of words) {
    cur.push(w);
    last = w.t1;
    if (last - t0 >= 1.2 || /[.!?]/.test(w.text)) flush();
  }
  flush();
  return lines.join("\n");
}

async function titleAndThumb(text: string) {
  const prompt = `Given this clip transcript, write:\n1) TITLE (<= 60 chars)\n2) THUMB WORDS (<= 40 chars, 3-5 words)\nTranscript:\n${text}`;
  const r = await openai.responses.create({ model: "gpt-4.1-mini", input: prompt });
  const out = r.output_text || "";
  const title = (out.match(/TITLE[:\-]\s*(.*)/i)?.[1] || out.split("\n")[0] || "").trim().slice(0, 60);
  const thumbText = (out.match(/THUMB.*?:\s*(.*)/i)?.[1] || "").trim().slice(0, 40);
  return { title, thumbText };
}

// ===== Worker main =====
new BullWorker(
  "clip-queue",
  async (job) => {
    await connectDb();

    const { jobId } = job.data as { jobId: string };
    const j = await (ClipJob as any).findById(jobId);
    if (!j) return;

    try {
      j.status = "processing";
      await update(j, "probe", 10);

      const { bucket, region, key } = j.source;
      const s3 = new S3Client({ region });

      // Download
      const srcPath = path.join(TMP, `src-${j._id}.mp4`);
      await s3Download(s3, bucket, key, srcPath);

      // Probe
      const meta = await ffprobe(srcPath);
      const duration = Number(meta.format?.duration || 0);
      const fps = getFps(meta);
      j.source.duration = duration; j.source.fps = fps;
      await j.save();

      // Transcribe
      await update(j, "transcribe", 25);
      const words = await transcribeWhisper(srcPath);

      // Analyze (silence + chunk + score + LLM rerank)
      await update(j, "analyze", 45);
      const silences = await detectSilences(srcPath);
      const chunks = chunkTranscript(words, silences, j.minClipSec || 20, j.maxClipSec || 60);
      const pre = scoreHeuristics(chunks);
      const picks = await rerankLLM(chunks, pre, j.maxClips || 6);
      const planned = Math.max(1, picks.length);

      // Render
      await update(j, "render", 60);

      const outputs: any[] = [];
      for (let i = 0; i < picks.length; i++) {
        const c = picks[i];
        const clipId = `${j._id}-${i}`;
        const basePrefix = key.replace(/\.[^.]+$/, "");
        const rawClip = path.join(TMP, `${clipId}-raw.mp4`);
        const srtPath = path.join(TMP, `${clipId}.srt`);
        const out916 = path.join(TMP, `${clipId}-916.mp4`);
        const out11 = path.join(TMP, `${clipId}-11.mp4`);

        // Build SRT from the words inside the chosen window
        const clipWords = words.filter((w) => w.t1 > c.startSec && w.t0 < c.endSec);
        await fs.writeFile(srtPath, toSRT(clipWords), "utf8");

        // Cut, burn, resize
        await ffmpegCut(srcPath, rawClip, c.startSec, c.endSec);
        await ffmpegBurnAndResize(rawClip, srtPath, out916, "9:16");
        await ffmpegBurnAndResize(rawClip, srtPath, out11, "1:1");

        // Titles + thumb text ideas
        const { title, thumbText } = await titleAndThumb(c.text);

        // Upload
        await update(j, "upload", 95);
        const srtKey = `${basePrefix}/clips/${clipId}.srt`;
        const k916 = `${basePrefix}/clips/${clipId}_916.mp4`;
        const k11  = `${basePrefix}/clips/${clipId}_11.mp4`;

        const szSrt = await s3Upload(s3, bucket, srtKey, srtPath, "text/plain");
        const sz916 = await s3Upload(s3, bucket, k916, out916, "video/mp4");
        const sz11  = await s3Upload(s3, bucket, k11,  out11,  "video/mp4");

        outputs.push({
          idx: i,
          startSec: c.startSec, endSec: c.endSec, score: c.score,
          title, thumbText,
          srt: { bucket, region, key: srtKey },
          mp4_916: { bucket, region, key: k916, size: sz916 },
          mp4_11:  { bucket, region, key: k11,  size: sz11  },
        });

        // incremental progress within render phase (60→90)
        const p = 60 + Math.round(((i + 1) / planned) * 30);
        await update(j, "render", p);
        // cleanup temps for this clip
        try { await fs.unlink(rawClip); } catch {}
        try { await fs.unlink(srtPath); } catch {}
        try { await fs.unlink(out916); } catch {}
        try { await fs.unlink(out11); } catch {}
      }

      // Save outputs
      if (outputs.length) await ClipOutput.insertMany(outputs.map((o) => ({ jobId: j._id, ...o })));

      // Done
      j.status = "done";
      await update(j, "done", 100);

      // cleanup source
      try { await fs.unlink(srcPath); } catch {}
    } catch (e: any) {
      j.status = "failed";
      j.error = String(e?.message || e);
      await update(j, "failed", j.progress || 0);
      throw e;
    }
  },
  { connection: redis, concurrency: 1 }
);
