import { NextResponse } from 'next/server';
import { FFMPEG_BIN, FFPROBE_BIN } from '@/lib/ffbins';
import fs from 'fs';

export async function GET() {
  const ffmpegPath = FFMPEG_BIN || null;
  const ffprobePath = FFPROBE_BIN || null;
  const exists = (p: string | null) => (p ? fs.existsSync(p) : false);

  return NextResponse.json({
    FFMPEG_PATH: process.env.FFMPEG_PATH || null,
    FFPROBE_PATH: process.env.FFPROBE_PATH || null,
    resolved: {
      FFMPEG_BIN: ffmpegPath,
      FFMPEG_BIN_exists: exists(ffmpegPath),
      FFPROBE_BIN: ffprobePath,
      FFPROBE_BIN_exists: exists(ffprobePath),
    },
  });
}
export const runtime = 'nodejs';
