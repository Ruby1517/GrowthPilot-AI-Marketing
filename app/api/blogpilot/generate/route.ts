// export const runtime = 'nodejs';

// import { NextResponse } from 'next/server';
// import { z } from 'zod';
// import { auth } from '@/lib/auth';
// import { dbConnect } from '@/lib/db';
// import { limiterPerOrg } from '@/lib/ratelimit';
// import { Org } from '@/models/Org';
// import { reportUsageForOrg } from '@/lib/billing/usage';
// import { assertWithinLimit } from '@/lib/usage';
// import { track } from '@/lib/track';

// import { callText } from '@/lib/provider';
// import { resolveModelSpec } from '@/lib/model-routing';
// import { safetyCheck, plagiarismHeuristic } from '@/lib/safety';

// // -------- Input schema --------
// const TargetLink = z.object({ anchor: z.string().min(1), url: z.string().min(1) });
// const BodySchema = z.object({
//   keywords: z.union([z.string().min(1), z.array(z.string().min(1))]),
//   url: z.string().url().optional(),
//   tone: z.string().optional().default('neutral'),
//   wordCount: z.number().int().min(400).max(4000).optional().default(1500),
//   targetLinks: z.array(TargetLink).optional().default([]),
//   projectId: z.string().optional(),
//   scheduledAt: z.string().datetime().optional(),
// });

// // -------- Helpers --------
// function toArray(v: string | string[]) {
//   return Array.isArray(v) ? v : v.split(',').map(s => s.trim()).filter(Boolean);
// }
// function stripMd(md: string) {
//   return md
//     .replace(/```[\s\S]*?```/g, ' ')
//     .replace(/`[^`]+`/g, ' ')
//     .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
//     .replace(/\[[^\]]*\]\([^)]+\)/g, ' ')
//     .replace(/[#>*_`~\-]+/g, ' ')
//     .replace(/\s+/g, ' ')
//     .trim();
// }
// function fleschReadingEase(text: string) {
//   const words = (text.match(/\b[^\s]+\b/g) || []);
//   const sentences = (text.match(/[.!?]+/g) || []).length || 1;
//   const syllableCount = words.reduce((sum, w) => {
//     const s = w.toLowerCase().replace(/e\b/g, '').match(/[aeiouy]+/g);
//     return sum + (s ? s.length : 1);
//   }, 0);
//   const W = Math.max(words.length, 1);
//   const S = Math.max(sentences, 1);
//   const ASL = W / S;
//   const ASW = syllableCount / W;
//   const score = 206.835 - 1.015 * ASL - 84.6 * ASW;
//   const grade =
//     score >= 90 ? '5th' :
//     score >= 80 ? '6th' :
//     score >= 70 ? '7th' :
//     score >= 60 ? '8th-9th' :
//     score >= 50 ? '10th-12th' :
//     score >= 30 ? 'College' : 'College+';
//   return { score: Math.round(score * 10) / 10, grade };
// }
// function countWords(s: string) {
//   return (s.trim().match(/\b\w+\b/g)?.length) || 0;
// }

// // -------- Prompt builder --------
// function blogPilotPrompt(opts: {
//   keywords: string[];
//   url?: string;
//   tone: string;
//   wordCount: number;
//   targetLinks: Array<{ anchor: string; url: string }>;
// }) {
//   const { keywords, url, tone, wordCount, targetLinks } = opts;
//   const targetLinksBlock = targetLinks.length
//     ? `Internal links (use naturally, once each if possible):
// ${targetLinks.map(x => `- ${x.anchor} → ${x.url}`).join('\n')}`
//     : `Internal links: none provided.`;

//   return [
//     {
//       role: 'system' as const,
//       content: `You are BlogPilot, an SEO-savvy content generator.
// Return a STRICT JSON object that follows the "BlogPilotJSON" schema below.
// Do not include markdown fences or commentary—JSON only.`,
//     },
//     {
//       role: 'user' as const,
//       content: `
// Inputs:
// - Keywords: ${keywords.join(', ')}
// - Reference URL: ${url ?? 'none'}
// - Tone: ${tone}
// - Target word count: ~${wordCount}
// - ${targetLinksBlock}

// Requirements:
// 1) Create a "brief" (audience, goal, POV).
// 2) Create a detailed "outline" (array of headings/subheadings).
// 3) Write a long-form "draft" (Markdown, semantic headings H2/H3, short paragraphs, bullets where helpful).
//    - Naturally incorporate internal links when relevant using standard markdown links.
// 4) Provide "meta": { "title", "description" } suitable for SEO.
// 5) Provide "faq": array of { "q", "a" } (5–8 Q&As).
// 6) Provide "altText": array of 5–8 image alt-text suggestions.
// 7) Provide "citations": array of strings (empty if none).

// JSON schema (BlogPilotJSON):
// {
//   "brief": string,
//   "outline": string[],
//   "draft": string,
//   "meta": { "title": string, "description": string },
//   "faq": Array<{ "q": string, "a": string }>,
//   "altText": string[],
//   "citations": string[]
// }

// Return ONLY a valid JSON object for BlogPilotJSON.
//       `.trim(),
//     },
//   ];
// }

// // -------- Normalization helpers (guarantee required fields) --------
// function firstHeadingFromDraft(md: string) {
//   const h1 = md.match(/^#\s+(.+)$/m)?.[1];
//   if (h1) return h1.trim();
//   const h2 = md.match(/^##\s+(.+)$/m)?.[1];
//   if (h2) return h2.trim();
//   return md.split('\n').map(s => s.trim()).find(Boolean)?.slice(0, 80) || 'Untitled';
// }
// function firstParagraph(md: string) {
//   const noMd = stripMd(md);
//   const sentences = noMd.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
//   return (sentences || noMd).slice(0, 220).trim();
// }
// function makeDefaultFAQ(keywords: string[]) {
//   const base = keywords.slice(0, 3);
//   const qs = [
//     `What is ${base[0] || 'this topic'}?`,
//     `Why does ${base[1] || 'this matter'} for my business?`,
//     `How do I get started with ${base[2] || 'it'}?`,
//     `What are common mistakes to avoid?`,
//     `Where can I learn more?`,
//   ];
//   return qs.map(q => ({ q, a: 'Brief, helpful answer summarizing the key point in 2–3 sentences.' }));
// }
// function makeDefaultAltText(headings: string[], keywords: string[]) {
//   const ideas = (headings.length ? headings : keywords).slice(0, 6);
//   if (!ideas.length) ideas.push('Hero image illustrating the article topic');
//   return ideas.map(h => `Illustration/photograph representing: ${h}`);
// }
// function normalizeBlogJson(data: any, input: { keywords: string[]; url?: string; tone?: string }) {
//   const draft = typeof data?.draft === 'string' ? data.draft : '';
//   const outline = Array.isArray(data?.outline) ? data.outline : [];
//   const keywords = input.keywords || [];

//   // meta
//   if (!data.meta || typeof data.meta !== 'object') data.meta = {};
//   if (!data.meta.title) data.meta.title = firstHeadingFromDraft(draft) || (outline[0] || 'Article');
//   if (!data.meta.description) data.meta.description = firstParagraph(draft);

//   // faq
//   if (!Array.isArray(data.faq) || data.faq.length < 3) {
//     const fallback = makeDefaultFAQ(keywords);
//     const existing = Array.isArray(data.faq) ? data.faq : [];
//     data.faq = [...existing, ...fallback].slice(0, Math.max(5, existing.length || 5));
//   }

//   // altText
//   if (!Array.isArray(data.altText) || data.altText.length < 3) {
//     const headings = outline.filter(s => typeof s === 'string' && s.trim());
//     const fallback = makeDefaultAltText(headings, keywords);
//     const existing = Array.isArray(data.altText) ? data.altText : [];
//     data.altText = [...existing, ...fallback].slice(0, Math.max(5, existing.length || 5));
//   }

//   if (!Array.isArray(data.citations)) data.citations = [];
//   return data;
// }

// // -------- Handler --------
// export async function POST(req: Request) {
//   try {
//     // ---- auth
//     const session = await auth();
//     if (!session?.user?.email) {
//       return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
//     }

//     // ---- input
//     const bodyRaw = await req.json().catch(() => ({}));
//     const parsed = BodySchema.safeParse(bodyRaw);
//     if (!parsed.success) {
//       return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
//     }
//     const b = parsed.data;

//     // ---- db + org
//     await dbConnect();
//     const Users = (await import('mongoose')).default.connection.collection('users');
//     const me = await Users.findOne({ email: session.user.email });
//     if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

//     const orgId = String(me.orgId ?? me._id);
//     const org = await Org.findById(orgId).lean();
//     if (!org) return NextResponse.json({ ok: false, error: 'Org not found' }, { status: 404 });

//     // ---- rate limit per org
//     const { success, limit, remaining, reset } = await limiterPerOrg.limit(orgId);
//     if (!success) {
//       return NextResponse.json(
//         { ok: false, error: 'Rate limit exceeded. Please wait a bit.' },
//         {
//           status: 429,
//           headers: {
//             'X-RateLimit-Limit': String(limit),
//             'X-RateLimit-Remaining': String(remaining),
//             'X-RateLimit-Reset': String(reset),
//           },
//         }
//       );
//     }

//     // ---- pre-safety on inputs
//     const preSafe = safetyCheck(JSON.stringify({
//       keywords: toArray(b.keywords as any),
//       url: b.url,
//       tone: b.tone,
//       wordCount: b.wordCount,
//       targetLinks: b.targetLinks,
//     }));
//     if (!preSafe.ok) {
//       return NextResponse.json({ ok: false, error: 'safety_failed', safety: preSafe }, { status: 400 });
//     }

//     // ---- (optional) plan cap by words (preflight dry-run). Predict words by target.
//     const predictedWords = Math.max(400, Math.min(4000, b.wordCount ?? 1500));
//     const preGate = await assertWithinLimit({
//       orgId,
//       key: 'blogpilot_words',
//       incBy: predictedWords,
//       allowOverage: true,
//       dryRun: true,
//     });
//     if (!preGate.ok && preGate.reason === 'limit_exceeded') {
//       return NextResponse.json({ ok: false, error: 'Plan limit reached', details: preGate }, { status: 402 });
//     }

//     // ---- choose model via routing (plan-aware)
//     const spec = resolveModelSpec({
//       module: 'blogpilot',
//       task: 'text.generate',
//       plan: (org as any).plan ?? 'Starter',
//       orgOverrides: (org as any).modelOverrides ?? null,
//     });

//     // ---- build messages & call provider
//     const messages = blogPilotPrompt({
//       keywords: toArray(b.keywords as any),
//       url: b.url,
//       tone: b.tone!,
//       wordCount: b.wordCount!,
//       targetLinks: b.targetLinks!,
//     });

//     await track(orgId, String(me._id), {
//       module: 'blogpilot',
//       type: 'generation.requested',
//       meta: { predictedWords }
//     });

//     const { text, tokens, raw: providerRaw } = await callText({
//       messages,
//       model: spec.model,
//       temperature: 0.3,
//       json: true, // enforce JSON from provider layer
//     });

//     // ---- post-safety (basic)
//     const postSafe = safetyCheck(text);
//     if (!postSafe.ok) {
//       return NextResponse.json({ ok: false, error: 'safety_failed', safety: postSafe }, { status: 400 });
//     }

//     // ---- parse + normalize + validate shape
//     let data: any;
//     try {
//       data = JSON.parse(text.trim());
//     } catch {
//       return NextResponse.json({ ok: false, error: 'LLM did not return valid JSON', output: text }, { status: 502 });
//     }

//     data = normalizeBlogJson(data, { keywords: toArray(b.keywords as any), url: b.url, tone: b.tone });

//     const ResultSchema = z.object({
//       brief: z.string().min(10),
//       outline: z.array(z.string().min(2)).min(3),
//       draft: z.string().min(50),
//       meta: z.object({ title: z.string().min(5), description: z.string().min(20) }),
//       faq: z.array(z.object({ q: z.string().min(3), a: z.string().min(3) })).min(3),
//       altText: z.array(z.string().min(3)).min(3),
//       citations: z.array(z.string()).optional().default([]),
//     });
//     const safe = ResultSchema.safeParse(data);
//     if (!safe.success) {
//       return NextResponse.json({ ok: false, error: 'Generated JSON invalid', issues: safe.error.issues, output: data }, { status: 502 });
//     }
//     const result = safe.data;

//     // ---- plagiarism heuristic
//     const plag = plagiarismHeuristic(result.draft);
//     if (!plag.ok) {
//       return NextResponse.json({ ok: false, error: 'safety_failed', safety: plag }, { status: 400 });
//     }

//     // ---- readability & words
//     const plain = stripMd(result.draft);
//     const readability = fleschReadingEase(plain);
//     const words = countWords(result.draft);

//     // ---- commit plan usage: predicted then extra
//     await assertWithinLimit({
//       orgId,
//       key: 'blogpilot_words',
//       incBy: predictedWords,
//       allowOverage: true,
//       dryRun: false,
//     });

//     let overageUnits = 0;
//     if (words > predictedWords) {
//       const extra = words - predictedWords;
//       const commit2 = await assertWithinLimit({
//         orgId,
//         key: 'blogpilot_words',
//         incBy: extra,
//         allowOverage: true,
//         dryRun: false,
//       });
//       if (commit2.ok && commit2.overage && commit2.overUnits) {
//         overageUnits = commit2.overUnits;
//         // If you want to record a row now:
//         // await recordOverageRow({ orgId, key: 'blogpilot_words', overUnits: commit2.overUnits });
//       }
//     }

//     // ---- Stripe metering (by tokens)
//     const inTok = providerRaw?.usage?.prompt_tokens ?? 0;
//     const outTok = providerRaw?.usage?.completion_tokens ?? 0;
//     const totalTokens = Math.max(0, Math.floor(inTok + outTok));

//     // 🔒 Only report if billing is enabled and subscription is active
//     const billingEnabled =
//       process.env.BILLING_STRIPE_ENABLED === 'true' ||
//       (process.env.NODE_ENV === 'production' && !!process.env.STRIPE_SECRET_KEY);

//     const subActive =
//       !!(org as any)?.billing?.subscriptionStatus &&
//       (org as any).billing.subscriptionStatus.toLowerCase() === 'active';

//     if (billingEnabled && subActive && totalTokens > 0) {
//       try {
//         await reportUsageForOrg(orgId, {
//           tokens: totalTokens,
//           sourceId: `blog_${String(me._id)}_${Date.now()}`,
//         });
//       } catch (e) {
//         // Optional: keep warn in dev, silence in prod logs if noisy
//         if (process.env.NODE_ENV !== 'production') {
//           console.warn('Stripe usage reporting failed', e);
//         }
//       }
//     }

//     // ---- analytics event
//     await track(orgId, String(me._id), {
//       module: 'blogpilot',
//       type: 'generation.completed',
//       meta: { words, tokens: totalTokens, readability: readability.score }
//     });

//     // ---- response (client can persist via /api/blogpilot/save)
//     return NextResponse.json({
//       ok: true,
//       input: {
//         keywords: toArray(b.keywords as any),
//         url: b.url,
//         tone: b.tone,
//         wordCount: b.wordCount,
//         targetLinks: b.targetLinks,
//       },
//       brief: result.brief,
//       outline: result.outline,
//       draft: result.draft,
//       meta: result.meta,
//       faq: result.faq,
//       altText: result.altText,
//       citations: result.citations || [],
//       readability, // { score, grade }
//       usage: {
//         words,
//         predictedWords,
//         overageUnits,
//         model: spec.model,
//         tokens: totalTokens,
//       },
//     });
//   } catch (err: any) {
//     console.error('[blogpilot/generate] fatal:', err);
//     return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
//   }
// }


export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import { safeLimitPerOrg } from '@/lib/ratelimit';
import { Org } from '@/models/Org';
import { assertWithinLimit } from '@/lib/usage';
import { track } from '@/lib/track';

import { callText } from '@/lib/provider';
import { resolveModelSpec } from '@/lib/model-routing';
import { safetyCheck, plagiarismHeuristic } from '@/lib/safety';

// (optional) Stripe metering safe wrapper
import { reportUsageForOrg } from '@/lib/billing/usage';

// -------- Input schema --------
const TargetLink = z.object({ anchor: z.string().min(1), url: z.string().min(1) });
const BodySchema = z.object({
  keywords: z.union([z.string().min(1), z.array(z.string().min(1))]),
  url: z.string().url().optional(),
  tone: z.string().optional().default('neutral'),
  wordCount: z.number().int().min(400).max(4000).optional().default(1500),
  targetLinks: z.array(TargetLink).optional().default([]),
  projectId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

// -------- Helpers --------
function toArray(v: string | string[]) {
  return Array.isArray(v) ? v : v.split(',').map(s => s.trim()).filter(Boolean);
}
function stripMd(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/[#>*_`~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function fleschReadingEase(text: string) {
  const words = (text.match(/\b[^\s]+\b/g) || []);
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const syllableCount = words.reduce((sum, w) => {
    const s = w.toLowerCase().replace(/e\b/g, '').match(/[aeiouy]+/g);
    return sum + (s ? s.length : 1);
  }, 0);
  const W = Math.max(words.length, 1);
  const S = Math.max(sentences, 1);
  const ASL = W / S;
  const ASW = syllableCount / W;
  const score = 206.835 - 1.015 * ASL - 84.6 * ASW;
  const grade =
    score >= 90 ? '5th' :
    score >= 80 ? '6th' :
    score >= 70 ? '7th' :
    score >= 60 ? '8th-9th' :
    score >= 50 ? '10th-12th' :
    score >= 30 ? 'College' : 'College+';
  return { score: Math.round(score * 10) / 10, grade };
}
function countWords(s: string) {
  return (s.trim().match(/\b\w+\b/g)?.length) || 0;
}

// -------- JSON-LD builders --------
function buildArticleJSONLD(input: {
  headline: string;
  description: string;
  url?: string;
  keywords: string[];
  authorName?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    ...(input.url ? { url: input.url } : {}),
    keywords: input.keywords.join(', '),
    ...(input.authorName ? { author: { '@type': 'Person', name: input.authorName } } : {}),
  };
}
function buildFAQJSONLD(faq: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
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
    ? `Internal links (use each EXACTLY ONCE if possible; markdown format [ANCHOR](URL)):
${targetLinks.map(x => `- ${x.anchor} → ${x.url}`).join('\n')}`
    : `Internal links: none provided.`;

  return [
    {
      role: 'system' as const,
      content: `You are BlogPilot, an SEO-savvy content generator.
Return a STRICT JSON object that follows the "BlogPilotJSON" schema below.
Do not include markdown fences or commentary—JSON only.`,
    },
    {
      role: 'user' as const,
      content: `
Inputs:
- Keywords: ${keywords.join(', ')}
- Reference URL: ${url ?? 'none'}
- Tone: ${tone}
- Target word count: ~${wordCount}
- ${targetLinksBlock}

Requirements:
1) Create a "brief" (audience, goal, POV).
2) Create a detailed "outline" (array of headings/subheadings).
3) Write a long-form "draft" (Markdown, semantic headings H2/H3, short paragraphs, bullets where helpful).
   - You MUST include each internal link EXACTLY ONCE using [ANCHOR](URL).
   - Insert links naturally at the first relevant mention; if no mention exists, add a "Related links" section at the end.
4) Provide "meta": { "title", "description" } suitable for SEO.
5) Provide "faq": array of { "q", "a" } (5–8 Q&As).
6) Provide "altText": array of 5–8 image alt-text suggestions.
7) Provide "citations": array of strings (empty if none).

JSON schema (BlogPilotJSON):
{
  "brief": string,
  "outline": string[],
  "draft": string,
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

// -------- Normalization helpers (guarantee required fields) --------
function firstHeadingFromDraft(md: string) {
  const h1 = md.match(/^#\s+(.+)$/m)?.[1];
  if (h1) return h1.trim();
  const h2 = md.match(/^##\s+(.+)$/m)?.[1];
  if (h2) return h2.trim();
  return md.split('\n').map(s => s.trim()).find(Boolean)?.slice(0, 80) || 'Untitled';
}
function firstParagraph(md: string) {
  const noMd = stripMd(md);
  const sentences = noMd.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  return (sentences || noMd).slice(0, 220).trim();
}
function makeDefaultFAQ(keywords: string[]) {
  const base = keywords.slice(0, 3);
  const qs = [
    `What is ${base[0] || 'this topic'}?`,
    `Why does ${base[1] || 'this matter'} for my business?`,
    `How do I get started with ${base[2] || 'it'}?`,
    `What are common mistakes to avoid?`,
    `Where can I learn more?`,
  ];
  return qs.map(q => ({ q, a: 'Brief, helpful answer summarizing the key point in 2–3 sentences.' }));
}
function makeDefaultAltText(headings: string[], keywords: string[]) {
  const ideas = (headings.length ? headings : keywords).slice(0, 6);
  if (!ideas.length) ideas.push('Hero image illustrating the article topic');
  return ideas.map(h => `Illustration/photograph representing: ${h}`);
}
function normalizeBlogJson(data: any, input: { keywords: string[]; url?: string; tone?: string }) {
  const draft = typeof data?.draft === 'string' ? data.draft : '';
  const outline = Array.isArray(data?.outline) ? data.outline : [];
  const keywords = input.keywords || [];

  if (!data.meta || typeof data.meta !== 'object') data.meta = {};
  if (!data.meta.title) data.meta.title = firstHeadingFromDraft(draft) || (outline[0] || 'Article');
  if (!data.meta.description) data.meta.description = firstParagraph(draft);

  if (!Array.isArray(data.faq) || data.faq.length < 3) {
    const fallback = makeDefaultFAQ(keywords);
    const existing = Array.isArray(data.faq) ? data.faq : [];
    data.faq = [...existing, ...fallback].slice(0, Math.max(5, existing.length || 5));
  }

  if (!Array.isArray(data.altText) || data.altText.length < 3) {
    const headings = outline.filter((s: any) => typeof s === 'string' && s.trim());
    const fallback = makeDefaultAltText(headings, keywords);
    const existing = Array.isArray(data.altText) ? data.altText : [];
    data.altText = [...existing, ...fallback].slice(0, Math.max(5, existing.length || 5));
  }

  if (!Array.isArray(data.citations)) data.citations = [];
  return data;
}

// -------- Internal link enforcement --------
function ensureInternalLinks(
  draft: string,
  links: Array<{ anchor: string; url: string }>
) {
  if (!Array.isArray(links) || links.length === 0 || !draft) return draft;

  let out = draft;
  const used: string[] = [];

  for (const { anchor, url } of links) {
    if (!anchor || !url) continue;
    const anchorEsc = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(\\b)(${anchorEsc})(\\b)`, 'i');
    if (re.test(out)) {
      out = out.replace(re, (_m, pre, mid, post) => `${pre}[${mid}](${url})${post}`);
      used.push(anchor);
    }
  }

  const leftovers = links.filter(l => !used.includes(l.anchor));
  if (leftovers.length) {
    const lines = leftovers.map(l => `- [${l.anchor}](${l.url})`).join('\n');
    out += `\n\n---\n\n## Related links\n${lines}\n`;
  }

  return out;
}

// -------- Handler --------
export async function POST(req: Request) {
  try {
    // ---- auth
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ---- input
    const bodyRaw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    // ---- db + org
    await dbConnect();
    const Users = (await import('mongoose')).default.connection.collection('users');
    const me = await Users.findOne({ email: session.user.email });
    if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    let orgId = String(me.orgId ?? '');
    let org = orgId ? await Org.findById(orgId).lean() : null;
    if (!org) {
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

    // ---- pre-safety on inputs
    const preSafe = safetyCheck(JSON.stringify({
      keywords: toArray(b.keywords as any),
      url: b.url,
      tone: b.tone,
      wordCount: b.wordCount,
      targetLinks: b.targetLinks,
    }));
    if (!preSafe.ok) {
      return NextResponse.json({ ok: false, error: 'safety_failed', safety: preSafe }, { status: 400 });
    }

    // ---- (optional) plan cap by words (preflight dry-run). Predict words by target.
    const predictedWords = Math.max(400, Math.min(4000, b.wordCount ?? 1500));
    const preGate = await assertWithinLimit({
      orgId,
      key: 'blogpilot_words',
      incBy: predictedWords,
      allowOverage: true,
      dryRun: true,
    });
    if (!preGate.ok && preGate.reason === 'limit_exceeded') {
      return NextResponse.json({ ok: false, error: 'Plan limit reached', details: preGate }, { status: 402 });
    }

    // ---- choose model via routing (plan-aware)
    const spec = resolveModelSpec({
      module: 'blogpilot',
      task: 'text.generate',
      plan: (org as any).plan ?? 'Starter',
      orgOverrides: (org as any).modelOverrides ?? null,
    });

    // ---- build messages & call provider
    const messages = blogPilotPrompt({
      keywords: toArray(b.keywords as any),
      url: b.url,
      tone: b.tone!,
      wordCount: b.wordCount!,
      targetLinks: b.targetLinks!,
    });

    await track(orgId, String(me._id), {
      module: 'blogpilot',
      type: 'generation.requested',
      meta: { predictedWords }
    });

    const { text, raw: providerRaw } = await callText({
      messages,
      model: spec.model,
      json: true, // enforce JSON from provider layer
    });

    // ---- post-safety (basic)
    const postSafe = safetyCheck(text);
    if (!postSafe.ok) {
      return NextResponse.json({ ok: false, error: 'safety_failed', safety: postSafe }, { status: 400 });
    }

    // ---- parse + normalize + validate shape
    let data: any;
    try {
      data = JSON.parse(text.trim());
    } catch {
      return NextResponse.json({ ok: false, error: 'LLM did not return valid JSON', output: text }, { status: 502 });
    }

    data = normalizeBlogJson(data, { keywords: toArray(b.keywords as any), url: b.url, tone: b.tone });

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
      return NextResponse.json({ ok: false, error: 'Generated JSON invalid', issues: safe.error.issues, output: data }, { status: 502 });
    }
    const result = safe.data;

    // ---- plagiarism heuristic
    const plag = plagiarismHeuristic(result.draft);
    if (!plag.ok) {
      return NextResponse.json({ ok: false, error: 'safety_failed', safety: plag }, { status: 400 });
    }

    // ---- 🔧 Enforce internal links in the draft
    const fixedDraft = ensureInternalLinks(result.draft, b.targetLinks || []);

    // ---- readability & words from the fixed draft
    const plain = stripMd(fixedDraft);
    const readability = fleschReadingEase(plain);
    const words = countWords(fixedDraft);

    // ---- commit plan usage: predicted then extra
    await assertWithinLimit({
      orgId,
      key: 'blogpilot_words',
      incBy: predictedWords,
      allowOverage: true,
      dryRun: false,
    });

    let overageUnits = 0;
    if (words > predictedWords) {
      const extra = words - predictedWords;
      const commit2 = await assertWithinLimit({
        orgId,
        key: 'blogpilot_words',
        incBy: extra,
        allowOverage: true,
        dryRun: false,
      });
      if (commit2.ok && commit2.overage && commit2.overUnits) {
        overageUnits = commit2.overUnits;
        // If you want to record a row now, import recordOverageRow and call it here.
      }
    }

    // ---- Stripe metering (by tokens) — safely gated
    const inTok = providerRaw?.usage?.prompt_tokens ?? 0;
    const outTok = providerRaw?.usage?.completion_tokens ?? 0;
    const totalTokens = Math.max(0, Math.floor(inTok + outTok));
    const billingEnabled =
      process.env.BILLING_STRIPE_ENABLED === 'true' ||
      (process.env.NODE_ENV === 'production' && !!process.env.STRIPE_SECRET_KEY);
    const subActive =
      !!(org as any)?.billing?.subscriptionStatus &&
      String((org as any).billing.subscriptionStatus).toLowerCase() === 'active';

    if (billingEnabled && subActive && totalTokens > 0) {
      try {
        await reportUsageForOrg(orgId, {
          tokens: totalTokens,
          sourceId: `blog_${String(me._id)}_${Date.now()}`,
        });
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Stripe usage reporting failed', e);
        }
      }
    }

    // ---- analytics event
    await track(orgId, String(me._id), {
      module: 'blogpilot',
      type: 'generation.completed',
      meta: { words, tokens: totalTokens, readability: readability.score }
    });

    // ---- JSON-LD (optional)
    const articleLD = buildArticleJSONLD({
      headline: result.meta.title,
      description: result.meta.description,
      url: b.url,
      keywords: toArray(b.keywords as any),
    });
    const faqLD = buildFAQJSONLD(result.faq);

    // ---- response (client can persist via /api/blogpilot/save)
    return NextResponse.json({
      ok: true,
      input: {
        keywords: toArray(b.keywords as any),
        url: b.url,
        tone: b.tone,
        wordCount: b.wordCount,
        targetLinks: b.targetLinks,
      },
      brief: result.brief,
      outline: result.outline,
      draft: fixedDraft, // << use enforced draft
      meta: result.meta,
      faq: result.faq,
      altText: result.altText,
      citations: result.citations || [],
      readability, // { score, grade }
      usage: {
        words,
        predictedWords,
        overageUnits,
        model: spec.model,
        tokens: totalTokens,
      },
      schema: {
        article: articleLD,
        faq: faqLD,
      },
    });
  } catch (err: any) {
    console.error('[blogpilot/generate] fatal:', err);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
