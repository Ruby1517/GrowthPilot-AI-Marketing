export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { generateClipPlan } from "../../../../lib/clippilot/ai";
import { renderClip, AudioMode } from "../../../../lib/clippilot/render";
import { generateVoiceScript, synthesizeVoice, type VoicePersona, type VoiceStyle, pickStyleFromCategory, getStyleSettings } from "@/lib/clippilot/voice";
import { putBuffer, presignGet, guessContentType } from "@/lib/s3";
import { dbConnect } from "@/lib/db";
import ClipShort from "@/models/ClipShort";

type RequestBody = {
  videoPath: string;
  transcript: string;
  musicPath?: string | null;
  audioMode?: AudioMode;
  voiceScript?: string | null;
  useAutoVoiceScript?: boolean;
  voicePersona?: VoicePersona;
  voiceStyle?: VoiceStyle;
  voiceId?: string | null;
  category?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const { videoPath, transcript } = body;
    if (!videoPath || !transcript) {
      return NextResponse.json({ error: "Missing videoPath or transcript" }, { status: 400 });
    }

    const plan = await generateClipPlan(transcript);

    // ---- Determine voice-over script
    const requestedMode = body.audioMode as AudioMode | undefined;
    let finalVoiceScript: string | null = null;
    const wantsVoice =
      requestedMode === "voiceover_only" || requestedMode === "voiceover_plus_music";
    const voicePersona: VoicePersona = body.voicePersona || "female";
    const voiceStyle: VoiceStyle = body.voiceStyle || pickStyleFromCategory(body.category) || "friendly";
    const voiceId = body.voiceId || undefined;
    const tone = getStyleSettings(voiceStyle);

    if (wantsVoice) {
      if (body.voiceScript && body.voiceScript.trim().length > 0) {
        finalVoiceScript = body.voiceScript.trim();
      } else if (body.useAutoVoiceScript) {
        finalVoiceScript = await generateVoiceScript(plan.summary, transcript, { persona: voicePersona, style: voiceStyle, category: body.category || undefined });
      }
    }

    // ---- Synthesize voice if we have a script
    let voicePath: string | null = null;
    if (finalVoiceScript && finalVoiceScript.trim().length > 0) {
      voicePath = await synthesizeVoice(finalVoiceScript, { persona: voicePersona, style: voiceStyle, voiceId, category: body.category || undefined });
    }

    // ---- Resolve music and audio mode fallbacks
    const musicPath = body.musicPath || null;
    const musicExists = musicPath && fs.existsSync(musicPath);
    let resolvedAudioMode: AudioMode = requestedMode || "original_only";

    if ((resolvedAudioMode === "voiceover_only" || resolvedAudioMode === "voiceover_plus_music") && !voicePath) {
      // no voice => fallback
      resolvedAudioMode = musicExists ? "original_plus_music" : "original_only";
    }
    if ((resolvedAudioMode === "voiceover_plus_music") && !musicExists) {
      resolvedAudioMode = voicePath ? "voiceover_only" : "original_only";
    }
    if ((resolvedAudioMode === "original_plus_music") && !musicExists) {
      resolvedAudioMode = "original_only";
    }

    // ---- Render
    const localClipPath = await renderClip({
      videoPath,
      startSeconds: plan.startSeconds,
      endSeconds: plan.endSeconds,
      hookText: plan.hook,
      promoLabel: plan.promoLabel,
      ctaText: plan.ctaText,
      brandTag: plan.brandTag,
      audioMode: resolvedAudioMode,
      musicPath: musicExists ? musicPath : null,
      voicePath,
      voiceGainDb: tone.voiceGainDb,
      musicGainDb: tone.musicGainDb,
      voiceEq: tone.eqVoice,
      musicEq: tone.eqMusic,
    });

    // ---- Upload to S3 (private) and presign
    const filename = path.basename(localClipPath || "clip.mp4");
    const buffer = await fs.promises.readFile(localClipPath);
    const key = `clippilot/shorts/${Date.now()}-${filename}`;
    await putBuffer(key, buffer, guessContentType(filename));
    const url = await presignGet(key, 60 * 60 * 6); // 6h

    // Persist metadata (anonymous if no user context)
    try {
      await dbConnect();
      await ClipShort.create({
        userId: undefined, // TODO: wire auth userId when available
        videoKey: key,
        videoUrl: url,
        plan,
        voiceScript: finalVoiceScript || undefined,
        sourceVideoPath: videoPath,
        audioMode: resolvedAudioMode,
        voicePersona,
        voiceStyle,
        voiceId: voiceId || undefined,
        category: body.category || undefined,
      });
    } catch (e) {
      console.warn("clipshort save failed", e);
    }

    // cleanup local file
    try {
      await fs.promises.unlink(localClipPath);
    } catch {}

    return NextResponse.json({
      url,
      key,
      plan,
      voiceScript: finalVoiceScript || undefined,
      voicePersona,
      voiceStyle,
      voiceId: voiceId || undefined,
      category: body.category || undefined,
    });
  } catch (err: any) {
    console.error("clippilot/auto error", err);
    return NextResponse.json({ error: err?.message || "Auto render failed" }, { status: 500 });
  }
}
