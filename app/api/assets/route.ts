// app/api/assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import mongoose from "mongoose";
import Asset from "@/models/Asset";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION!;
const s3 = new S3Client({ region: REGION });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "24"), 100);
  const cursor = url.searchParams.get("cursor");
  const includePending = url.searchParams.get("includePending") === "1";
  const projectId = url.searchParams.get("projectId");

  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const q: any = { userId };
  if (projectId && mongoose.isValidObjectId(projectId)) {
    q.projectId = new mongoose.Types.ObjectId(projectId);
  }

  // by default exclude pending/processing/failed for a clean gallery
  if (!includePending) q.status = { $in: ["uploaded", "ready"] };

  const find = Asset.find(q).sort({ createdAt: -1, _id: -1 }).limit(limit + 1);
  if (cursor) find.where({ createdAt: { $lt: new Date(cursor) } });

  const [docs, counts] = await Promise.all([
    find.lean(),
    Asset.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]),
  ]);

  const byStatus = Object.fromEntries(counts.map((c: any) => [c._id, c.n]));
  const slice = docs.slice(0, limit);

  const items = await Promise.all(
    slice.map(async (a: any) => {
      // Sign only when viewable (uploaded/ready). Use per-document bucket/region.
      let signed: string | null = null;
      if (a.status === "uploaded" || a.status === "ready") {
        try {
          const client =
            a.region && a.region !== REGION ? new S3Client({ region: a.region }) : s3;
          signed = await getSignedUrl(
            client,
            new GetObjectCommand({ Bucket: a.bucket, Key: a.key }),
            { expiresIn: 600 }
          );
        } catch {}
      }
      return { ...a, url: signed }; // override any stored url with fresh signed one
    })
  );

  const nextCursor = docs.length > limit ? slice[slice.length - 1]?.createdAt : null;

  return NextResponse.json({
    items,
    nextCursor,
    counts: {
      ready: byStatus.ready || 0,
      pending: byStatus.pending || 0,
      uploaded: byStatus.uploaded || 0,
      processing: byStatus.processing || 0,
      failed: byStatus.failed || 0,
    },
  });
}

export async function POST(req: NextRequest) {
  // Optional pre-create pending row before the direct PUT
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();

  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const { key, bucket, region, contentType, size, type, projectId } = await req.json();

  const doc = await Asset.create({
    userId,
    projectId: projectId ? new mongoose.Types.ObjectId(projectId) : undefined,
    key,
    bucket,
    region,
    contentType,
    size,
    type,
    status: "pending",
  });

  return NextResponse.json(doc, { status: 201 });
}
