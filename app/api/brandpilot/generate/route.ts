// app/api/brandpilot/generate/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BrandDoc from "@/models/BrandDoc";
import OpenAI from "openai";
import { track } from "@/lib/track";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type BrandKitJSON = {
  palette?: string[];        // HEX strings like "#1A73E8"
  fonts?: string[];          // Google Fonts names like "Inter", "Playfair Display"
  voice?: string[];          // tone words like "friendly", "confident"
  slogans?: string[];        // short taglines
};

// quick guard helpers
function isHex(s: string) {
  return /^#?[0-9a-f]{6}$/i.test(s);
}
function normalizeHex(hex: string) {
  if (!hex) return hex;
  return hex.startsWith("#") ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
}

export async function POST(req: Request) {
  try {
    const session = await auth().catch(() => null);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const company = (body?.company || "").toString().trim();
    const vibe = (body?.vibe || "").toString().trim();

    if (!company || !vibe) {
      return NextResponse.json({ error: "company + vibe required" }, { status: 400 });
    }

    await dbConnect();

    // === Prompt for brand kit (JSON only) ===
    const system = `You are a senior brand strategist. Always return STRICT JSON with keys:
{
  "palette": ["#RRGGBB", ...5 items total],
  "fonts": ["Primary Font", "Secondary Font"],
  "voice": ["word1","word2","word3"],
  "slogans": ["short line 1","short line 2","short line 3"]
}
Do NOT include any prose, markdown, or code fences.`;

    const user = `
Company: ${company}
Vibe keywords: ${vibe}

Requirements:
- palette: exactly 5 HEX colors (high-contrast, accessible, brand-ready)
- fonts: 2–3 Google Fonts families by name (no weights in the array)
- voice: 3–6 tone descriptors
- slogans: 2–5 short options (≤ 8 words)
Return JSON ONLY.
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: BrandKitJSON;
    try {
      parsed = JSON.parse(content) as BrandKitJSON;
    } catch {
      parsed = {};
    }

    // Normalize & validate
    const palette =
      Array.isArray(parsed.palette)
        ? parsed.palette
            .map(String)
            .map(normalizeHex)
            .filter(isHex)
            .slice(0, 5)
        : [];

    const fonts =
      Array.isArray(parsed.fonts)
        ? parsed.fonts.map(String).filter(Boolean).slice(0, 3)
        : [];

    const voice =
      Array.isArray(parsed.voice)
        ? parsed.voice.map(String).filter(Boolean).slice(0, 6)
        : [];

    const slogans =
      Array.isArray(parsed.slogans)
        ? parsed.slogans.map(String).filter(Boolean).slice(0, 5)
        : [];

    // Resolve orgId for analytics
    const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean().catch(()=>null);
    const orgId = me?.orgId ? String(me.orgId) : undefined;

    const doc = await BrandDoc.create({
      userId: (session.user as any).id,
      company,
      vibe,
      palette,
      fonts,
      voice,
      images: [], // filled by /api/brandpilot/images later
      logo: "",
      pdfUrl: "",
      slogans,   // if your BrandDoc doesn’t have this field yet, add it to the schema or remove this line
    } as any);
    // Analytics: count as content produced
    if (orgId) {
      try {
        await track(orgId, (session.user as any).id, {
          module: 'brandpilot',
          type: 'generation.completed',
          meta: { company }
        });
      } catch {}
    }

    return NextResponse.json({ doc });
  } catch (err: any) {
    console.error("BrandPilot generate error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
