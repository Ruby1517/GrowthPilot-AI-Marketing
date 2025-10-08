// app/api/clips/[id]/assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import ClipOutput from "@/models/ClipOutput";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  const outs = await ClipOutput.find({ jobId: params.id }).sort({ idx: 1 }).lean();
  const sign = async (loc?: { bucket: string; key: string; region: string }) => {
    if (!loc?.bucket || !loc?.key) return null;
    const s3 = new S3Client({ region: loc.region });
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: loc.bucket, Key: loc.key }), { expiresIn: 600 });
  };
  const assets = await Promise.all(
    outs.map(async (o) => ({
      idx: o.idx,
      title: o.title,
      thumbText: o.thumbText,
      srt: await sign(o.srt),
      mp4_916: await sign(o.mp4_916),
      mp4_11: await sign(o.mp4_11),
    }))
  );
  return NextResponse.json({ assets });
}
