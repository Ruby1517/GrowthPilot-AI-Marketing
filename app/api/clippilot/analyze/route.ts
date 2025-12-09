export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import formidable, { type Fields, type Files } from "formidable";
import { extractAudio } from "@/lib/clippilot/ffmpeg";
import { transcribeAudio, suggestClipsFromTranscript } from "@/lib/clippilot/ai";
import type { AnalyzeResponse, ClipSuggestion } from "@/lib/clippilot/types";
import { guessContentType, putBuffer, presignGet } from "@/lib/s3";

// Note: Next.js App Router does not expose the raw Node request by default in edge/runtime handlers.
// This route assumes the default Node.js runtime. If you switch to edge, adjust to stream parsing.
const MAX_UPLOAD_BYTES = 512 * 1024 * 1024; // keep consistent with presign

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const isMultipart = contentType.toLowerCase().includes('multipart/form-data');
    const isJson = contentType.toLowerCase().includes('application/json');

    let videoPath: string | null = null;
    let videoKey: string | undefined;
    let videoUrl: string | undefined;

    if (isMultipart) {
      const form = formidable({
        multiples: false,
        keepExtensions: true,
        maxFileSize: MAX_UPLOAD_BYTES,
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

      const vid = (files as any)?.video;
      if (!vid) {
        return NextResponse.json({ error: 'No video uploaded' }, { status: 400 });
      }

      const tmpPath = Array.isArray(vid) ? vid[0]?.filepath || vid[0]?.path : vid.filepath || vid.path;
      if (!tmpPath) return NextResponse.json({ error: 'Failed to read uploaded file' }, { status: 400 });

      // Copy to deterministic tmp filename
      videoPath = path.join('/tmp', `clippilot-upload-${Date.now()}${path.extname(tmpPath) || '.mp4'}`);
      await fs.promises.copyFile(tmpPath, videoPath);

      // Upload to S3 (private) for persistence
      const filename = path.basename(videoPath);
      const key = `clippilot/uploads/${Date.now()}-${filename}`;
      const buffer = await fs.promises.readFile(videoPath);
      await putBuffer(key, buffer, guessContentType(filename));
      videoKey = key;
      videoUrl = await presignGet(key, 60 * 60 * 6); // 6h
    } else if (isJson) {
      const body = await req.json().catch(() => null);
      const { videoKey: incomingKey, videoUrl: incomingUrl } = body || {};
      if (!incomingKey && !incomingUrl) {
        return NextResponse.json({ error: 'Missing videoKey or videoUrl' }, { status: 400 });
      }

      videoKey = incomingKey;
      // Prefer a fresh presigned URL when a key is present (covers private buckets)
      let downloadUrl: string | null = null;
      if (incomingKey) {
        try {
          downloadUrl = await presignGet(incomingKey, 60 * 60);
        } catch (e) {
          console.warn("presignGet failed for videoKey", e);
        }
      }
      if (!downloadUrl && incomingUrl) {
        downloadUrl = incomingUrl;
      }
      if (!downloadUrl) {
        return NextResponse.json({ error: 'Unable to resolve download URL for video' }, { status: 400 });
      }
      const ext = path.extname(incomingKey || incomingUrl || '') || '.mp4';
      const tmpPath = path.join('/tmp', `clippilot-upload-${Date.now()}${ext}`);

      const resp = await fetch(downloadUrl);
      if (!resp.ok) {
        const statusMsg = `${resp.status} ${resp.statusText}`;
        return NextResponse.json({ error: `Failed to download uploaded video (${statusMsg})` }, { status: 400 });
      }
      const arrayBuffer = await resp.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      if (buf.byteLength > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: 'Uploaded file exceeds server limit (512MB)' }, { status: 400 });
      }
      await fs.promises.writeFile(tmpPath, buf);
      videoPath = tmpPath;
      videoUrl = downloadUrl;
    } else {
      return NextResponse.json({ error: 'Expected multipart/form-data or JSON { videoKey, videoUrl }' }, { status: 400 });
    }

    if (!videoPath) {
      return NextResponse.json({ error: 'No video found to analyze' }, { status: 400 });
    }

    const audioPath = await extractAudio(videoPath);
    const transcript = audioPath ? await transcribeAudio(audioPath) : "";
    const suggestions: ClipSuggestion[] = transcript ? await suggestClipsFromTranscript(transcript) : [];

    const resp: AnalyzeResponse = { transcript, suggestions, videoPath, videoKey, videoUrl } as any;
    return NextResponse.json(resp);
  } catch (err: any) {
    console.error('clippilot/analyze error', err);
    const msg =
      typeof err?.message === 'string'
        ? err.message
        : 'Analyze failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
