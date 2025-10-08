// app/api/blogpilot/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BlogDoc from "@/models/BlogDoc";
import mongoose from "mongoose";

// ---- Validation for POST body (client sends `schema`, we will store as `schemaLD`)
const SaveSchema = z.object({
  input: z.object({
    keywords: z.array(z.string()).default([]),
    url: z.string().optional(),
    tone: z.string().optional(),
    wordCount: z.number().optional(),
    targetLinks: z.array(z.object({ anchor: z.string(), url: z.string() })).default([]),
  }),
  brief: z.string(),
  outline: z.array(z.string()),
  draft: z.string(),
  meta: z.object({ title: z.string(), description: z.string() }),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  altText: z.array(z.string()),
  citations: z.array(z.string()).default([]),
  readability: z.object({ score: z.number(), grade: z.string() }),
  schema: z.object({ article: z.any(), faq: z.any() }), // <- client field
  titleOverride: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ---------- POST: save a generated draft ----------
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => ({}));
  const parsed = SaveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad Request", issues: parsed.error.issues }, { status: 400 });
  }
  const b = parsed.data;

  await dbConnect();

  // Always store userId as ObjectId
  const userId = new mongoose.Types.ObjectId((session.user as any).id);

  const doc = await BlogDoc.create({
    userId,
    // inputs
    keywords: b.input.keywords,
    url: b.input.url,
    tone: b.input.tone,
    wordCount: b.input.wordCount,
    targetLinks: b.input.targetLinks,
    // generated
    brief: b.brief,
    outline: b.outline,
    draft: b.draft,
    meta: b.meta,
    faq: b.faq,
    altText: b.altText,
    citations: b.citations,
    readability: b.readability,
    schemaLD: b.schema, // <-- store under schemaLD (model field)
    // optional
    titleOverride: b.titleOverride,
    tags: b.tags ?? [],
  });

  return NextResponse.json({ id: String(doc._id) }, { status: 201 });
}

// ---------- GET: list recent drafts for current user ----------
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  await dbConnect();

  const userId = new mongoose.Types.ObjectId((session.user as any).id);

  const docs = await BlogDoc.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("createdAt meta readability keywords url tone wordCount")
    .lean();

  // Shape to what the /blogpilot history grid expects
  const items = (docs as any[]).map((d) => ({
    _id: String(d._id),
    createdAt: d.createdAt,
    meta: { title: d.meta?.title, description: d.meta?.description },
    readability: { score: d.readability?.score },
    input: {
      keywords: d.keywords || [],
      url: d.url,
      tone: d.tone,
      wordCount: d.wordCount,
    },
  }));

  return NextResponse.json({ items });
}
