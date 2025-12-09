export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { s3, S3_BUCKET, S3_REGION, guessContentType } from "@/lib/s3";

const Body = z.object({
  filename: z.string().min(1).max(200),
  size: z.number().int().positive(),
  contentType: z.string().optional(),
});

const MAX_UPLOAD_BYTES = 512 * 1024 * 1024; // 512MB — keep aligned with analyze route

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { filename, size } = parsed.data;
    const contentType = parsed.data.contentType || guessContentType(filename);
    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Upload too large. Please limit to 512MB or compress the video." },
        { status: 400 }
      );
    }

    const safeName = filename.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "video.mp4";
    const key = `clippilot/uploads/${Date.now()}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 600 }); // 10 minutes to upload
    const publicBase =
      (process.env.CDN_URL || process.env.S3_PUBLIC_BASE)?.replace(/\/$/, "") ||
      `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;
    const publicUrl = `${publicBase}/${key}`;

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      expiresIn: 600,
      requiredHeaders: { "Content-Type": contentType },
    });
  } catch (err: any) {
    console.error("clippilot/upload-url error", err);
    const msg = typeof err?.message === "string" ? err.message : "Failed to create upload URL";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
