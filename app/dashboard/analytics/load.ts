import Org from '@/models/Org';
import Event from '@/models/Event';

export async function getOrgAnalytics(orgId: string) {
  const org = await Org.findById(orgId).lean();
  const usage = org?.usage ?? {};
  const kpi = org?.kpi ?? {};
  const period = { start: org?.usagePeriodStart, end: org?.usagePeriodEnd, plan: org?.plan };

  // Optional: recent 7d module breakdown
  const since = new Date(Date.now() - 7*24*60*60*1000);
  const recent = await Event.aggregate([
    { $match: { orgId: org._id, at: { $gte: since } } },
    { $group: { _id: { module: '$module', type: '$type' }, count: { $sum: 1 } } }
  ]);

  return { usage, kpi, period, recent };
}
