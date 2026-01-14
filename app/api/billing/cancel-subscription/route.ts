export const runtime = 'nodejs';

import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import User from '@/models/User';
import { stripe } from '@/lib/stripe';

const ACTIVE_STATUSES = new Set(['trialing', 'active', 'past_due', 'unpaid']);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  await dbConnect();
  const me = await User.findOne({ email: session.user.email }).lean<{ _id: unknown; orgId?: unknown }>();
  if (!me?.orgId) return new Response('Org not found', { status: 404 });

  const org = await Org.findById(me.orgId);
  if (!org) return new Response('Org not found', { status: 404 });

  const myRole = org.members?.find((m: any) => String(m.userId) === String(me._id))?.role || 'member';
  if (!['owner', 'admin'].includes(myRole)) return new Response('Forbidden', { status: 403 });

  let subId = org.subscription?.id || null;
  if (!subId && org.billingCustomerId) {
    const subs = await stripe.subscriptions.list({
      customer: org.billingCustomerId,
      status: 'all',
      limit: 10,
    });
    const active = subs.data.find((s) => ACTIVE_STATUSES.has(s.status));
    if (active?.id) {
      subId = active.id;
      if (!org.subscription?.id) {
        org.subscription = { id: active.id };
        await org.save();
      }
    }
  }

  if (!subId) return new Response('No active subscription', { status: 400 });

  const body = await req.json().catch(() => ({}));
  const immediate = Boolean(body?.immediate);

  const sub = immediate
    ? await stripe.subscriptions.cancel(subId)
    : await stripe.subscriptions.update(subId, { cancel_at_period_end: true });

  if (immediate) {
    await Org.updateOne(
      { _id: org._id },
      { $set: { subscription: null, plan: 'Trial', stripeTokensItemId: null, stripeMinutesItemId: null } }
    );
  }

  return Response.json({
    ok: true,
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
  });
}
