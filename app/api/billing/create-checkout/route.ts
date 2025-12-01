// app/api/billing/create-checkout/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import User from '@/models/User';
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe';

type Body =
  | { plan: 'starter' | 'pro' | 'business' }
  | { priceId: string } // direct price_... override
  | Record<string, never>;

function envOrNull(name: string) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

function toCanonicalPlan(v: any): 'Starter' | 'Pro' | 'Business' {
  const s = String(v ?? '').toLowerCase();
  if (s === 'starter') return 'Starter';
  if (s === 'pro') return 'Pro';
  if (s === 'business') return 'Business';
  return 'Starter';
}

async function ensurePriceExists(priceId: string): Promise<boolean> {
  try {
    if (!priceId?.startsWith('price_')) return false;
    const price = await stripe.prices.retrieve(priceId);
    return !!price?.id && price.active !== false;
  } catch {
    return false;
  }
}

async function resolveBasePriceId(body: any) {
  // 1) Explicit price from caller
  if (body?.priceId && await ensurePriceExists(body.priceId)) {
    return { priceId: body.priceId as string, canonicalPlan: null as null | 'Starter'|'Pro'|'Business' };
  }

  // 2) From plan -> env
  const canonicalPlan: 'Starter'|'Pro'|'Business' = toCanonicalPlan(body?.plan);
  const envPriceId =
    canonicalPlan === 'Pro'
      ? envOrNull('STRIPE_PRICE_PRO')
      : canonicalPlan === 'Business'
      ? envOrNull('STRIPE_PRICE_BUSINESS')
      : envOrNull('STRIPE_PRICE_STARTER');

  if (envPriceId && await ensurePriceExists(envPriceId)) {
    return { priceId: envPriceId, canonicalPlan };
  }

  // 3) From lookup_keys (recommended: starter_monthly/pro_monthly/business_monthly)
  try {
    const wanted = ['starter_monthly', 'pro_monthly', 'business_monthly'];
    const list = await stripe.prices.list({ active: true, lookup_keys: wanted, limit: 3 });
    const byKey = Object.fromEntries(list.data.map(p => [p.lookup_key!, p.id]));
    const key = (String(body?.plan ?? 'starter') + '_monthly') as keyof typeof byKey;
    const pid = byKey[key];
    if (pid && await ensurePriceExists(pid)) {
      return { priceId: pid, canonicalPlan };
    }
  } catch { /* continue to scan */ }

  // 4) Last resort: scan for monthly licensed by product name fragment
  const scan = await stripe.prices.list({ active: true, limit: 50, expand: ['data.product'] });
  const frag = String(body?.plan ?? 'starter').toLowerCase();
  const match = scan.data.find(p =>
    p.recurring?.interval === 'month' &&
    p.recurring?.usage_type === 'licensed' &&
    (() => {
      if (typeof p.product === 'string') return false;
      const name = (p.product as any)?.name || '';
      return name.toLowerCase().includes(frag);
    })()
  );
  if (match && await ensurePriceExists(match.id)) {
    return { priceId: match.id, canonicalPlan };
  }

  return { priceId: null as string | null, canonicalPlan };
}

async function resolveMeteredPrices() {
  let tokensPriceId = envOrNull('STRIPE_PRICE_TOKENS');
  let minutesPriceId = envOrNull('STRIPE_PRICE_MINUTES');

  // If envs are missing or invalid, scan
  if (!(tokensPriceId && await ensurePriceExists(tokensPriceId)) ||
      !(minutesPriceId && await ensurePriceExists(minutesPriceId))) {
    const list = await stripe.prices.list({ active: true, limit: 50, expand: ['data.product'] });
    tokensPriceId = '';
    minutesPriceId = '';
    for (const p of list.data) {
      if (p.recurring?.usage_type !== 'metered') continue;
      const productName = typeof p.product === 'string' ? '' : ((p.product as any)?.name || '');
      const label =
        p.nickname?.toLowerCase() ||
        productName.toLowerCase();
      const divideBy = p.transform_quantity?.divide_by;

      // Heuristic: tokens often have divide_by=1000 or say "token"
      if (!tokensPriceId && (label.includes('token') || divideBy === 1000)) tokensPriceId = p.id;
      else if (!minutesPriceId && label.includes('minute')) minutesPriceId = p.id;

      if (tokensPriceId && minutesPriceId) break;
    }
  }

  // Final validation
  if (!(tokensPriceId && await ensurePriceExists(tokensPriceId)) ||
      !(minutesPriceId && await ensurePriceExists(minutesPriceId))) {
    throw new Error('Could not resolve active metered prices (tokens/minutes) for this Stripe key/mode.');
  }

  return { tokensPriceId, minutesPriceId };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  await dbConnect();
  const body = (await req.json().catch(() => ({}))) as Body;

  // Load user and resolve/create org
  const me = await User.findOne({ email: session.user.email });
  if (!me) return new Response('Unauthorized', { status: 401 });

  let org = (me as any).orgId ? await Org.findById((me as any).orgId) : null;
  if (!org) {
    org = await Org.create({
      name: (me as any).name || 'My Organization',
      // New orgs start on Trial; plan upgrades happen after successful checkout/webhook
      plan: 'Trial',
      members: [{ userId: me._id, role: 'owner', joinedAt: new Date() }],
      usage: {},
      kpi: {},
    });
    await User.updateOne({ _id: me._id }, { $set: { orgId: org._id } });
  }

  // Resolve base plan price id (validated) + canonical plan for metadata
  const { priceId: planPriceId, canonicalPlan } = await resolveBasePriceId(body);
  if (!planPriceId) {
    return new Response(
      'Could not resolve a valid base plan price for this Stripe account/mode. Check env STRIPE_PRICE_* or set lookup_keys.',
      { status: 400 }
    );
  }

  // Resolve metered prices (validated)
  let tokensPriceId: string, minutesPriceId: string;
  try {
    ({ tokensPriceId, minutesPriceId } = await resolveMeteredPrices());
  } catch (e: any) {
    return new Response(e?.message || 'Missing metered prices', { status: 500 });
  }

  // Stripe customer by org
  const customerId = await getOrCreateStripeCustomer(String(org._id), session.user.email!);

  // Create Checkout Session
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=1`,
      cancel_url: `${process.env.NEXTAUTH_URL}/billing?canceled=1`,
      line_items: [
        { price: planPriceId, quantity: 1 }, // licensed base plan
        { price: tokensPriceId },            // metered — omit quantity
        { price: minutesPriceId },           // metered — omit quantity
      ],
      allow_promotion_codes: true,
      // Pass plan info through for your webhook to set org.plan after activation
      metadata: canonicalPlan ? { plan: canonicalPlan } : undefined,
      subscription_data: {
        metadata: canonicalPlan ? { plan: canonicalPlan } : undefined,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err: any) {
    console.error('[create-checkout] error', err);
    const msg = err?.message || 'Stripe error';
    return new Response(`Checkout failed: ${msg}`, { status: 500 });
  }
}
