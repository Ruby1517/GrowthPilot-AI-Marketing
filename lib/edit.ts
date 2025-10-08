import { execa } from "execa";
import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import crypto from "node:crypto";

async function dl(url: string, out: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(out, buf);
}

export async function ffprobeDuration(pathOrUrl: string) {
  const { stdout } = await execa("ffprobe", ["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1", pathOrUrl]);
  return parseFloat(stdout.trim());
}

export async function concatAudio(pieces: string[], outPath: string) {
  const list = pieces.map(p=>`file '${p.replace(/'/g,"'\\''")}'`).join("\n");
  const listFile = outPath + ".txt";
  await fs.writeFile(listFile, list);
  await execa("ffmpeg", ["-y","-f","concat","-safe","0","-i",listFile,"-c","copy",outPath]);
  return outPath;
}

export async function renderVideo(opts: {
  audioPath: string;
  mediaUrls: string[];
  outPath: string;
}) {
  const work = path.join(tmpdir(), "faceless-" + crypto.randomUUID());
  await fs.mkdir(work, { recursive: true });

  // 1) Determine audio duration
  const audioDur = await ffprobeDuration(opts.audioPath);
  const clipCount = Math.max(1, opts.mediaUrls.length);
  const seg = Math.max(5, Math.floor(audioDur / clipCount)); // seconds per clip

  // 2) Download & normalize each clip to 1080p, trim to `seg`
  const normalized: string[] = [];
  for (let i=0;i<opts.mediaUrls.length;i++) {
    const url = opts.mediaUrls[i];
    const raw = path.join(work, `raw_${i}.mp4`);
    await dl(url, raw);
    const norm = path.join(work, `norm_${i}.mp4`);
    await execa("ffmpeg", [
      "-y","-i", raw,
      "-vf", "scale=1920:1080:force_original_aspect_ratio=cover",
      "-t", String(seg),
      "-an",
      "-c:v", "libx264", "-preset","veryfast","-crf","20","-pix_fmt","yuv420p",
      norm
    ]);
    normalized.push(norm);
  }

  // If not enough footage, loop clips
  while (normalized.length * seg < audioDur - 1) {
    normalized.push(...normalized.slice(0, Math.min(normalized.length, 4)));
  }

  // 3) Concat video
  const listFile = path.join(work, "inputs.txt");
  await fs.writeFile(listFile, normalized.map(p=>`file '${p.replace(/'/g,"'\\''")}'`).join("\n"));
  const concatPath = path.join(work, "concat.mp4");
  await execa("ffmpeg", ["-y","-f","concat","-safe","0","-i",listFile,"-c","copy", concatPath]);

  // 4) Mux voice (no bgm for MVP; add later if you want)
  await execa("ffmpeg", [
    "-y",
    "-i", concatPath,
    "-i", opts.audioPath,
    "-map","0:v:0","-map","1:a:0",
    "-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p",
    "-shortest",
    opts.outPath
  ]);

  // Cleanup best-effort
  try { await fs.rm(work, { recursive: true, force: true }); } catch {}
}
