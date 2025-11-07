import 'server-only';
import fs from 'fs';
import path from 'path';

function sanitizeEnvPath(p?: string | null): string | null {
  if (!p) return null;
  let v = String(p).trim();
  if (!v) return null;
  // strip surrounding quotes if any
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  // On Windows, if a directory is provided, append executable
  if (process.platform === 'win32') {
    const lower = v.toLowerCase();
    if (lower.endsWith('\\') || lower.endsWith('/')) v = v.slice(0, -1);
    const isExe = lower.endsWith('.exe');
    const looksLikeDir = !isExe && !/\.[a-z0-9]+$/i.test(lower);
    if (looksLikeDir) {
      // If it looks like a bin folder, append appropriate exe name
      const guessed = path.win32.join(v, v.toLowerCase().includes('ffprobe') ? 'ffprobe.exe' : 'ffmpeg.exe');
      if (fs.existsSync(guessed)) return guessed;
      // fall back to provided directory path; execFile can still fail with ENOENT which we catch upstream
    } else if (!isExe) {
      // If "ffmpeg" without extension, append .exe
      const withExe = v + '.exe';
      if (fs.existsSync(withExe)) return withExe;
    }
  }
  return v;
}

// Resolve binary paths without forcing existence — upstream will attempt exec and provide clear errors.
function resolveFfmpeg(envName: string): string | null {
  const envPath = sanitizeEnvPath(process.env[envName]);
  if (envPath) return envPath;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod: any = require('ffmpeg-static');
    const p = typeof mod === 'string' ? (mod as string) : (typeof mod?.path === 'string' ? mod.path : null);
    if (p) return p as string;
  } catch {}
  return null;
}

function resolveFfprobe(envName: string): string | null {
  const envPath = sanitizeEnvPath(process.env[envName]);
  if (envPath) return envPath;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod: any = require('ffprobe-static');
    const p = typeof mod === 'string' ? (mod as string) : (typeof mod?.path === 'string' ? mod.path : null);
    if (p) return p as string;
  } catch {}
  return null;
}

export const FFMPEG_BIN = resolveFfmpeg('FFMPEG_PATH');
export const FFPROBE_BIN = resolveFfprobe('FFPROBE_PATH');

/** Throw clear errors early if needed */
export function assertFfmpegAvailable() {
  if (!FFMPEG_BIN) {
    throw new Error(
      'FFmpeg not found. Install `ffmpeg-static` or set FFMPEG_PATH to a valid ffmpeg executable.'
    );
  }
}
export function assertFfprobeAvailable() {
  if (!FFPROBE_BIN) {
    throw new Error(
      'ffprobe not found. Install `ffprobe-static` or set FFPROBE_PATH to a valid ffprobe executable.'
    );
  }
}
