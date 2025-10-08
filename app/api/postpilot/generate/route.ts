export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import { limiterPerOrg } from '@/lib/ratelimit';
import { generatePlatformPost } from '@/lib/generators/postpilot';
import { Org } from '@/models/Org';
import { reportUsageForOrg } from '@/lib/billing/usage'; // Stripe metering (optional but recommended)
import { assertWithinLimit } from '@/lib/usage';         // If you want plan hard-caps here
import { track } from '@/lib/track';                     // If you want analytics events

const Body = z.object({
  topic: z.string().min(3),
  voice: z.enum(['Friendly','Professional','Witty','Inspirational','Authoritative']).default('Friendly'),
  language: z.string().default('en-US'),
  platforms: z.array(z.enum(['instagram','tiktok','linkedin','x'])).min(1).default(['instagram','x']),
  variants: z.number().int().min(1).max(10).default(1),
  projectId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

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
  const { topic, voice, language, platforms, variants, projectId, scheduledAt } = parsed.data;

  // ---- db + org
  await dbConnect();
  const Users = (await import('mongoose')).default.connection.collection('users');
  const me = await Users.findOne({ email: session.user.email });
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const orgId = String(me.orgId ?? me._id);
  const org = await Org.findById(orgId).lean();
  if (!org) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });

  // ---- rate limit per org
  const { success, limit, remaining, reset } = await limiterPerOrg.limit(orgId);
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
  const incBy = platforms.length * variants;
  const gate = await assertWithinLimit({ 
    orgId, 
    key: 'postpilot_generated', 
    incBy, 
    allowOverage: true 
  });
  if (!gate.ok) return NextResponse.json({ ok:false, error: 'Plan limit reached', details: gate }, { status: 402 });

  // ---- generate posts
  const generated: Array<{
    platform: string;
    caption: string;
    hashtags: string[];
    altText: string;
    suggestions: string[];
    usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  }> = [];

  for (const platform of platforms) {
    for (let i = 0; i < variants; i++) {
      const post = await generatePlatformPost({ topic, voice, language, platform });
      generated.push(post);
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
    topic,
    tone: voice.toLowerCase(),
    items: generated.map(g => ({
      platform: g.platform,
      caption: g.caption,
      hashtags: g.hashtags,
      altText: g.altText,
      suggestions: g.suggestions,
    })),
    counts: { platforms: platforms.length, variants, total: generated.length },
    usage: { model: 'gpt-4o-mini', totalTokens },
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
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
    items: generated.map(({ usage, ...rest }) => rest), // omit usage per-item in payload
    usage: { totalTokens },
  });
}
