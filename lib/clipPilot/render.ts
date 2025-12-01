import path from "path";
import fs from "fs";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export type AudioMode =
  | "original_only"
  | "original_plus_music"
  | "voiceover_only"
  | "voiceover_plus_music";

export interface RenderOptions {
  videoPath: string;
  startSeconds: number;
  endSeconds: number;

  hookText?: string;
  promoLabel?: string;
  ctaText?: string;
  brandTag?: string;

  audioMode?: AudioMode;      // default: "original_only"
  musicPath?: string | null;  // optional background music
  voicePath?: string | null;  // optional AI voice-over mp3
}

const FONT_PATH = "/System/Library/Fonts/Supplemental/Arial.ttf";

export function renderClip(opts: RenderOptions): Promise<string> {
  const {
    videoPath,
    startSeconds,
    endSeconds,
    hookText,
    promoLabel,
    ctaText,
    brandTag,
    audioMode = "original_only",
    musicPath,
    voicePath,
  } = opts;

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const safeStart = Number.isFinite(startSeconds) ? Math.max(0, startSeconds) : 0;
  const rawEnd = Number.isFinite(endSeconds) ? endSeconds : safeStart;
  const rawDelta = rawEnd - safeStart;
  if (rawDelta <= 0) {
    throw new Error(`Invalid clip range: startSeconds=${startSeconds}, endSeconds=${endSeconds}`);
  }
  const duration = Math.max(0.5, rawDelta);

  const outputPath = path.join("/tmp", `clippilot-short-${Date.now()}.mp4`);

  const esc = (text: string) =>
    text
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/:/g, "\\:")
      .replace(/\n/g, " ");

  const vfFilters: string[] = [];
  vfFilters.push("scale=iw*0.9:ih*0.9,pad=iw/0.9:ih/0.9:(ow-iw)/2:(oh-ih)/2");

  if (hookText) {
    const t = esc(hookText);
    vfFilters.push(
      `drawtext=fontfile='${FONT_PATH}':text='${t}':fontcolor=white:fontsize=36:box=1:boxcolor=black@0.6:boxborderw=12:x=(w-text_w)/2:y=h*0.15`
    );
  }
  if (promoLabel) {
    const t = esc(promoLabel);
    vfFilters.push(
      `drawtext=fontfile='${FONT_PATH}':text='${t}':fontcolor=yellow:fontsize=24:box=1:boxcolor=black@0.6:boxborderw=8:x=40:y=40`
    );
  }
  if (ctaText) {
    const t = esc(ctaText);
    vfFilters.push(
      `drawtext=fontfile='${FONT_PATH}':text='${t}':fontcolor=white:fontsize=30:box=1:boxcolor=black@0.7:boxborderw=14:x=(w-text_w)/2:y=h-(text_h*2.5)`
    );
  }
  if (brandTag) {
    const t = esc(brandTag);
    vfFilters.push(
      `drawtext=fontfile='${FONT_PATH}':text='${t}':fontcolor=white:fontsize=20:box=1:boxcolor=black@0.5:boxborderw=6:x=w-text_w-40:y=h-text_h-40`
    );
  }

  return new Promise((resolve, reject) => {
    const hasMusic = !!musicPath && fs.existsSync(musicPath);
    const hasVoice = !!voicePath && fs.existsSync(voicePath);
    let mode: AudioMode = audioMode;
    const musicVol =
      mode === "voiceover_only" || mode === "voiceover_plus_music" ? 0.15 : 0.25;

    // Fallback if required inputs are missing
    if (mode === "original_plus_music" && !hasMusic) mode = "original_only";
    if ((mode === "voiceover_only" || mode === "voiceover_plus_music") && !hasVoice) {
      mode = hasMusic ? "original_plus_music" : "original_only";
    }
    if (mode === "voiceover_plus_music" && !hasMusic) {
      mode = hasVoice ? "voiceover_only" : "original_only";
    }

    ffmpeg.ffprobe(videoPath, (probeErr: any, data: any) => {
      const sourceHasAudio = !probeErr && (data.streams || []).some((s: any) => s.codec_type === "audio");

      const cmd = ffmpeg(videoPath)
        .setStartTime(safeStart)
        .setDuration(duration)
        .videoCodec("libx264")
        .audioCodec("aac")
        .format("mp4");

      if (vfFilters.length) {
        cmd.videoFilters(vfFilters.join(","));
      }

      switch (mode) {
        case "original_only": {
          // If no source audio, leave mapping default; ffmpeg may create silent track.
          break;
        }
        case "original_plus_music": {
          cmd.input(musicPath as string); // input #1
          if (sourceHasAudio) {
            const audioFilter =
              "[0:a]volume=1.0[a0];" +
              "[1:a]volume=" + musicVol + "[a1];" +
              "[a0][a1]amix=inputs=2:duration=shortest:dropout_transition=0[aout]";
            cmd.complexFilter(audioFilter);
            cmd.outputOptions(["-map 0:v:0", "-map [aout]"]);
          } else {
            // no source audio; just use music
            cmd.outputOptions(["-map 0:v:0", "-map 1:a:0"]);
          }
          break;
        }
        case "voiceover_only": {
          cmd.input(voicePath as string); // input #1
          cmd.outputOptions(["-map 0:v:0", "-map 1:a:0"]);
          break;
        }
        case "voiceover_plus_music": {
          cmd.input(voicePath as string); // input #1
          cmd.input(musicPath as string); // input #2
          const audioFilter =
            "[1:a]volume=1.0[v0];" +
            "[2:a]volume=" + musicVol + "[v1];" +
            "[v0][v1]amix=inputs=2:duration=shortest:dropout_transition=0[aout]";
          cmd.complexFilter(audioFilter);
          cmd.outputOptions(["-map 0:v:0", "-map [aout]"]);
          break;
        }
      }

      cmd
        .on("start", (cmdLine: string) => {
          console.log("ffmpeg command:", cmdLine);
        })
        .on("stderr", (line: string) => {
          console.log("ffmpeg stderr:", line);
        })
        .on("end", () => {
          console.log("ffmpeg finished, output:", outputPath);
          resolve(outputPath);
        })
        .on("error", (err: any) => {
          console.error("ffmpeg error:", err);
          reject(err);
        })
        .save(outputPath);
    });
  });
}
