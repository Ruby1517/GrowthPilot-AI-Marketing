// app/api/adpilot/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Org from "@/models/Org";
import { limiterPerOrg } from "@/lib/ratelimit";
import { assertWithinLimit } from "@/lib/usage";
import { recordOverageRow } from "@/lib/overage";
import { track } from "@/lib/track";

const AdVariantSchema = z.object({
  platform: z.enum(["meta", "google"]).optional().default("meta"),
  angle: z.string().min(2),
  primaryText: z.string().min(10),
  headlines: z.array(z.string().min(3)).min(3).max(5),
  descriptions: z.array(z.string().min(3)).min(1).max(3),
  cta: z.string().min(2),
  audience: z.string().min(3),
  imagePrompts: z.array(z.string().min(3)).min(2).max(6),
  utm: z.object({
    source: z.string().default("meta"),
    medium: z.string().default("cpc"),
    campaign: z.string().min(2),
    content: z.string().min(2),
    term: z.string().optional().default(""),
  }),
});

const ResultSchema = z.object({
  // variants A/B/C
  variants: z.object({
    A: AdVariantSchema,
    B: AdVariantSchema,
    C: AdVariantSchema,
  }),
  testPlan: z.string().min(10),
});

function buildPrompt({ offer, url }: { offer?: string; url?: string }) {
  const input = offer ? `Offer:\n${offer}` : `Landing Page URL:\n${url}`;
  return [
    {
      role: "system" as const,
      content:
        `You are AdPilot, an expert performance marketer. ` +
        `Return STRICT JSON ONLY (no code fences, no extra text). Follow the JSON schema named "AdPilotJSON":\n\n` +
        `AdPilotJSON = {\n` +
        `  "variants": {\n` +
        `    "A": { "platform":"meta|google", "angle":string, "primaryText":string,\n` +
        `           "headlines":[string,string,string], "descriptions":[string,string], "cta":string,\n` +
        `           "audience":string, "imagePrompts":[string,string,string],\n` +
        `           "utm": { "source":string, "medium":string, "campaign":string, "content":string, "term":string }\n` +
        `    },\n` +
        `    "B": { ...same as A },\n` +
        `    "C": { ...same as A }\n` +
        `  },\n` +
        `  "testPlan": string  // 5-8 bullet points on how to test A/B/C across audiences & budgets\n` +
        `}\n` +
        `Rules:\n` +
        `- Headlines: 3 for each variant. Descriptions: 2 for each.\n` +
        `- Keep primary text < 180 words. Headlines <= 40 chars when possible.\n` +
        `- Tailor UTM (campaign/content) per angle/variant; source "meta" or "google" depending on platform.\n` +
        `- Image prompts should be descriptive for a designer or a text-to-image tool.\n` +
        `- Output JSON ONLY.`,
    },
    {
      role: "user" as const,
      content:
        `${input}\n\n` +
        `Goals:\n- Drive qualified clicks and conversions.\n- Provide distinct angles for A, B, C.\n- Include an audience hypothesis per variant.\n\n` +
        `Return AdPilotJSON now.`,
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { offer, url } = await req.json();

    if (!offer && !url) {
      return NextResponse.json({ error: "Provide an offer or URL" }, { status: 400 });
    }

    // Resolve org + rate limit
    await dbConnect();
    const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean();
    if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const orgId = String(me.orgId ?? me._id);
    const org = await Org.findById(orgId).lean();
    if (!org) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });

    const rl = await limiterPerOrg.limit(orgId);
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: 'Rate limit exceeded. Please wait a bit.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': String(rl.remaining),
            'X-RateLimit-Reset': String(rl.reset),
          },
        }
      );
    }

    // Enforce plan limits for AdPilot: count variants (A/B/C) as 3 units
    const intendedVariants = 3; // A, B, C
    const gate = await assertWithinLimit({
      orgId,
      key: 'adpilot_variants',
      incBy: intendedVariants,
      allowOverage: true,
    });
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: 'Plan limit reached', details: gate }, { status: 402 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.ADPILOT_MODEL || "gpt-4o-mini";

    const messages = buildPrompt({ offer, url });

    const r = await openai.chat.completions.create({
      model,
      temperature: 0.6,
      messages,
    });

    const raw = r.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "");

    // Parse & validate
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Model did not return valid JSON", output: raw }, { status: 502 });
    }

    const safe = ResultSchema.safeParse(parsed);
    if (!safe.success) {
      // attempt gentle coercion: ensure arrays exist and strings present
      const coerce = (v: any, fallbackCampaign = "campaign", fallbackContent = "angle") => ({
        platform: (v?.platform === "google" ? "google" : "meta"),
        angle: v?.angle || "General value proposition",
        primaryText: v?.primaryText || "Discover how we help you achieve better results with less effort.",
        headlines: Array.isArray(v?.headlines) && v.headlines.length ? v.headlines.slice(0, 3) : ["Try it today", "Boost results fast", "Simple & powerful"],
        descriptions: Array.isArray(v?.descriptions) && v.descriptions.length ? v.descriptions.slice(0, 2) : ["Start now", "Works with your workflow"],
        cta: v?.cta || "Learn More",
        audience: v?.audience || "Broad lookalike based on recent converters",
        imagePrompts: Array.isArray(v?.imagePrompts) && v.imagePrompts.length ? v.imagePrompts.slice(0, 3) : ["Clean product hero", "Benefit-focused visual", "Social proof collage"],
        utm: {
          source: v?.utm?.source || ((v?.platform === "google") ? "google" : "meta"),
          medium: v?.utm?.medium || "cpc",
          campaign: v?.utm?.campaign || fallbackCampaign,
          content: v?.utm?.content || fallbackContent,
          term: v?.utm?.term || "",
        },
      });

      const fixed = {
        variants: {
          A: coerce(parsed?.variants?.A, "adpilot_a", "angle_a"),
          B: coerce(parsed?.variants?.B, "adpilot_b", "angle_b"),
          C: coerce(parsed?.variants?.C, "adpilot_c", "angle_c"),
        },
        testPlan:
          typeof parsed?.testPlan === "string" && parsed.testPlan.trim()
            ? parsed.testPlan
            : "- Run A/B/C for 3–5 days at equal budget.\n- Pair Variant A with broad interest audience; B with remarketing; C with lookalikes.\n- Optimize on CTR in 48h; then CPA/ROAS.\n- Pause underperformers; iterate headlines for the winner.\n- Keep UTMs consistent; review performance per angle.",
      };

      const finalCheck = ResultSchema.safeParse(fixed);
      if (!finalCheck.success) {
        return NextResponse.json({ error: "Generated JSON invalid", issues: finalCheck.error.issues, output: parsed }, { status: 502 });
      }
      // Track analytics: generation + ad variants count
      try {
        await track(orgId, (session.user as any).id ?? String(me._id), {
          module: 'adpilot',
          type: 'generation.completed',
          meta: { variants: intendedVariants },
        });
        // Single event with count informs KPI increments
        await track(orgId, (session.user as any).id ?? String(me._id), {
          module: 'adpilot',
          type: 'ad.variant_created',
          meta: { count: intendedVariants },
        });
      } catch {}

      // If this run was overage, record row for invoicing
      if (gate.overage && gate.overUnits) {
        try { await recordOverageRow({ orgId, key: 'adpilot_variants', overUnits: gate.overUnits }); } catch {}
      }

      return NextResponse.json({ ok: true, result: finalCheck.data });
    }

    // Track analytics: generation + ad variants count
    try {
      await track(orgId, (session.user as any).id ?? String(me._id), {
        module: 'adpilot',
        type: 'generation.completed',
        meta: { variants: intendedVariants },
      });
      await track(orgId, (session.user as any).id ?? String(me._id), {
        module: 'adpilot',
        type: 'ad.variant_created',
        meta: { count: intendedVariants },
      });
    } catch {}

    if (gate.overage && gate.overUnits) {
      try { await recordOverageRow({ orgId, key: 'adpilot_variants', overUnits: gate.overUnits }); } catch {}
    }

    return NextResponse.json({ ok: true, result: safe.data });
  } catch (e: any) {
    console.error("[adpilot/generate] fatal", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
