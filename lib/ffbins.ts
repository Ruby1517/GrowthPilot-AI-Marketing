// lib/ffbins.ts
import 'server-only';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const req = createRequire(__filename);

/**
 * Resolve a static binary path safely at runtime.
 * Priority: ENV override -> package (ffmpeg-static/ffprobe-static) -> null
 */
function resolveBinFrom(
  envName: string,
  pkgName: string,
  exportName?: 'path'
): string | null {
  // 1) ENV override (e.g., set to C:\ffmpeg\bin\ffmpeg.exe)
  const envPath = process.env[envName];
  if (envPath && fs.existsSync(envPath)) return envPath;

  // 2) Runtime require without bundler rewriting
  try {
    const mod = req(pkgName);
    const p =
      typeof mod === 'string'
        ? (mod as string)
        : exportName && mod && typeof mod[exportName] === 'string'
        ? (mod[exportName] as string)
        : null;
    if (p && fs.existsSync(p)) return p;
  } catch {
    // package not installed or cannot resolve on this platform
  }

  return null;
}

export const FFMPEG_BIN =
  resolveBinFrom('FFMPEG_PATH', 'ffmpeg-static') ||
  resolveBinFrom('FFMPEG_PATH', 'ffmpeg-static', 'path'); // some builds expose .path

export const FFPROBE_BIN =
  resolveBinFrom('FFPROBE_PATH', 'ffprobe-static') ||
  resolveBinFrom('FFPROBE_PATH', 'ffprobe-static', 'path');

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
