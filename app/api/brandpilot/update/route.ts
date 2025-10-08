export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BrandDoc from "@/models/BrandDoc";

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id, primary, secondary, fontPrimary, fontSecondary, voiceSelected } = body || {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await dbConnect();
  const doc = await BrandDoc.findById(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String(doc.userId) !== String((session.user as any).id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Simple guards (optional)
  const updates: any = {};
  if (primary && /^#[0-9a-f]{6}$/i.test(primary)) updates.primary = primary;
  if (secondary && /^#[0-9a-f]{6}$/i.test(secondary)) updates.secondary = secondary;
  if (typeof fontPrimary === "string") updates.fontPrimary = fontPrimary;
  if (typeof fontSecondary === "string") updates.fontSecondary = fontSecondary;
  if (Array.isArray(voiceSelected)) updates.voiceSelected = voiceSelected.slice(0, 8).map(String);

  await BrandDoc.updateOne({ _id: id }, { $set: updates });

  const fresh = await BrandDoc.findById(id);
  return NextResponse.json({ doc: fresh });
}
