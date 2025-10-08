// app/api/brandpilot/export/route.ts
import { NextResponse } from "next/server";
import archiver from "archiver";
import { dbConnect } from "@/lib/db";
import BrandDoc from "@/models/BrandDoc";
import { s3, S3_BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await dbConnect();
  const doc = await BrandDoc.findById(id);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Create a stream with archiver
  const archive = archiver("zip", { zlib: { level: 9 } });

  // Append palette/fonts/voice as JSON
  archive.append(JSON.stringify({
    palette: doc.palette,
    fonts: doc.fonts,
    voice: doc.voice,
    slogans: doc.slogans || [],
  }, null, 2), { name: "brandkit.json" });

  // Append images from S3
  for (const img of doc.images || []) {
    if (!img.key) continue;
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: img.key });
    const res = await s3.send(cmd);
    if (res.Body) {
      archive.append(res.Body as any, { name: `${img.type}.png` });
    }
  }

  archive.finalize();

  return new Response(archive as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${doc.company}-brandkit.zip"`,
    },
  });
}
