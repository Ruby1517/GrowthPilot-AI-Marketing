import { NextRequest, NextResponse } from "next/server";
import { renderClip, AudioMode } from "@/lib/clippilot/render";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      videoPath,
      startSeconds,
      endSeconds,
      overlayText,   // still accepted from client
      addMusic,      // still accepted from client
      musicPath,
    } = body;

    if (!videoPath) {
      return NextResponse.json(
        { error: "Missing videoPath" },
        { status: 400 }
      );
    }

    const start = Number(startSeconds) || 0;
    const end = Number(endSeconds) || 0;

    // Decide audio mode based on addMusic + musicPath
    let audioMode: AudioMode = "original_only";
    let resolvedMusicPath: string | null = null;

    if (addMusic && typeof musicPath === "string" && musicPath.length > 0) {
      audioMode = "original_plus_music";
      resolvedMusicPath = musicPath;
    }

    const clipPath = await renderClip({
      videoPath,
      startSeconds: start,
      endSeconds: end,
      hookText: overlayText,       // map old overlayText => hookText
      audioMode,
      musicPath: resolvedMusicPath,
      voicePath: null,
    });

    return NextResponse.json({ clipPath });
  } catch (err: any) {
    console.error("clippilot/render error", err);
    return NextResponse.json(
      { error: err?.message || "Render failed" },
      { status: 500 }
    );
  }
}
