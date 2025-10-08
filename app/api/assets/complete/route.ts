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
  const { key, status, error, width, height } = await req.json(); // status: "ready"|"failed"|"processing"

  const asset = await Asset.findOneAndUpdate(
    { key, userId },
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
