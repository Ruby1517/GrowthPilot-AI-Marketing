import { dbConnect } from '@/lib/db';
import Event from '@/models/Event';

export async function trackEvent(opts: {
  orgId: string;
  userId?: string;
  module: string;         // 'postpilot' | 'blogpilot' | ...
  type: string;           // 'generation.completed' | ...
  meta?: Record<string, any>;
}) {
  await dbConnect();
  await Event.create({
    orgId: opts.orgId,
    userId: opts.userId,
    module: opts.module,
    type: opts.type,
    at: new Date(),
    meta: opts.meta ?? {},
  });
}
