// app/api/assets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import mongoose from "mongoose";
import Asset from "@/models/Asset";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  const doc = await Asset.findById(params.id).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();

  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const doc = await Asset.findOneAndDelete({ _id: params.id, userId });
  if (doc) {
    try {
      const s3 = new S3Client({ region: doc.region });
      await s3.send(new DeleteObjectCommand({ Bucket: doc.bucket, Key: doc.key }));
    } catch {
      /* ignore S3 errors for now */
    }
  }
  return NextResponse.json({ ok: !!doc });
}
