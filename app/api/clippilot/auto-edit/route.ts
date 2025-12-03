export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { generateClipPlan } from "../../../../lib/clippilot/ai";
import { renderClip, AudioMode } from "../../../../lib/clippilot/render";
import { putBuffer, presignGet, guessContentType } from "../../../../lib/s3";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const videoPath = body?.videoPath as string | undefined;
    const transcript = body?.transcript as string | undefined;
    const musicPath = (body?.musicPath as string | null | undefined) ?? null;
    const audioModeBody = body?.audioMode as AudioMode | undefined;

    if (!videoPath || !transcript) {
      return NextResponse.json(
        { error: "Missing videoPath or transcript" },
        { status: 400 }
      );
    }

    // 1) Get clip plan from AI (with ad fields)
    const plan = await generateClipPlan(transcript);
    // Fallbacks in case your generateClipPlan hasn't been fully updated yet
    const hook =
      (plan as any).hook ??
      (plan as any).overlayText ??
      "Check this out"; // safe fallback

    const promoLabel =
      (plan as any).promoLabel ?? "LIMITED-TIME OFFER";
    const ctaText =
      (plan as any).ctaText ?? "Tap to learn more";
    const brandTag =
      (plan as any).brandTag ?? "@GrowthPilotAI";

    // 2) Decide audio mode:
    // - If there is a musicPath, default to original_plus_music unless overridden
    // - If no musicPath -> original_only
    const audioMode: AudioMode =
      musicPath && musicPath.length > 0
      ? audioModeBody ?? "original_plus_music"
      : "original_only";


    // 3) Render the short locally with overlays + optional music
    const localClipPath = await renderClip({
      videoPath,
      startSeconds: plan.startSeconds,
      endSeconds: plan.endSeconds,
      hookText: hook,
      promoLabel,
      ctaText,
      brandTag,
      audioMode,
      musicPath,
    });

    // 4) Upload to S3
    const filename = path.basename(localClipPath || "clip.mp4");
    const key = `clippilot/shorts/${Date.now()}-${filename}`;
    const buffer = await fs.promises.readFile(localClipPath);

    await putBuffer(key, buffer, guessContentType(filename));

    // 5) Optionally clean up /tmp
    fs.promises.unlink(localClipPath).catch(() => {
      // non-fatal if unlink fails
    });

    // 6) Generate signed URL (6 hours)
    const downloadUrl = await presignGet(key, 60 * 60 * 6);

    return NextResponse.json({
      url: downloadUrl,
      key,
      plan: {
        ...plan,
        hook,
        promoLabel,
        ctaText,
        brandTag,
      },
    });
  } catch (err: any) {
    console.error("clippilot/auto-edit error", err);
    return NextResponse.json(
      { error: err?.message || "Auto edit failed" },
      { status: 500 }
    );
  }
}
