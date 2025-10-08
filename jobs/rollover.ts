import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import { startOfMonth, endOfMonth, isBefore } from 'date-fns';

export async function rolloverOrgs() {
  await dbConnect();
  const now = new Date();
  const due = await Org.find({
    $or: [
      { usagePeriodEnd: { $exists: false } },
      { usagePeriodEnd: { $lt: now } }
    ]
  }).lean();

  for (const org of due) {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    await Org.updateOne(
      { _id: org._id },
      {
        $set: {
          usage: {},
          usagePeriodStart: start,
          usagePeriodEnd: end
        }
      }
    );
  }

  return { processed: due.length };
}
