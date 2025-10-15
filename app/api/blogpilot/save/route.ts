import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BlogDoc from "@/models/BlogDoc";
import mongoose from "mongoose";

// ---- Validation (schema optional)
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
  schema: z.object({ article: z.any().optional(), faq: z.any().optional() })
    .partial()
    .optional()
    .default({}),
  titleOverride: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).passthrough();

// ---------- POST: save ----------
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = SaveSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Bad Request", issues: parsed.error.issues }, { status: 400 });
    }
    const b = parsed.data;

    await dbConnect();

    // Resolve user same as generate route
    const Users = (await import('mongoose')).default.connection.collection('users');
    const me = await Users.findOne({ email: session.user.email });
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = new mongoose.Types.ObjectId(String(me._id));
    const orgId = String(me.orgId ?? me._id); // keep if your model has orgId

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
      schemaLD: b.schema ?? {},
      // optional
      titleOverride: b.titleOverride,
      tags: b.tags ?? [],
    });

    return NextResponse.json({ id: String(doc._id) }, { status: 201 });
  } catch (err: any) {
    console.error("[blogpilot/save] fatal:", err?.message, err?.stack);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ---------- GET: list recent drafts ----------
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    await dbConnect();

    // Resolve same user as POST
    const Users = (await import('mongoose')).default.connection.collection('users');
    const me = await Users.findOne({ email: session.user.email });
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = new mongoose.Types.ObjectId(String(me._id));

    // If you prefer ORG-wide drafts, swap to: { orgId: String(me.orgId ?? me._id) }
    const filter = { userId };

    const docs = await BlogDoc.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .select("createdAt meta readability keywords url tone wordCount")
      .lean();

    const items = (docs as any[]).map((d) => ({
      _id: String(d._id),
      createdAt: d.createdAt ?? new Date(), // tolerate missing timestamps
      meta: { title: d.meta?.title ?? '(untitled)', description: d.meta?.description ?? '' },
      readability: { score: d.readability?.score ?? null },
      input: {
        keywords: d.keywords || [],
        url: d.url,
        tone: d.tone ?? 'neutral',
        wordCount: d.wordCount ?? undefined,
      },
    }));

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("[blogpilot/save:list] fatal:", err?.message, err?.stack);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
