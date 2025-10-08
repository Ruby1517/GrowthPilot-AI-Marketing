import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BlogDoc from "@/models/BlogDoc";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const doc = await BlogDoc.findOne({ _id: params.id, userId: (session.user as any).id }).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remap schemaLD → schema to keep client response stable
  const { schemaLD, ...rest } = doc as any;
  return NextResponse.json({ ...rest, schema: schemaLD });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const res = await BlogDoc.deleteOne({ _id: params.id, userId: (session.user as any).id });
  if (!res.deletedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}