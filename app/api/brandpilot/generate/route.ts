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
  summary?: string;
  voiceGuidelines?: string[];
  messagingPillars?: string[];
  sampleCaptions?: string[];
  sampleEmailIntro?: string;
  adCopy?: { short?: string; long?: string };
  videoStyle?: string[];
};

// quick guard helpers
function isHex(s: string) {
  return /^#?[0-9a-f]{6}$/i.test(s);
}
function normalizeHex(hex: string) {
  if (!hex) return hex;
  return hex.startsWith("#") ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
}

function sanitizeString(value: unknown, max = 2000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function sanitizeList(value: unknown, maxItems = 12, maxLength = 400) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .map((v) => v.slice(0, maxLength))
    .slice(0, maxItems);
}

export async function POST(req: Request) {
  try {
    const session = await auth().catch(() => null);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const company = sanitizeString(body?.company);
    const vibe = sanitizeString(body?.vibe);
    const tagline = sanitizeString(body?.tagline);
    const industry = sanitizeString(body?.industry);
    const mission = sanitizeString(body?.mission, 800);
    const valuesList = sanitizeList(body?.values, 8);
    const toneSelections = sanitizeList(body?.toneSelections, 8);
    const voiceDescription = sanitizeString(body?.voiceDescription, 800);
    const wordsToUse = sanitizeList(body?.wordsToUse, 12);
    const wordsToAvoid = sanitizeList(body?.wordsToAvoid, 12);
    const primaryAudience = sanitizeString(body?.primaryAudience, 800);
    const secondaryAudience = sanitizeString(body?.secondaryAudience, 800);
    const painPoints = sanitizeList(body?.painPoints, 8, 400);
    const goals = sanitizeList(body?.goals, 8, 400);
    const colorHints = sanitizeList(body?.colorHints, 8);
    const typographyHeading = sanitizeString(body?.typographyHeading, 200);
    const typographyBody = sanitizeString(body?.typographyBody, 200);
    const visualStyle = sanitizeList(body?.visualStyle, 8, 400);
    const assetNotes = sanitizeString(body?.assetNotes, 800);
    const socialThemes = sanitizeList(body?.socialThemes, 8, 200);

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
  "slogans": ["short line 1","short line 2","short line 3"],
  "summary": "2-3 sentence overview",
  "voiceGuidelines": ["bullet", "bullet"],
  "messagingPillars": ["pillar name — short description", "..."],
  "sampleCaptions": ["caption 1", "caption 2"],
  "sampleEmailIntro": "short paragraph",
  "adCopy": { "short": "1 sentence", "long": "3-4 sentences" },
  "videoStyle": ["direction 1","direction 2"]
}
Do NOT include any prose, markdown, or code fences.`;

    const brief = [
      `Company: ${company}`,
      tagline ? `Tagline: ${tagline}` : null,
      industry ? `Industry: ${industry}` : null,
      `Vibe keywords: ${vibe}`,
      mission ? `Mission: ${mission}` : null,
      valuesList.length ? `Values: ${valuesList.join(', ')}` : null,
      toneSelections.length ? `Tone traits: ${toneSelections.join(', ')}` : null,
      voiceDescription ? `Voice description: ${voiceDescription}` : null,
      wordsToUse.length ? `Words to USE: ${wordsToUse.join(', ')}` : null,
      wordsToAvoid.length ? `Words to AVOID: ${wordsToAvoid.join(', ')}` : null,
      primaryAudience ? `Primary audience: ${primaryAudience}` : null,
      secondaryAudience ? `Secondary audience: ${secondaryAudience}` : null,
      painPoints.length ? `Pain points: ${painPoints.join('; ')}` : null,
      goals.length ? `Goals: ${goals.join('; ')}` : null,
      colorHints.length ? `Color hints: ${colorHints.join(', ')}` : null,
      typographyHeading ? `Heading typography preference: ${typographyHeading}` : null,
      typographyBody ? `Body typography preference: ${typographyBody}` : null,
      visualStyle.length ? `Visual inspiration: ${visualStyle.join(', ')}` : null,
      assetNotes ? `Logo/asset notes: ${assetNotes}` : null,
      socialThemes.length ? `Social themes to feature: ${socialThemes.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    const user = `
${brief}

Requirements:
- palette: exactly 5 HEX colors (high-contrast, accessible, brand-ready)
- fonts: 2–3 Google Fonts families by name (no weights in the array)
- voice: 3–6 tone descriptors
- slogans: 2–5 short options (≤ 8 words)
- voiceGuidelines: 3–5 bullets describing tone do's/don'ts
- messagingPillars: 3–4 items (each "Title — description")
- sampleCaptions: 3–4 social-ready lines (≤ 12 words)
- sampleEmailIntro: 3–4 sentences max
- adCopy.short = 1 compelling sentence. adCopy.long = 3–5 sentences.
- videoStyle: 3–4 cinematic pointers (lighting, framing, vibe)
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

    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 800) : '';
    const voiceGuidelines =
      Array.isArray(parsed.voiceGuidelines)
        ? parsed.voiceGuidelines.map(String).filter(Boolean).slice(0, 6)
        : [];
    const messagingPillars =
      Array.isArray(parsed.messagingPillars)
        ? parsed.messagingPillars.map(String).filter(Boolean).slice(0, 5)
        : [];
    const sampleCaptions =
      Array.isArray(parsed.sampleCaptions)
        ? parsed.sampleCaptions.map(String).filter(Boolean).slice(0, 5)
        : [];
    const sampleEmailIntro =
      typeof parsed.sampleEmailIntro === 'string'
        ? parsed.sampleEmailIntro.trim().slice(0, 800)
        : '';
    const adCopyShort = typeof parsed.adCopy?.short === 'string' ? parsed.adCopy.short.trim().slice(0, 240) : '';
    const adCopyLong = typeof parsed.adCopy?.long === 'string' ? parsed.adCopy.long.trim().slice(0, 1000) : '';
    const videoStyle =
      Array.isArray(parsed.videoStyle)
        ? parsed.videoStyle.map(String).filter(Boolean).slice(0, 5)
        : [];

    // Resolve orgId for analytics
    const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean().catch(()=>null);
    const orgObjectId = (me as any)?.orgId || null;
    const orgId = orgObjectId ? String(orgObjectId) : undefined;

    const doc = await BrandDoc.create({
      userId: (session.user as any).id,
      orgId: orgObjectId,
      company,
      vibe,
      palette,
      fonts,
      voice,
      tagline,
      industry,
      mission,
      values: valuesList,
      toneSelections,
      voiceDescription,
      wordsToUse,
      wordsToAvoid,
      primaryAudience,
      secondaryAudience,
      painPoints,
      goals,
      colorHints,
      typographyHeading,
      typographyBody,
      visualStyle,
      assetNotes,
      socialThemes,
      summary,
      voiceGuidelines,
      messagingPillars,
      sampleCaptions,
      sampleEmailIntro,
      adCopyShort,
      adCopyLong,
      videoStyle,
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
