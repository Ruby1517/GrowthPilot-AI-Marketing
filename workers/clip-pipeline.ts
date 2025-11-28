// workers/clip-pipeline.ts
import { execFile } from "node:child_process"; import { promisify } from "node:util";
import path from "node:path"; import fs from "node:fs/promises";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import ffmpegPath from "@ffmpeg-installer/ffmpeg"; import ffprobePath from "@ffprobe-installer/ffprobe";
import OpenAI from "openai"; // for LLM ranking + titles; Whisper can be OpenAI or local
const pexec = promisify(execFile);

type ClipJobDoc = any; // import your mongoose type
const TMP = "/tmp"; // or process.env.TMPDIR

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function processClipJob(job: ClipJobDoc) {
  const { bucket, region, key } = job.source;
  const s3 = new S3Client({ region });

  // 1) Download source to tmp
  const srcFile = path.join(TMP, `src-${job._id}.mp4`);
  await downloadS3(s3, bucket, key, srcFile);

  // 2) Probe: duration, fps, scene/silence
  const meta = await ffprobe(srcFile);
  const duration = Number(meta.format.duration || 0);
  const fps = getFps(meta);
  job.source.duration = duration; job.source.fps = fps;

  const sceneCuts = await detectScenes(srcFile);       // array of seconds
  const silences = await detectSilences(srcFile);      // array of {start,end}

  // 3) Transcribe (Whisper) → words w/ timestamps
  const transcript = await transcribeWhisper(srcFile); // [{t0,t1,text}, ...]
  const chunks = chunkTranscript(transcript, silences, 6, 20); // chunk by pauses, target 6–20s

  // 4) Score + LLM rerank
  const heuristics = scoreHeuristics(chunks, sceneCuts);
  const top = await rerankWithLLM(chunks, heuristics, job.maxClips, job.minClipSec, job.maxClipSec);

  // 5) For each selected chunk: build SRT, cut, burn captions, scale 9:16 & 1:1
  const outputs:any[] = [];
  let idx = 0;
  for (const c of top) {
    const clipId = `${job._id}-${idx}`;
    const srtPath = path.join(TMP, `${clipId}.srt`);
    await fs.writeFile(srtPath, toSRT(c.words));

    // raw clip (for later encode)
    const rawClip = path.join(TMP, `${clipId}-raw.mp4`);
    await ffmpegCut(srcFile, rawClip, c.startSec, c.endSec);

    // burn captions and make aspect variants
    const out916 = path.join(TMP, `${clipId}-916.mp4`);
    await ffmpegBurnAndResize(rawClip, srtPath, out916, "9:16");
    const out11 = path.join(TMP, `${clipId}-11.mp4`);
    await ffmpegBurnAndResize(rawClip, srtPath, out11, "1:1");

    // 6) Titles + thumbnail text ideas
    const { title, thumbText } = await titleAndThumb(c.text);

    // 7) Upload to S3
    const basePrefix = key.replace(/\.[^.]+$/, ""); // same prefix as source
    const srtKey = `${basePrefix}/clips/${clipId}.srt`;
    const k916 = `${basePrefix}/clips/${clipId}_916.mp4`;
    const k11 = `${basePrefix}/clips/${clipId}_11.mp4`;
    await uploadFile(s3, bucket, srtKey, srtPath, "text/plain");
    const sz916 = await uploadFile(s3, bucket, k916, out916, "video/mp4");
    const sz11  = await uploadFile(s3, bucket, k11, out11, "video/mp4");

    outputs.push({
      startSec: c.startSec, endSec: c.endSec, score: c.score,
      title, thumbText,
      srt: { bucket, region, key: srtKey },
      mp4_916: { bucket, region, key: k916, size: sz916 },
      mp4_11:  { bucket, region, key: k11,  size: sz11  },
    });
    idx++;
  }

  // cleanup temp (best-effort)
  try { await fs.unlink(srcFile); } catch {}
  return outputs;
}

// ===== helpers =====

async function downloadS3(s3: S3Client, bucket: string, key: string, outPath: string) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = res.Body as any;
  const fsStream = (await import("node:fs")).createWriteStream(outPath);
  await new Promise((resolve,reject)=>{ stream.pipe(fsStream); stream.on("error",reject); fsStream.on("finish",resolve); });
}

async function uploadFile(s3: S3Client, bucket: string, key: string, filePath: string, contentType: string) {
  const data = await fs.readFile(filePath);
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType }));
  return data.length;
}

async function ffprobe(inFile: string) {
  const { stdout } = await pexec(ffprobePath.path, ["-v","error","-print_format","json","-show_format","-show_streams", inFile]);
  return JSON.parse(stdout);
}
function getFps(meta:any) {
  const v = meta.streams?.find((s:any)=>s.codec_type==="video");
  if (!v?.r_frame_rate) return 30;
  const [a,b] = v.r_frame_rate.split("/").map(Number); return b? a/b : a;
}

// Scene cuts using ffmpeg’s `select='gt(scene,0.3)'`
async function detectScenes(inFile:string) {
  const { stdout } = await pexec(ffmpegPath.path, ["-i", inFile, "-filter:v", "select='gt(scene,0.3)',showinfo", "-f", "null", "-"], { maxBuffer: 10_000_000 });
  const ts:number[] = [];
  stdout.split("\n").forEach(line=>{
    // parse showinfo lines if present (fallback noop)
  });
  return ts; // optional, you can also use ffprobe/pySceneDetect for better results
}

// Silence segments
async function detectSilences(inFile:string) {
  const { stderr } = await pexec(ffmpegPath.path, ["-i", inFile, "-af", "silencedetect=noise=-35dB:d=0.6", "-f", "null", "-"]);
  const segs:{start:number,end:number}[]=[];
  let cur:any=null;
  stderr.split("\n").forEach(l=>{
    let m = l.match(/silence_start:\s*([0-9.]+)/); if (m){ cur = { start: parseFloat(m[1]), end: 0 }; }
    m = l.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration/); if (m && cur){ cur.end = parseFloat(m[1]); segs.push(cur); cur=null; }
  });
  return segs;
}

// Whisper transcription (choose one):
async function transcribeWhisper(inFile:string) {
  // Option A: OpenAI Whisper-1 via file upload
  const fs = await import("node:fs");
  const file = fs.createReadStream(inFile);
  const resp = await openai.audio.transcriptions.create({ file, model: "whisper-1", response_format: "verbose_json", timestamp_granularities: ["word"] });
  // Map to [{t0,t1,text}]
  const words = (resp as any).words?.map((w:any)=>({ t0: w.start, t1: w.end, text: w.word })) || [];
  return words;
  // Option B (later): local whisper.cpp for cost control
}

function chunkTranscript(words: {t0:number,t1:number,text:string}[], silences:{start:number,end:number}[], min=6, max=20) {
  // Simple chunker: cut on silences near target window, keep within [min,max]
  const out:any[]=[]; let cur:any={ startSec: words[0]?.t0||0, words: [] };
  for (const w of words) {
    if (!cur.words.length) cur.startSec = w.t0;
    cur.words.push(w);
    const curLen = w.t1 - cur.startSec;
    const nearSilence = silences.find(s => Math.abs(s.start - w.t1) < 0.5);
    if ((curLen >= min && nearSilence) || curLen >= max) {
      out.push({ ...cur, endSec: w.t1, text: cur.words.map((x:any)=>x.text).join("").trim() });
      cur = { startSec: w.t1, words: [] };
    }
  }
  if (cur.words.length) out.push({ ...cur, endSec: cur.words.at(-1).t1, text: cur.words.map((x:any)=>x.text).join("").trim() });
  return out.filter(c => c.endSec - c.startSec >= min);
}

function scoreHeuristics(chunks:any[], sceneCuts:number[]) {
  // Naive: favor chunks overlapping a scene cut start, higher word rate, presence of numbers/“you/we”
  return chunks.map(c=>{
    const len = c.endSec - c.startSec;
    const wpm = (c.words.length / len) * 60;
    const emotive = /you|we|now|today|best|secret|tip|how|why|number/i.test(c.text) ? 1 : 0;
    const sceneBoost = sceneCuts.some(t => t >= c.startSec && t <= c.startSec+1) ? 1 : 0;
    const score = wpm*0.4 + emotive*0.5 + sceneBoost*0.3;
    return { ...c, score };
  });
}

async function rerankWithLLM(chunks:any[], pre:any[], maxClips:number, min:number, max:number) {
  const ranked = pre.sort((a:any,b:any)=>b.score-a.score).slice(0, Math.max(12, maxClips*2));
  const prompt = `You are ranking short video clip candidates for social media. Prefer high-impact, self-contained moments. Return top ${maxClips} indices.\n\n` +
    ranked.map((c:any,i:number)=>`[${i}] (${(c.endSec-c.startSec).toFixed(1)}s) ${c.text}`).join("\n");
  const r = await openai.responses.create({ model: "gpt-4.1-mini", input: prompt });
  const text = r.output_text || "";
  const ids = Array.from(text.matchAll(/\[(\d+)\]/g)).map(m=>parseInt(m[1],10)).slice(0,maxClips);
  return ids.map(i=> ranked[i]);
}

function toSRT(words: {t0:number,t1:number,text:string}[]) {
  // pack words into ~1.2s lines
  let idx=1, lines:string[]=[]; let cur:string[]=[]; let t0=words[0]?.t0||0; let last= t0;
  const flush=()=>{ if (!cur.length) return;
    lines.push(`${idx++}\n${ts(t0)} --> ${ts(last)}\n${cur.join("").trim()}\n`);
    cur=[]; t0=last;
  };
  for (const w of words) {
    cur.push(w.text);
    last = w.t1;
    if (last - t0 >= 1.2 || /[.!?]/.test(w.text)) flush();
  }
  flush();
  return lines.join("\n");
}
function ts(sec:number){ const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), s=Math.floor(sec%60), ms=Math.floor((sec%1)*1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
}

async function ffmpegCut(inFile:string, outFile:string, start:number, end:number){
  const dur = (end - start).toFixed(3);
  await pexec(ffmpegPath.path, ["-ss", String(start), "-i", inFile, "-t", dur, "-c:v","libx264","-preset","veryfast","-crf","20","-c:a","aac","-movflags","+faststart", outFile]);
}

// Burn SRT + resize/pad to aspect
async function ffmpegBurnAndResize(inFile:string, srt:string, outFile:string, aspect:"9:16"|"1:1"){
  const filter =
    aspect==="9:16"
      ? "scale=-2:1920, pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black"  // center pillarbox
      : "scale=1080:-2, pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black"; // letter/pillar as needed
  // Note: ffmpeg `subtitles` filter requires libass and UTF-8 SRT
  await pexec(ffmpegPath.path, ["-i", inFile, "-vf", `subtitles='${srt.replace(/'/g,"\\'")}',${filter}`, "-c:v","libx264","-preset","veryfast","-crf","20","-c:a","aac","-movflags","+faststart", outFile], { maxBuffer: 10_000_000 });
}

async function titleAndThumb(text:string) {
  const prompt = `Given this clip transcript, write:\n1) A short catchy TITLE (<= 60 chars)\n2) 3-5 WORDS for a thumbnail overlay (punchy).\nTranscript:\n${text}`;
  const r = await openai.responses.create({ model: "gpt-4.1-mini", input: prompt });
  const out = r.output_text || "";
  const title = (out.match(/TITLE[:\-]\s*(.*)/i)?.[1] || out.split("\n")[0] || "").trim().slice(0, 60);
  const thumbText = (out.match(/thumbnail.*?:\s*(.*)/i)?.[1] || "").trim().slice(0, 40);
  return { title, thumbText };
}
