export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import formidable from "formidable";
import type { Fields, Files } from "formidable";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return NextResponse.json({ error: 'Expected multipart/form-data with field "music" or "file"' }, { status: 400 });
    }

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 200 * 1024 * 1024, // 200MB
    });

    const nodeReq = Readable.fromWeb(req.body as any);
    (nodeReq as any).headers = Object.fromEntries(req.headers);
    (nodeReq as any).method = req.method;
    (nodeReq as any).url = req.url;

    const { files } = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
      form.parse(nodeReq as any, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const musicFile = (files as any)?.music || (files as any)?.file;
    if (!musicFile) {
      return NextResponse.json({ error: "No music file uploaded" }, { status: 400 });
    }

    const tmpPath = Array.isArray(musicFile) ? musicFile[0]?.filepath || musicFile[0]?.path : musicFile.filepath || musicFile.path;
    if (!tmpPath) return NextResponse.json({ error: "Failed to read uploaded file" }, { status: 400 });

    const ext = path.extname(tmpPath) || ".mp3";
    const musicPath = path.join("/tmp", `clippilot-music-${Date.now()}${ext}`);
    await fs.promises.copyFile(tmpPath, musicPath);

    return NextResponse.json({ musicPath });
  } catch (err: any) {
    console.error("clippilot/upload-music error", err);
    const msg = typeof err?.message === "string" ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
