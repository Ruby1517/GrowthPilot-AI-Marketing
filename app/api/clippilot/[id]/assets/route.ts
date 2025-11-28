// // app/api/clips/[id]/assets/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { dbConnect } from "@/lib/db";
// import ClipOutput from "@/models/ClipOutput";
// import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
//   await dbConnect();
//   const outs = await ClipOutput.find({ jobId: params.id }).sort({ idx: 1 }).lean();
//   const sign = async (loc?: { bucket: string; key: string; region: string }) => {
//     if (!loc?.bucket || !loc?.key) return null;
//     const s3 = new S3Client({ region: loc.region });
//     return getSignedUrl(s3, new GetObjectCommand({ Bucket: loc.bucket, Key: loc.key }), { expiresIn: 600 });
//   };
//   const assets = await Promise.all(
//     outs.map(async (o) => ({
//       idx: o.idx,
//       title: o.title,
//       thumbText: o.thumbText,
//       srt: await sign(o.srt),
//       mp4_916: await sign(o.mp4_916),
//       mp4_11: await sign(o.mp4_11),
//     }))
//   );
//   return NextResponse.json({ assets });
// }


// app/api/clips/[id]/assets/route.ts
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import ClipJob from '@/models/ClipJob';
import ClipOutput from '@/models/ClipOutput';

// Optional presigning (only needed if your S3 URLs are private)
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 =
  process.env.AWS_REGION && process.env.S3_BUCKET
    ? new S3Client({ region: process.env.AWS_REGION })
    : null;

async function maybeSign(url: string, expiresIn: number) {
  // Expect URLs like: s3://bucket/key OR you store the key separately.
  // If you save plain HTTPS public URLs, just return url.
  // Example parser for s3://bucket/key
  if (!s3) return url;
  try {
    if (!url.startsWith('s3://')) return url; // already public
    const [, , bucketAndKey] = url.split('/');
    const [bucket, ...rest] = bucketAndKey.split('/');
    const Key = rest.join('/');
    if (!bucket || !Key) return url;

    const cmd = new GetObjectCommand({ Bucket: bucket, Key });
    return await getSignedUrl(s3, cmd, { expiresIn });
  } catch {
    return url; // fallback to raw url
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  const job = await (ClipJob as any).findById(params.id).lean();
  if (!job) return new Response('Not found', { status: 404 });

  const url = new URL(req.url);
  const wantSigned = url.searchParams.get('signed') === '1';
  const expires = Math.max(
    60,
    Math.min(3600, Number(url.searchParams.get('expires') || 300))
  );

  const outputs = await (ClipOutput as any).find({ jobId: job._id })
    .sort({ index: 1 })
    .lean();

  // If you store S3 keys in a separate field, replace `o.url` with your `o.storageKey` and sign that.
  const assets = await Promise.all(
    outputs.map(async (o: any) => {
      const assetUrl = wantSigned ? await maybeSign(o.url, expires) : o.url;
      const thumbUrl = o.thumb && wantSigned ? await maybeSign(o.thumb, expires) : o.thumb;
      return {
        index: o.index ?? 0,
        url: assetUrl,
        thumb: thumbUrl,
        bytes: o.bytes ?? null,
        durationSec: o.durationSec ?? null,
        createdAt: o.createdAt,
      };
    })
  );

  return NextResponse.json({
    id: String(job._id),
    count: assets.length,
    assets,
  });
}
