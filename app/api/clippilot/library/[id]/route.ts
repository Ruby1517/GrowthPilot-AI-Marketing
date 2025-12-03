export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { dbConnect } from "@/lib/db";
import ClipShort from "@/models/ClipShort";
import { s3, S3_BUCKET } from "@/lib/s3";

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await dbConnect();
    const doc = await ClipShort.findById(id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const key = doc.videoKey as string | undefined;
    await ClipShort.deleteOne({ _id: id });

    // Best-effort S3 cleanup
    if (key) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
      } catch (err) {
        console.warn("clipshort delete object failed", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("clipshort delete error", err);
    return NextResponse.json({ error: err?.message || "Delete failed" }, { status: 500 });
  }
}
