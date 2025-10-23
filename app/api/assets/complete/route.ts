// app/api/assets/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import mongoose from "mongoose";
import Asset from "@/models/Asset";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();

  const userId = new mongoose.Types.ObjectId((session.user as any).id);
  const body = await req.json().catch(() => ({} as any));

  const key: string | undefined = body?.key;
  const assetId: string | undefined = body?.assetId;
  const status: string = body?.status || 'ready'; // default to ready upon successful upload
  const { error, width, height } = body || {};

  const query = assetId ? { _id: assetId, userId } : { key, userId };
  if (!((query as any)._id || (query as any).key)) {
    return NextResponse.json({ error: 'Missing key or assetId' }, { status: 400 });
  }

  const asset = await Asset.findOneAndUpdate(
    query as any,
    {
      status,
      ...(error ? { error } : { error: undefined }),
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    },
    { new: true }
  );

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, asset });
}

