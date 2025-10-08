// app/api/webhooks/stripe/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import { Overage } from '@/models/Overage';

// Canonicalize plan casing
function toPlan(v: any) {
  const s = String(v ?? '').toLowerCase();
  if (s === 'starter') return 'Starter';
  if (s === 'pro') return 'Pro';
  if (s === 'business') return 'Business';
  return 'Starter';
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return new Response('Missing webhook signature/secret', { status: 400 });
  }

  // IMPORTANT: use raw body for verification
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  await dbConnect();

  switch (event.type) {
    case 'checkout.session.completed': {
      // Set org plan after checkout
      const s = event.data.object as any;
      const orgId = s.client_reference_id || s.metadata?.orgId; // set this when creating session if you want
      const plan = toPlan(s.metadata?.plan);
      if (orgId && plan) {
        await Org.updateOne({ _id: orgId }, { $set: { plan } }, { runValidators: true });
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as any;
      const customerId = sub.customer;
      await Org.updateOne(
        { billingCustomerId: customerId },
        { $set: { subscription: { id: sub.id } } }
      );
      break;
    }

    case 'invoice.paid': {
      // Mark pending overage rows as invoiced with this invoice id
      const inv = event.data.object as any;
      const customerId = inv.customer;
      const org = await Org.findOne({ billingCustomerId: customerId }).lean();
      if (org) {
        const ids = (await Overage.find({ orgId: org._id, invoiced: false }, { _id: 1 }).lean())
          .map(x => x._id);
        if (ids.length) {
          await Overage.updateMany(
            { _id: { $in: ids } },
            { $set: { invoiced: true, invoiceId: inv.id } }
          );
        }
      }
      break;
    }

    // Add other events you care about…
    default:
      // no-op
      break;
  }

  return NextResponse.json({ received: true });
}
