import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { FFMPEG_BIN, FFPROBE_BIN } from "@/lib/ffbins";

function pickExisting(paths: Array<string | null | undefined>): string | null {
  for (const p of paths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

export function configureFfmpeg(instance: typeof ffmpeg = ffmpeg) {
  const resolvedFfmpeg = pickExisting([FFMPEG_BIN, ffmpegInstaller.path]) || "ffmpeg";
  instance.setFfmpegPath(resolvedFfmpeg);
  process.env.FFMPEG_PATH = resolvedFfmpeg;

  const resolvedFfprobe = pickExisting([FFPROBE_BIN, ffprobeInstaller.path]) || "ffprobe";
  instance.setFfprobePath(resolvedFfprobe);
  process.env.FFPROBE_PATH = resolvedFfprobe;

  return { ffmpegPath: resolvedFfmpeg, ffprobePath: resolvedFfprobe };
}

// Configure immediately so any import gets consistent paths.
configureFfmpeg();

export default ffmpeg;
