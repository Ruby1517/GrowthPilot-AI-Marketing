// /lib/track.ts
import Event from '@/models/Event';
import Org from '@/models/Org';

export async function track(
  orgId: string,
  userId: string,
  payload: {
    module: Event['module'];
    type: Event['type'];
    meta?: Record<string, any>;
  }
) {
  const at = new Date();
  await Event.create({ orgId, userId, at, ...payload });

  // Lightweight realtime aggregation to Org doc (low contention fields)
  const inc: any = {};
  if (payload.type === 'generation.completed') {
    inc['kpi.contentsProduced'] = 1;
  }
  if (payload.type === 'lead.captured') {
    inc['kpi.leadsCaptured'] = 1;
  }
  if (payload.type === 'ad.variant_created') {
    inc['kpi.adVariants'] = 1;
  }
  if (payload.type === 'email.drafted') {
    inc['kpi.emailsDrafted'] = 1;
  }
  if (payload.type === 'watchtime.added' && payload.meta?.minutes) {
    inc['kpi.watchTimeMinutes'] = payload.meta.minutes;
  }
  if (Object.keys(inc).length) {
    await Org.updateOne({ _id: orgId }, { $inc: inc });
  }
}
