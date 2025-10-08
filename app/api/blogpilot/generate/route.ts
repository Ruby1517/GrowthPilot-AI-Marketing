import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db"; // optional; kept for symmetry (not required by this route)
import OpenAI from "openai";
import { assertWithinLimit } from "@/lib/usage";
import { track } from '@/lib/track';

// -------- Input schema --------
const TargetLink = z.object({ anchor: z.string().min(1), url: z.string().min(1) });
const BodySchema = z.object({
  keywords: z.union([z.string().min(1), z.array(z.string().min(1))]),
  url: z.string().url().optional(),
  tone: z.string().optional().default("neutral"),
  wordCount: z.number().int().min(400).max(4000).optional().default(1500),
  targetLinks: z.array(TargetLink).optional().default([]),
});

// -------- Helpers --------
function toArray(v: string | string[]) {
  return Array.isArray(v) ? v : v.split(",").map(s => s.trim()).filter(Boolean);
}

function stripMd(md: string) {
  // very light markdown removal for readability calc
  return md
    .replace(/```[\s\S]*?```/g, " ") // code blocks
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fleschReadingEase(text: string) {
  // Simple Flesch Reading Ease implementation
  // Syllables estimation heuristic
  const words = (text.match(/\b[^\s]+\b/g) || []);
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const syllableCount = words.reduce((sum, w) => {
    const s = w
      .toLowerCase()
      .replace(/e\b/g, "")       // silent e
      .match(/[aeiouy]+/g);
    return sum + (s ? s.length : 1);
  }, 0);
  const W = Math.max(words.length, 1);
  const S = Math.max(sentences, 1);
  const L = (W / S) * 100;          // average words per 100 sentences (adaptation)
  const P = (syllableCount / W) * 100; // avg syllables per 100 words (adaptation)
  // Classic formula uses words per sentence & syllables per word directly:
  const ASL = W / S;
  const ASW = syllableCount / W;
  const score = 206.835 - 1.015 * ASL - 84.6 * ASW;
  // Approx grade
  const grade =
    score >= 90 ? "5th" :
    score >= 80 ? "6th" :
    score >= 70 ? "7th" :
    score >= 60 ? "8th-9th" :
    score >= 50 ? "10th-12th" :
    score >= 30 ? "College" : "College+";
  return { score: Math.round(score * 10) / 10, grade };
}

function buildArticleJSONLD(input: {
  headline: string;
  description: string;
  url?: string;
  keywords: string[];
  authorName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    ...(input.url ? { url: input.url } : {}),
    keywords: input.keywords.join(", "),
    author: input.authorName ? { "@type": "Person", name: input.authorName } : undefined,
  };
}

function buildFAQJSONLD(faq: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

// -------- Prompt builder --------
function blogPilotPrompt(opts: {
  keywords: string[];
  url?: string;
  tone: string;
  wordCount: number;
  targetLinks: Array<{ anchor: string; url: string }>;
}) {
  const { keywords, url, tone, wordCount, targetLinks } = opts;

  const targetLinksBlock = targetLinks.length
    ? `Internal links (use naturally, once each if possible):
${targetLinks.map(x => `- ${x.anchor} → ${x.url}`).join("\n")}`
    : `Internal links: none provided.`;

  return [
    {
      role: "system" as const,
      content: `You are BlogPilot, an SEO-savvy content generator. 
Return a STRICT JSON object that follows the "BlogPilotJSON" schema below. 
Do not include markdown fences or commentary—JSON only.`,
    },
    {
      role: "user" as const,
      content: `
Inputs:
- Keywords: ${keywords.join(", ")}
- Reference URL: ${url ?? "none"}
- Tone: ${tone}
- Target word count: ~${wordCount}
- ${targetLinksBlock}

Requirements:
1) Create a "brief" (audience, goal, POV).
2) Create a detailed "outline" (array of headings/subheadings).
3) Write a long-form "draft" (Markdown, semantic headings H2/H3, short paragraphs, bullets where helpful).
   - Naturally incorporate internal links when relevant using standard markdown links.
4) Provide "meta": { "title", "description" } suitable for SEO.
5) Provide "faq": array of { "q", "a" } (5–8 Q&As).
6) Provide "altText": array of 5–8 image alt-text suggestions.
7) Provide "citations": array of strings (empty if none).

JSON schema (BlogPilotJSON):
{
  "brief": string,
  "outline": string[],
  "draft": string,           // Markdown
  "meta": { "title": string, "description": string },
  "faq": Array<{ "q": string, "a": string }>,
  "altText": string[],
  "citations": string[]
}

Return ONLY a valid JSON object for BlogPilotJSON.
      `.trim(),
    },
  ];
}

// -------- Handler --------
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Bad Request", issues: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    // optional db connect if you want to log usage later
    try { await dbConnect(); } catch {}

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.BLOGPILOT_MODEL || "gpt-4o-mini";

    const messages = blogPilotPrompt({
      keywords: toArray(body.keywords),
      url: body.url,
      tone: body.tone!,
      wordCount: body.wordCount!,
      targetLinks: body.targetLinks!,
    });

    // Use Responses API (preferred) or fallback to Chat Completions if needed
    // -- Responses with JSON guidance:
    const resp = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      messages: messages as any,
    });

    const raw = resp.choices?.[0]?.message?.content ?? "";
    // Try to parse JSON from the output (strip accidental fences)
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
    let data: any;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      return NextResponse.json({ error: "LLM did not return valid JSON", output: raw }, { status: 502 });
    }

    // Validate the LLM result
    const ResultSchema = z.object({
      brief: z.string().min(10),
      outline: z.array(z.string().min(2)).min(3),
      draft: z.string().min(50),
      meta: z.object({ title: z.string().min(5), description: z.string().min(20) }),
      faq: z.array(z.object({ q: z.string().min(3), a: z.string().min(3) })).min(3),
      altText: z.array(z.string().min(3)).min(3),
      citations: z.array(z.string()).optional().default([]),
    });
    const safe = ResultSchema.safeParse(data);
    if (!safe.success) {
      return NextResponse.json({ error: "Generated JSON invalid", issues: safe.error.issues, output: data }, { status: 502 });
    }
    const result = safe.data;

    // Compute readability on plain text
    const plain = stripMd(result.draft);
    const readability = fleschReadingEase(plain);

    // Build JSON-LD
    const articleLD = buildArticleJSONLD({
      headline: result.meta.title,
      description: result.meta.description,
      url: body.url,
      keywords: toArray(body.keywords),
    });
    const faqLD = buildFAQJSONLD(result.faq);

    // Done
    return NextResponse.json({
      input: {
        keywords: toArray(body.keywords),
        url: body.url,
        tone: body.tone,
        wordCount: body.wordCount,
        targetLinks: body.targetLinks,
      },
      brief: result.brief,
      outline: result.outline,
      draft: result.draft,
      meta: result.meta,
      faq: result.faq,
      altText: result.altText,
      citations: result.citations || [],
      readability,            // { score, grade }
      schema: {
        article: articleLD,
        faq: faqLD,
      },
    });
  } catch (err: any) {
    console.error("[blogpilot/generate] fatal:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
