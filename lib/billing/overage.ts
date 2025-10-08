
import Stripe from 'stripe';
import { Overage } from '@/models/Overage';
import Org from '@/models/Org';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function recordOverage(orgId: string, key: string, units: number, unitPrice: number) {
  await Overage.create({
    orgId, at: new Date(), key, units, unitPrice, amount: units * unitPrice, invoiced: false
  });
}

export async function invoicePendingOverages(orgId: string) {
  const org = await Org.findById(orgId).lean();
  if (!org?.billingCustomerId) return;

  const pending = await Overage.find({ orgId, invoiced: false }).lean();
  if (!pending.length) return;

  const total = pending.reduce((s, x) => s + x.amount, 0);
  const description = `Usage overages (${pending.length} items)`;

  const ii = await stripe.invoiceItems.create({
    customer: org.billingCustomerId,
    amount: Math.round(total * 100),
    currency: 'usd',
    description,
  });

  const invoice = await stripe.invoices.create({ customer: org.billingCustomerId, collection_method: 'charge_automatically' });
  await stripe.invoices.finalizeInvoice(invoice.id);

  await Overage.updateMany({ _id: { $in: pending.map(p => p._id) } }, { $set: { invoiced: true, invoiceId: invoice.id } });
}
