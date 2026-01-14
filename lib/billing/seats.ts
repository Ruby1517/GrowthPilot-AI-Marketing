import { stripe } from '@/lib/stripe';
import Org from '@/models/Org';

type OrgLike = {
  _id: unknown;
  subscription?: { id?: string } | null;
  billingCustomerId?: string | null;
  stripePlanItemId?: string | null;
  members?: Array<{ userId: unknown; role?: string }>;
};

export async function syncSeatQuantity(org: OrgLike) {
  const desired = Math.max(1, Number(org.members?.length || 1));
  let subId = org.subscription?.id || null;

  if (!subId && org.billingCustomerId) {
    const subs = await stripe.subscriptions.list({
      customer: org.billingCustomerId,
      status: 'active',
      limit: 1,
    });
    subId = subs.data[0]?.id || null;
  }
  if (!subId) return { ok: false, reason: 'no_subscription' };

  const sub = await stripe.subscriptions.retrieve(subId, {
    expand: ['items.data.price'],
  });
  const planItem =
    (org.stripePlanItemId && sub.items.data.find((i) => i.id === org.stripePlanItemId)) ||
    sub.items.data.find((i) => i.price?.recurring?.usage_type === 'licensed');

  if (!planItem) return { ok: false, reason: 'no_plan_item' };

  await stripe.subscriptionItems.update(planItem.id, {
    quantity: desired,
    proration_behavior: 'create_prorations',
  });

  if (!org.stripePlanItemId || org.stripePlanItemId !== planItem.id || !org.subscription?.id) {
    await Org.updateOne(
      { _id: org._id },
      { $set: { stripePlanItemId: planItem.id, subscription: { id: subId } } }
    );
  }

  return { ok: true, quantity: desired };
}
