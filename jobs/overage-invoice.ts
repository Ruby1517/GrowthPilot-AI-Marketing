// jobs/overage-invoice.ts
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import { Overage } from '@/models/Overage';
import { stripe } from '@/lib/stripe';

/** Create a single invoice item for all pending overages for an org, then finalize invoice */
export async function invoiceOveragesForOrg(orgId: string) {
  await dbConnect();
  const org = await Org.findById(orgId).lean();
  if (!org?.billingCustomerId) return { ok: false, reason: 'no_customer' };

  const rows = await Overage.find({ orgId: org._id, invoiced: false }).lean();
  if (!rows.length) return { ok: true, created: false };

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
  if (total <= 0) return { ok: true, created: false };

  // create a single invoice item (one line) or many—here we make one “Overage charges”
  await stripe.invoiceItems.create({
    customer: org.billingCustomerId,
    amount: Math.round(total * 100), // USD cents if your unitPrice/amount are USD
    currency: 'usd',
    description: 'Overage charges',
  });

  const invoice = await stripe.invoices.create({
    customer: org.billingCustomerId,
    auto_advance: true,
    collection_method: 'charge_automatically',
  });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

  // mark rows invoiced
  await Overage.updateMany(
    { _id: { $in: rows.map(r => r._id) } },
    { $set: { invoiced: true, invoiceId: finalized.id } }
  );

  return { ok: true, created: true, invoiceId: finalized.id, total };
}
