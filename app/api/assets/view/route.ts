// app/api/assets/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Asset from "@/models/Asset";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  const key = u.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  await dbConnect();
  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const doc = await Asset.findOne({ key, userId }).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = new S3Client({ region: (doc as any).region });
  const signed = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: (doc as any).bucket, Key: (doc as any).key }),
    { expiresIn: 600 }
  );
  return NextResponse.redirect(signed, 302);
}
