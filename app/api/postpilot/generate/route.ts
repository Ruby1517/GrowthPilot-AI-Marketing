export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import { safeLimitPerOrg } from '@/lib/ratelimit';
import { generatePlatformPost } from '@/lib/generators/postpilot';
import { Org, type Plan as OrgPlan } from '@/models/Org';
import { reportUsageForOrg } from '@/lib/billing/usage'; // Stripe metering (optional but recommended)
import { assertWithinLimit } from '@/lib/usage';         // If you want plan hard-caps here
import { track } from '@/lib/track';                     // If you want analytics events
import { callImage } from '@/lib/provider';
import { resolveModelSpec, type Plan as RoutingPlan } from '@/lib/model-routing';

const cadences = ['none','daily','weekly'] as const;

const Body = z.object({
  topic: z.string().max(2000).optional(),
  sourceUrl: z.string().url().optional(),
  industry: z.string().min(2).max(120),
  offers: z.string().max(500).optional(),
  audience: z.string().max(500).optional(),
  voice: z.enum(['Friendly','Professional','Witty','Inspirational','Authoritative']).default('Friendly'),
  language: z.string().default('en-US'),
  platforms: z.array(z.enum(['instagram','tiktok','linkedin','x','facebook'])).min(1).default(['instagram','x']),
  variants: z.number().int().min(1).max(5).default(1),
  projectId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  automationCadence: z.enum(cadences).default('none'),
  automationSlots: z.number().int().min(1).max(7).default(1),
  automationStart: z.string().datetime().optional(),
  includeImages: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const topic = data.topic?.trim();
  if (!topic && !data.sourceUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['topic'],
      message: 'Provide a topic or a source URL.',
    });
  }
  if (topic && topic.length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['topic'],
      message: 'Topic must be at least 3 characters.',
    });
  }
});

type Cadence = typeof cadences[number];

function toRoutingPlan(plan?: OrgPlan | null): RoutingPlan | undefined {
  if (plan === 'Starter' || plan === 'Pro' || plan === 'Business') return plan;
  return undefined;
}

function buildSchedule(params: { cadence: Cadence; slots: number; start?: string | null }): Date[] {
  const { cadence, slots, start } = params;
  const list: Date[] = [];
  const startDate = start ? new Date(start) : new Date();
  const base = isNaN(startDate.getTime()) ? new Date() : startDate;
  const normalizedBase = base < new Date() ? new Date() : base;
  const useSlots = cadence === 'none' ? 1 : slots;
  for (let i = 0; i < useSlots; i++) {
    const d = new Date(normalizedBase);
    if (cadence === 'daily') {
      d.setDate(normalizedBase.getDate() + i);
    } else if (cadence === 'weekly') {
      d.setDate(normalizedBase.getDate() + i * 7);
    }
    list.push(d);
  }
  return list;
}

export async function POST(req: Request) {
  // ---- auth
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ---- input
  const bodyJson = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(bodyJson);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const {
    topic,
    sourceUrl,
    industry,
    offers,
    audience,
    voice,
    language,
    platforms,
    variants,
    projectId,
    scheduledAt,
    automationCadence,
    automationSlots,
    automationStart,
    includeImages,
  } = parsed.data;

  // ---- db + org
  await dbConnect();
  const Users = (await import('mongoose')).default.connection.collection('users');
  const me = await Users.findOne({ email: session.user.email });
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let orgId = String(me.orgId ?? '');
  let org = orgId ? await Org.findById(orgId).lean() : null;
  if (!org) {
    // Ensure a personal Trial org for users without an org
    const UsersModel = (await import('@/models/User')).default;
    const created = await Org.create({ name: `${(session.user as any).name || 'My'} Org` });
    await UsersModel.updateOne({ _id: me._id }, { $set: { orgId: created._id } });
    await Org.updateOne(
      { _id: created._id },
      { $push: { members: { userId: me._id, role: 'member', joinedAt: new Date() } } }
    );
    org = await Org.findById(created._id).lean();
    orgId = String(created._id);
  }

  // ---- rate limit per org
  const { success, limit, remaining, reset } = await safeLimitPerOrg(orgId);
  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded. Please wait a bit.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
        },
      }
    );
  }

  // ---- (optional) hard cap by plan: count posts as 'postpilot_generated'
  const scheduleDates = buildSchedule({ cadence: automationCadence, slots: automationSlots, start: automationStart || scheduledAt || null });
  const incBy = scheduleDates.length * platforms.length * variants;
  const gate = await assertWithinLimit({ 
    orgId, 
    key: 'postpilot_generated', 
    incBy, 
    allowOverage: true 
  });
  if (!gate.ok) return NextResponse.json({ ok:false, error: 'Plan limit reached', details: gate }, { status: 402 });

  const orgPlan: OrgPlan = (org?.plan as any) || 'Trial';
  const routingPlan = toRoutingPlan(orgPlan);
  const textModel = resolveModelSpec({ module: 'postpilot', task: 'text.generate', plan: routingPlan }).model;
  // Trial cannot generate images; force-disable visuals
  const allowImages = orgPlan !== 'Trial' && includeImages !== false;
  const imageModels: string[] = [];
  if (allowImages && routingPlan) {
    imageModels.push(resolveModelSpec({ module: 'postpilot', task: 'image.generate', plan: routingPlan }).model);
    const fallback = (process.env.POSTPILOT_IMAGE_FALLBACK_MODEL || '').trim();
    if (fallback && !imageModels.includes(fallback)) imageModels.push(fallback);
    if (!fallback && imageModels[0] === 'gpt-image-1') imageModels.push('dall-e-3');
  }
  let imageModelIndex = 0;
  let imageModel = imageModels[imageModelIndex] ?? null;
  let imageModelUnavailable = false;

  let effectiveTopic = topic?.trim() || '';
  let siteContext: { title: string | null; description: string | null; snippet: string | null } | null = null;
  if (sourceUrl) {
    siteContext = await extractSiteContext(sourceUrl).catch(() => null);
    if (!effectiveTopic && siteContext?.title) effectiveTopic = siteContext.title;
  }
  if (!effectiveTopic) effectiveTopic = 'Social media campaign';
  const sourceSummary = siteContext?.snippet || siteContext?.description || null;

  // ---- generate posts
  const generated: Array<{
    platform: string;
    headline: string;
    caption: string;
    hashtags: string[];
    altText: string;
    visualIdeas: string[];
    visualPrompt: string;
    usage: { inputTokens: number; outputTokens: number; totalTokens: number };
    scheduledFor: string | null;
    imageDataUrl?: string | null;
  }> = [];

  for (const slot of scheduleDates) {
    for (const platform of platforms) {
      for (let i = 0; i < variants; i++) {
        const post = await generatePlatformPost(
          {
            topic: effectiveTopic,
            voice,
            language,
            platform: platform as any,
            industry,
            offers,
            audience,
            sourceSummary,
            sourceUrl: sourceUrl || null,
          },
          { model: textModel }
        );

        let imageDataUrl: string | null = null;
        if (imageModel && !imageModelUnavailable) {
          try {
            const prompt = `${post.visualPrompt}. Platform: ${platform}. Industry: ${industry}. Target audience: ${audience || 'general social users'}. Offer: ${offers || 'evergreen value'}. ${sourceSummary ? `Source details: ${sourceSummary.slice(0, 400)}` : ''}`;
            const img = await callImage({ prompt, model: imageModel, size: '1024x1024' });
            const b64 = img.images?.[0]?.b64;
            if (b64) imageDataUrl = `data:image/png;base64,${b64}`;
          } catch (err) {
            if (isImageModelAccessError(err)) {
              const next = imageModels[imageModelIndex + 1];
              if (next) {
                imageModelIndex += 1;
                imageModel = next;
                console.warn(`PostPilot image model unavailable; falling back to ${imageModel}.`);
              } else {
                imageModelUnavailable = true;
                imageModel = null;
                console.warn('PostPilot image models unavailable; disable images or set POSTPILOT_IMAGE_MODEL.');
              }
            } else {
              console.warn('PostPilot image generation failed', err);
            }
          }
        }

        generated.push({ ...post, scheduledFor: slot?.toISOString() ?? null, imageDataUrl });
      }
    }
  }

  // ---- Stripe metering (bill by actual tokens)
  const totalTokens = generated.reduce((s, g) => s + g.usage.totalTokens, 0);
  try {
    await reportUsageForOrg(orgId, {
      tokens: Math.max(0, Math.floor(totalTokens)),
      sourceId: `post_${(session.user as any).id ?? me._id}_${Date.now()}`,
    });
  } catch (e) {
    console.warn('Stripe usage reporting failed', e);
  }

  // ---- persist to DB
  const Posts = (await import('mongoose')).default.connection.collection('posts');
  const insert = await Posts.insertOne({
    userId: String(me._id),
    orgId,
    projectId,
    topic: effectiveTopic,
    sourceUrl: sourceUrl || null,
    sourceSummary,
    industry,
    offers,
    audience,
    tone: voice.toLowerCase(),
    items: generated.map(g => ({
      platform: g.platform,
      headline: g.headline,
      caption: g.caption,
      hashtags: g.hashtags,
      altText: g.altText,
      visualIdeas: g.visualIdeas,
      visualPrompt: g.visualPrompt,
      scheduledFor: g.scheduledFor,
      imageDataUrl: g.imageDataUrl,
    })),
    counts: { platforms: platforms.length, variants, total: generated.length, scheduleSlots: scheduleDates.length },
    usage: { model: textModel, totalTokens },
    scheduledAt: scheduleDates[0] ?? null,
    automation: {
      cadence: automationCadence,
      slots: automationCadence === 'none' ? 1 : automationSlots,
      plan: scheduleDates.map((d) => d.toISOString()),
    },
    sourceContext: siteContext,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // ---- (optional) analytics event
  await track(orgId, (session.user as any).id ?? String(me._id), {
    module: 'postpilot',
    type: 'generation.completed',
    meta: { items: generated.length, tokens: totalTokens }
  });

  return NextResponse.json({
    ok: true,
    postId: String(insert.insertedId),
    items: generated.map((g) => {
      const rest = { ...g };
      delete (rest as any).usage;
      return rest;
    }), // omit usage per-item in payload
    usage: { totalTokens },
    automationPlan: scheduleDates.map((d) => d.toISOString()),
  });
}

function isImageModelAccessError(err: any) {
  const status = err?.status;
  const code = err?.code;
  const message = err?.error?.message || err?.message || '';
  return status === 403 && (code === 'model_not_found' || /does not have access to model/i.test(message));
}
async function extractSiteContext(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { 'user-agent': 'GrowthPilotBot/1.0 (+https://growthpilot.ai)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
    const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogDescMatch = cleaned.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const metaDescMatch = cleaned.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const text = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const snippet = text.slice(0, 2000);
    return {
      title: titleMatch?.[1]?.trim() || null,
      description: ogDescMatch?.[1]?.trim() || metaDescMatch?.[1]?.trim() || null,
      snippet,
    };
  } catch (err) {
    console.warn('PostPilot site fetch failed', err);
    return null;
  }
}
