// app/api/assets/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Asset from "@/models/Asset";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const key = u.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  await dbConnect();
  const doc = await Asset.findOne({ key }).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = new S3Client({ region: doc.region });
  const signed = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: doc.bucket, Key: doc.key }),
    { expiresIn: 600 }
  );
  return NextResponse.redirect(signed, 302);
}
