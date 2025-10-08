import { dbConnect } from '@/lib/db';
import { Overage } from '@/models/Overage';
import { OVERAGE_PRICING } from '@/lib/limits';

export async function recordOverageRow(opts: {
  orgId: string;
  key: keyof typeof OVERAGE_PRICING;
  overUnits: number;
  eventId?: string;
}) {
  if (!opts.overUnits || opts.overUnits <= 0) return;
  await dbConnect();
  const unitPrice = OVERAGE_PRICING[opts.key];
  const amount = unitPrice * opts.overUnits;
  await Overage.create({
    orgId: opts.orgId,
    at: new Date(),
    key: opts.key,
    units: opts.overUnits,
    unitPrice,
    amount,
    eventId: opts.eventId,
    invoiced: false,
  });
}
