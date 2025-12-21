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
  playbackRate?: number;

  hookText?: string;
  promoLabel?: string;
  ctaText?: string;
  brandTag?: string;

  audioMode?: AudioMode;      // default: "original_only"
  musicPath?: string | null;  // optional background music
  voicePath?: string | null;  // optional AI voice-over mp3
  voiceGainDb?: number;       // optional gain for voice track
  musicGainDb?: number;       // optional gain for music track
  voiceEq?: string | null;    // optional eq filter string for voice (ffmpeg expression)
  musicEq?: string | null;    // optional eq filter string for music (ffmpeg expression)
}

const FONT_PATH = "/System/Library/Fonts/Supplemental/Arial.ttf";

export function renderClip(opts: RenderOptions): Promise<string> {
  const {
    videoPath,
    startSeconds,
    endSeconds,
    hookText,
  playbackRate = 1,
  promoLabel,
  ctaText,
  brandTag,
  audioMode = "original_only",
  musicPath,
  voicePath,
  voiceGainDb,
  musicGainDb,
  voiceEq,
  musicEq,
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
  const speed = Number.isFinite(playbackRate) ? Math.min(2, Math.max(0.5, playbackRate)) : 1;
  if (speed !== 1) {
    vfFilters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
  }
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
    const baseMusicVol =
      mode === "voiceover_only" || mode === "voiceover_plus_music" ? 0.15 : 0.25;
    const finalMusicVol =
      typeof musicGainDb === "number" ? baseMusicVol * Math.pow(10, musicGainDb / 20) : baseMusicVol;
    const finalVoiceVol = typeof voiceGainDb === "number" ? Math.pow(10, voiceGainDb / 20) : 1;

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
          if (speed !== 1 && sourceHasAudio) {
            cmd.audioFilters(`atempo=${speed}`);
          }
          break;
        }
        case "original_plus_music": {
          cmd.input(musicPath as string); // input #1
          if (sourceHasAudio) {
            const musicChain = musicEq ? `[1:a]${musicEq},volume=${finalMusicVol}[a1];` : `[1:a]volume=${finalMusicVol}[a1];`;
            let audioFilter =
              "[0:a]volume=1.0[a0];" +
              musicChain +
              "[a0][a1]amix=inputs=2:duration=shortest:dropout_transition=0[aout]";
            if (speed !== 1) {
              audioFilter += `;[aout]atempo=${speed}[aout]`;
            }
            cmd.complexFilter(audioFilter);
            cmd.outputOptions(["-map 0:v:0", "-map [aout]"]);
          } else {
            // no source audio; just use music
            if (musicEq) {
              let filter = `[1:a]${musicEq},volume=${finalMusicVol}[aout]`;
              if (speed !== 1) filter += `;[aout]atempo=${speed}[aout]`;
              cmd.complexFilter(filter);
              cmd.outputOptions(["-map 0:v:0", "-map [aout]"]);
            } else {
              const opts = ["-map 0:v:0", "-map 1:a:0", "-af", `volume=${finalMusicVol}${speed !== 1 ? `,atempo=${speed}` : ""}`];
              cmd.outputOptions(opts);
            }
          }
          break;
        }
        case "voiceover_only": {
          cmd.input(voicePath as string); // input #1
          const filters: string[] = [];
          if (voiceEq) {
            filters.push(`[1:a]${voiceEq}[v0eq]`);
            filters.push(`[v0eq]volume=${finalVoiceVol}[vout]`);
            if (speed !== 1) filters.push(`[vout]atempo=${speed}[vout]`);
            cmd.complexFilter(filters.join(";"));
            cmd.outputOptions(["-map 0:v:0", "-map [vout]"]);
          } else {
            cmd.outputOptions(["-map 0:v:0", "-map 1:a:0", "-af", `volume=${finalVoiceVol}${speed !== 1 ? `,atempo=${speed}` : ""}`]);
          }
          break;
        }
        case "voiceover_plus_music": {
          cmd.input(voicePath as string); // input #1
          cmd.input(musicPath as string); // input #2
          const filters: string[] = [];
          const voiceLabel = voiceEq ? "[v0eq]" : "[1:a]";
          const musicLabel = musicEq ? "[m0eq]" : "[2:a]";
          if (voiceEq) filters.push(`[1:a]${voiceEq}${voiceLabel}`);
          if (musicEq) filters.push(`[2:a]${musicEq}${musicLabel}`);
          filters.push(`${voiceLabel}volume=${finalVoiceVol}[v0]`);
          filters.push(`${musicLabel}volume=${finalMusicVol}[v1]`);
          filters.push("[v0][v1]amix=inputs=2:duration=shortest:dropout_transition=0[aout]");
          if (speed !== 1) filters.push(`[aout]atempo=${speed}[aout]`);
          cmd.complexFilter(filters.join(";"));
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
