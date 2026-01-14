export const runtime = 'nodejs';

import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import User from '@/models/User';
import { stripe } from '@/lib/stripe';
import { syncSeatQuantity } from '@/lib/billing/seats';

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  await dbConnect();
  const me = await User.findOne({ email: session.user.email });
  if (!me?.orgId) return new Response('Org not found', { status: 404 });

  const org = await Org.findById(me.orgId);
  if (!org) return new Response('Org not found', { status: 404 });

  const meId = String(me._id);
  const members = org.members || [];
  const meMember = members.find((m: any) => String(m.userId) === meId);
  if (!meMember) return new Response('Forbidden', { status: 403 });

  const remaining = members.filter((m: any) => String(m.userId) !== meId);
  if (meMember.role === 'owner' && remaining.length > 0) {
    const nextOwner =
      remaining.find((m: any) => m.role === 'admin') ||
      remaining[0];
    if (nextOwner) {
      const idx = org.members.findIndex((m: any) => String(m.userId) === String(nextOwner.userId));
      if (idx >= 0) org.members[idx].role = 'owner';
    }
  }

  org.members = remaining as any;
  await org.save();
  await User.updateOne({ _id: me._id }, { $set: { orgId: null } });

  if (remaining.length === 0) {
    const subId = org.subscription?.id;
    if (subId) {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    }
    return Response.json({ ok: true, canceledOrg: true });
  }

  await syncSeatQuantity(org);
  return Response.json({ ok: true, canceledOrg: false, remainingSeats: remaining.length });
}
