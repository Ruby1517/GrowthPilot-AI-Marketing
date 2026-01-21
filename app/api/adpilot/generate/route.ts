// app/api/adpilot/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Org from "@/models/Org";
import { safeLimitPerOrg } from "@/lib/ratelimit";
import { assertWithinLimit } from "@/lib/usage";
import { recordOverageRow } from "@/lib/overage";
import { track } from "@/lib/track";

const PlatformVariantSchema = z.object({
  platform: z.enum(["meta", "google", "tiktok", "youtube"]),
  variant: z.enum(["A", "B", "C"]).optional().default("A"),
  angle: z.string().min(2),
  hook: z.string().min(5),
  primaryText: z.string().min(10),
  headlines: z.array(z.string().min(3)).min(2).max(4),
  descriptions: z.array(z.string().min(3)).min(1).max(3),
  cta: z.string().min(2),
  audience: z.string().min(3),
  creativeIdeas: z.array(z.string().min(3)).min(2).max(6),
  videoScript: z.string().optional(),
  utm: z.object({
    source: z.string(),
    medium: z.string().default("cpc"),
    campaign: z.string().min(2),
    content: z.string().min(2),
    term: z.string().optional().default(""),
  }),
});

const ResultSchema = z.object({
  platforms: z.object({
    meta: z.array(PlatformVariantSchema).min(2).max(3),
    google: z.array(PlatformVariantSchema).min(2).max(3),
    tiktok: z.array(PlatformVariantSchema).min(2).max(3),
    youtube: z.array(PlatformVariantSchema).min(2).max(3),
  }),
  retargeting: z.object({
    summary: z.string().min(10),
    ads: z.array(z.object({
      headline: z.string(),
      body: z.string(),
      cta: z.string(),
      audience: z.string(),
      schedule: z.string(),
    })).min(2).max(5),
  }),
  lookalikeIdeas: z.array(z.string().min(3)).min(2).max(6),
  creativeConcepts: z.array(z.object({
    platform: z.enum(["meta","google","tiktok","youtube","general"]).default("general"),
    concepts: z.array(z.string().min(5)).min(2).max(5),
    videoScript: z.string().optional(),
  })).min(2).max(6),
  testPlan: z.string().min(10),
});

function buildPrompt({ offer, url }: { offer?: string; url?: string }) {
  const input = offer ? `Offer:\n${offer}` : `Landing Page URL:\n${url}`;
  return [
    {
      role: "system" as const,
      content:
        `You are AdPilot, an expert media buyer. Return STRICT JSON ONLY (no code fences). Follow schema "AdPilotJSON":\n\n` +
        `AdPilotJSON = {\n` +
        `  "platforms": {\n` +
        `    "meta": [Variant, Variant],\n` +
        `    "google": [Variant, Variant],\n` +
        `    "tiktok": [Variant, Variant],\n` +
        `    "youtube": [Variant, Variant]\n` +
        `  },\n` +
        `  "retargeting": {\n` +
        `     "summary": string,\n` +
        `     "ads": [{ "headline":string, "body":string, "cta":string, "audience":string, "schedule":string }]\n` +
        `  },\n` +
        `  "lookalikeIdeas": [string,string,...],\n` +
        `  "creativeConcepts": [ { "platform":"meta|google|tiktok|youtube|general", "concepts":[string,...], "videoScript":string } ],\n` +
        `  "testPlan": string\n` +
        `}\n\n` +
        `Variant = {\n` +
        `  "platform":"meta|google|tiktok|youtube",\n` +
        `  "variant":"A|B|C",\n` +
        `  "angle":string,\n` +
        `  "hook":string,\n` +
        `  "primaryText":string,\n` +
        `  "headlines":[string,string],\n` +
        `  "descriptions":[string,string],\n` +
        `  "cta":string,\n` +
        `  "audience":string,\n` +
        `  "creativeIdeas":[string,string,string],\n` +
        `  "videoScript":string?,\n` +
        `  "utm": { "source":string, "medium":string, "campaign":string, "content":string, "term":string }\n` +
        `}\n\n` +
        `Rules:\n` +
        `- Meta covers Facebook + Instagram feed. Google covers Search/PMAX. TikTok & YouTube need short-form video hooks.\n` +
        `- Keep primary text < 150 words; headlines <= 40 chars; TikTok/YouTube copy can include emoji.\n` +
        `- Creative ideas must be actionable prompts (camera angle, subject, vibe). Video scripts = 3-5 beats.\n` +
        `- Retargeting ads should highlight urgency/offer and include cadence (Day 0 / Day 3 etc.).\n` +
        `- Lookalike ideas: describe source events or seed lists for ad platforms.\n` +
        `- Output JSON ONLY.`,
    },
    {
      role: "user" as const,
      content:
        `${input}\n\n` +
        `Goals:\n- Provide multi-platform campaigns with distinct hooks per A/B.\n- Include retargeting copy and lookalike audience suggestions.\n- Supply creative prompts (images + video scripts) ready for design.\n\n` +
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
    const orgId = String((me as any)?.orgId ?? (me as any)?._id);
    const org = await Org.findById(orgId).lean();
    if (!org) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });

    const rl = await safeLimitPerOrg(orgId);
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
    const intendedVariants = 8; // two prospecting variants per platform
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
      const coerceVariant = (platform: "meta"|"google"|"tiktok"|"youtube", variantLabel: "A"|"B"|"C", src?: any) => {
        const fallbackSource = platform === "google" ? "google" : platform;
        return {
          platform,
          variant: variantLabel,
          angle: src?.angle || `${platform.toUpperCase()} value proposition`,
          hook: src?.hook || "Scroll-stopping hook to highlight the main benefit.",
          primaryText: src?.primaryText || "Discover how we help you achieve better results with less effort.",
          headlines: Array.isArray(src?.headlines) && src.headlines.length ? src.headlines.slice(0, 2) : ["Try it today", "Boost results fast"],
          descriptions: Array.isArray(src?.descriptions) && src.descriptions.length ? src.descriptions.slice(0, 2) : ["Start now", "Works with your workflow"],
          cta: src?.cta || "Learn More",
          audience: src?.audience || "Broad lookalike based on recent converters",
          creativeIdeas: Array.isArray(src?.creativeIdeas) && src.creativeIdeas.length ? src.creativeIdeas.slice(0, 3) : ["Show hero product in action", "Overlay testimonial + rating", "Highlight offer in bold text"],
          videoScript: typeof src?.videoScript === "string" ? src.videoScript : "Hook -> Problem -> Solution -> CTA",
          utm: {
            source: src?.utm?.source || fallbackSource,
            medium: src?.utm?.medium || "cpc",
            campaign: src?.utm?.campaign || `${platform}_campaign_${variantLabel.toLowerCase()}`,
            content: src?.utm?.content || `${platform}_angle_${variantLabel.toLowerCase()}`,
            term: src?.utm?.term || "",
          },
        };
      };

      const ensureList = (platform: "meta"|"google"|"tiktok"|"youtube") => {
        const arr = Array.isArray(parsed?.platforms?.[platform]) ? parsed.platforms[platform] : [];
        const count = Math.max(2, Math.min(3, arr.length || 0));
        const out = [];
        for (let i = 0; i < count; i++) {
          out.push(coerceVariant(platform, (["A","B","C"] as const)[i], arr[i]));
        }
        return out;
      };

      const fixed = {
        platforms: {
          meta: ensureList("meta"),
          google: ensureList("google"),
          tiktok: ensureList("tiktok"),
          youtube: ensureList("youtube"),
        },
        retargeting: {
          summary: parsed?.retargeting?.summary || "Warm audiences: remind them of social proof, guarantee, and urgency with a 3-touch cadence.",
          ads: Array.isArray(parsed?.retargeting?.ads) && parsed.retargeting.ads.length
            ? parsed.retargeting.ads.slice(0, 3).map((ad: any) => ({
                headline: ad?.headline || "Still thinking it over?",
                body: ad?.body || "We saved your cart—wrap up your order and keep the launch bonus.",
                cta: ad?.cta || "Complete Order",
                audience: ad?.audience || "Cart + checkout abandoners (0-7d)",
                schedule: ad?.schedule || "Day 0 + Day 3 + Day 5",
              }))
            : [
                { headline:"Still thinking it over?", body:"We saved your cart—finish checkout for the bonus.", cta:"Complete Order", audience:"Cart abandoners 0-7d", schedule:"Day 0" },
                { headline:"Offer ends soon", body:"48 hours left to claim the launch perk.", cta:"Use Code", audience:"Site visitors 7d", schedule:"Day 3" },
              ],
        },
        lookalikeIdeas: Array.isArray(parsed?.lookalikeIdeas) && parsed.lookalikeIdeas.length
          ? parsed.lookalikeIdeas.slice(0, 5)
          : ["Lookalike from top 10% LTV customers", "Lookalike based on email engagers (30d)", "Lookalike from completed checkouts (90d)"],
        creativeConcepts: Array.isArray(parsed?.creativeConcepts) && parsed.creativeConcepts.length
          ? parsed.creativeConcepts.slice(0, 4).map((c: any) => ({
              platform: ["meta","google","tiktok","youtube","general"].includes(c?.platform) ? c.platform : "general",
              concepts: Array.isArray(c?.concepts) && c.concepts.length ? c.concepts.slice(0, 3) : ["Lifestyle hero visual", "Split-screen before/after"],
              videoScript: typeof c?.videoScript === "string" ? c.videoScript : "Hook (pain) -> Demo -> Proof -> CTA",
            }))
          : [
              { platform:"meta", concepts:["Carousel showing product benefits","Customer quote overlay"], videoScript:"Hook: 'Still using ___?'\nBeat 2: show fix\nBeat 3: CTA" },
              { platform:"tiktok", concepts:["POV selfie testimonial","Unboxing shot with jump cuts"], videoScript:"Hook, Feature, Proof, CTA" },
            ],
        testPlan:
          typeof parsed?.testPlan === "string" && parsed.testPlan.trim()
            ? parsed.testPlan
            : "- Run Meta/TikTok prospecting at equal spend while Google/YouTube support branded search + mid-funnel.\n- Allocate 60% budget prospecting, 25% retargeting, 15% creators.\n- Promote winners to other platforms after 3 days.\n- Refresh hooks weekly.",
      };

      const finalCheck = ResultSchema.safeParse(fixed);
      if (!finalCheck.success) {
        return NextResponse.json({ error: "Generated JSON invalid", issues: finalCheck.error.issues, output: parsed }, { status: 502 });
      }
      try {
        const actorId = (session.user as any)?.id ?? String((me as any)?._id);
        await track(orgId, actorId, {
          module: 'adpilot',
          type: 'generation.completed',
          meta: { variants: intendedVariants },
        });
        await track(orgId, actorId, {
          module: 'adpilot',
          type: 'ad.variant_created',
          meta: { count: intendedVariants },
        });
      } catch {}
      if (gate.overage && gate.overUnits) {
        try { await recordOverageRow({ orgId, key: 'adpilot_variants', overUnits: gate.overUnits }); } catch {}
      }

      return NextResponse.json({ ok: true, result: finalCheck.data });
    }

    // Track analytics: generation + ad variants count
    try {
      const actorId = (session.user as any)?.id ?? String((me as any)?._id);
      await track(orgId, actorId, {
        module: 'adpilot',
        type: 'generation.completed',
        meta: { variants: intendedVariants },
      });
      await track(orgId, actorId, {
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
