// lib/clipPilot/makeVideo.ts
import { writeFile, mkdtemp, readFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile as _execFile } from 'child_process';
import { promisify } from 'util';
import { FFMPEG_BIN } from '@/lib/ffbins';
const execFile = promisify(_execFile);

type Aspect = '9:16' | '1:1' | '16:9';

function sizeFor(aspect: Aspect) {
  switch (aspect) {
    case '9:16': return { w: 1080, h: 1920 };
    case '1:1':  return { w: 1080, h: 1080 };
    default:     return { w: 1920, h: 1080 };
  }
}

/**
 * Compose a solid background + TTS audio → H.264 MP4.
 * Returns MP4 buffer + the temp mp3 path for optional probing.
 */
export async function composeTTSVideo(opts: {
  ttsMp3: Buffer;
  title?: string;
  aspect: Aspect;
}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'clippilot-'));
  const audioPath = path.join(tmp, 'voice.mp3');
  const outPath   = path.join(tmp, 'out.mp4');
  await writeFile(audioPath, opts.ttsMp3);

  const { w, h } = sizeFor(opts.aspect);

  // Build filter graph
  const drawTitle = opts.title
    ? `,drawtext=text='${opts.title
        .replace(/\\/g, '\\\\')     // escape backslashes first
        .replace(/:/g, '\\:')
        .replace(/'/g, "\\'")
      }':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=120:box=1:boxcolor=black@0.4:boxborderw=20`
    : '';
  // We feed a long color source and use -shortest to stop at audio end
  const filterComplex = `color=c=black:size=${w}x${h}:rate=30:d=3600[bg];[bg]format=yuv420p${drawTitle}`;

  // IMPORTANT: use execFile with args array; do NOT quote the binary
  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=black:s=${w}x${h}:d=3600`,
    '-i', audioPath,
    '-filter_complex', filterComplex,
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outPath,
  ];

  // Prefer resolved static/path binary; fall back to system PATH name
  const ffmpegBin = FFMPEG_BIN || 'ffmpeg';
  try {
    await execFile(ffmpegBin, args);
  } catch (err: any) {
    // Provide clearer error when binary is missing/unset
    if (err?.code === 'ENOENT' || !FFMPEG_BIN) {
      throw new Error('FFmpeg not found. Install ffmpeg or add ffmpeg-static, or set FFMPEG_PATH.');
    }
    throw err;
  }
  const mp4 = await readFile(outPath);
  return { mp4, tempAudioPath: audioPath };
}
