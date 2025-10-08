export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BrandDoc from "@/models/BrandDoc";
import Asset from "@/models/Asset";
import OpenAI from "openai";
import { putBuffer, presignGet, publicUrlOrSigned, S3_BUCKET, S3_REGION } from "@/lib/s3";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function toPngBuffer(item: any): Promise<Buffer> {
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item?.url) {
    const r = await fetch(item.url);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error("No image data from OpenAI");
}

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { id } = body
    
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await dbConnect();
    const doc = await BrandDoc.findById(id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const presets = [
      { type: "cover" as const, size: "1536x1024" },
      { type: "post" as const, size: "1024x1024" },
      { type: "story" as const, size: "1024x1536" },
    ];

    const out: Array<{
      type: "cover" | "post" | "story";
      key: string;
      bucket: string;
      region: string;
      url: string;
    }> = [];

    for (const p of presets) {
      const prompt = [
        `Create a brand-forward ${p.type} social image for "${doc.company}".`,
        `Vibe: ${doc.vibe}.`,
        doc.palette?.length ? `Palette hints: ${doc.palette.join(", ")}.` : "",
        doc.voice?.length ? `Tone: ${doc.voice.join(", ")}.` : "",
        `Abstract, clean, safe (no trademarks).`
      ]
        .filter(Boolean)
        .join(" ");

      const res = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        size: p.size, // valid sizes only
      });

      const item = res.data?.[0];
      if (!item) throw new Error("No image generated from OpenAI");

      const png = await toPngBuffer(item);
      const key = `assets/user_${session.user.id}/brand/${doc._id}/${p.type}.png`;

      // Upload to S3
      await putBuffer(key, png, "image/png");

      // Track in DB
      await Asset.create({
        userId: (session.user as any).id,
        key,
        bucket: S3_BUCKET,
        region: S3_REGION,
        contentType: "image/png",
        size: png.length,
        status: "ready",
        type: "image",
      });

      // Generate signed or public URL
      const signed = await presignGet(key, 3600);
      out.push({
        type: p.type,
        key,
        bucket: S3_BUCKET!,
        region: S3_REGION!,
        url: publicUrlOrSigned(key, signed),
      });
    }

    doc.images = out;
    await doc.save();
    return NextResponse.json({ doc });

  } catch (err: any) {
    console.error("Error in /brandpilot/images:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
