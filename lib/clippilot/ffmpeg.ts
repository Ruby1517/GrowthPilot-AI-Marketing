import fs from "fs";
import path from "path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";

// Ensure fluent-ffmpeg uses the packaged binary
const packaged = ffmpegInstaller.path;
const resolvedFfmpeg = packaged && fs.existsSync(packaged) ? packaged : "ffmpeg";
ffmpeg.setFfmpegPath(resolvedFfmpeg);
// Also set env var as a fallback for libraries that read it directly
process.env.FFMPEG_PATH = resolvedFfmpeg;

const packagedProbe = ffprobeInstaller.path;
const resolvedFfprobe = packagedProbe && fs.existsSync(packagedProbe) ? packagedProbe : "ffprobe";
ffmpeg.setFfprobePath(resolvedFfprobe);
process.env.FFPROBE_PATH = resolvedFfprobe;

export function extractAudio(inputVideoPath: string): Promise<string | null> {
  const output = path.join("/tmp", `clippilot-audio-${Date.now()}.mp3`);

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputVideoPath, (probeErr: any, data: any) => {
      if (probeErr) return reject(probeErr);
      const hasAudio = (data.streams || []).some((s: any) => s.codec_type === "audio");
      if (!hasAudio) return resolve(null);

      ffmpeg(inputVideoPath)
        .inputOption("-y") // overwrite temp outputs if they exist
        .outputOptions([
          "-vn", // drop video
          "-acodec", "libmp3lame",
          "-b:a", "192k",
        ])
        .noVideo()
        .audioCodec("libmp3lame")
        .save(output)
        .on("end", () => resolve(output))
        .on("error", (err: any) => reject(err));
    });
  });
}
