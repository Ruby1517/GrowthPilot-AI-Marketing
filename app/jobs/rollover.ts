// /jobs/rollover.ts
import Org from '@/models/Org';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';

export async function rolloverOrgs() {
  const now = new Date();
  const due = await Org.find({ usagePeriodEnd: { $lt: now } });
  for (const org of due) {
    // snapshot logic (omitted for brevity), then reset
    const nextStart = startOfMonth(addMonths(now, 0));
    const nextEnd = endOfMonth(nextStart);
    await Org.updateOne(
      { _id: org._id },
      { 
        $set: { usage: {}, usagePeriodStart: nextStart, usagePeriodEnd: nextEnd }
      }
    );
  }
}
