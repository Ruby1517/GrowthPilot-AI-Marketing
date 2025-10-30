// import Org from '@/models/Org';
// import Event from '@/models/Event';

// export async function getOrgAnalytics(orgId: string) {
//   const org = await Org.findById(orgId).lean();
//   const usage = org?.usage ?? {};
//   const kpi = org?.kpi ?? {};
//   const period = { start: org?.usagePeriodStart, end: org?.usagePeriodEnd, plan: org?.plan };

//   // Optional: recent 7d module breakdown
//   const since = new Date(Date.now() - 7*24*60*60*1000);
//   const recent = await Event.aggregate([
//     { $match: { orgId: org._id, at: { $gte: since } } },
//     { $group: { _id: { module: '$module', type: '$type' }, count: { $sum: 1 } } }
//   ]);

//   return { usage, kpi, period, recent };
// }


import { startOfMonth } from 'date-fns';
import Org from '@/models/Org';
import Event from '@/models/Event';

type Plan = 'Trial' | 'Starter' | 'Pro' | 'Business';

export async function getOrgAnalytics(orgId: string) {
  const org = await Org.findById(orgId).lean();
  if (!org) return { usage: {}, kpi: {}, period: { plan: 'Trial' as Plan } };

  const planStr = String((org as any).plan);
  const hasBilling = Boolean((org as any).billingCustomerId) || Boolean((org as any).subscription?.id);
  let plan: Plan = (['Trial','Starter','Pro','Business'] as const).includes(planStr as any)
    ? (planStr as Plan)
    : 'Trial';
  if (!hasBilling && plan !== 'Trial') plan = 'Trial';

  // MTD recent activity
  const since = startOfMonth(new Date());
  const recent = await Event.aggregate([
    { $match: { orgId: org._id, at: { $gte: since } } },
    { $group: { _id: { module: '$module', type: '$type' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 30 }
  ]);

  // LeadPilot intents (last 7 days)
  const intentSince = new Date(Date.now() - 7*24*60*60*1000);
  const leadpilotIntents = await Event.aggregate([
    { $match: { orgId: org._id, module: 'leadpilot', type: 'lead.intent', at: { $gte: intentSince } } },
    { $group: { _id: '$meta.intent', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // LeadPilot chats per day (7d)
  const leadpilotDaily = await Event.aggregate([
    { $match: { orgId: org._id, module: 'leadpilot', type: 'lead.intent', at: { $gte: intentSince } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  // Top terms from captured lead transcripts (last 7d)
  const Leads = (await import('mongoose')).default.connection.collection('leads');
  const leads = await Leads
    .find({ orgId: org._id, createdAt: { $gte: intentSince } }, { projection: { transcript: 1 } })
    .limit(300)
    .toArray();
  const STOP = new Set(['the','and','a','an','is','to','of','in','for','on','we','you','our','with','this','that','it','at','as','be','are','or','by','from','can','how','what','do','does','your','my','i']);
  const freq: Record<string, number> = {};
  for (const l of leads) {
    const msgs = Array.isArray((l as any).transcript) ? (l as any).transcript : [];
    for (const m of msgs) {
      if (!m || String(m.role) !== 'user') continue;
      const words = String(m.content || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w && w.length >= 3 && !STOP.has(w));
      for (const w of words) freq[w] = (freq[w] || 0) + 1;
    }
  }
  const leadpilotTopTerms = Object.entries(freq)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 5)
    .map(([term, count]) => ({ term, count }));

  // ---- Build simple 30d timeseries for overview charts
  const days = 30;
  const since30 = new Date(Date.now() - (days - 1) * 24*60*60*1000);
  const dateFmt = { $dateToString: { format: '%Y-%m-%d', date: '$at' } } as const;

  const contentAgg = await Event.aggregate([
    { $match: { orgId: org._id, at: { $gte: since30 }, type: 'generation.completed' } },
    { $group: { _id: dateFmt, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const trafficAgg = await Event.aggregate([
    { $match: { orgId: org._id, at: { $gte: since30 } } },
    { $group: { _id: dateFmt, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  function toSeries(agg: Array<{ _id: string; count: number }>) {
    const map = new Map<string, number>();
    for (const a of agg) map.set(a._id, a.count || 0);
    const out: number[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since30.getTime() + i * 24*60*60*1000);
      const key = d.toISOString().slice(0,10);
      out.push(map.get(key) || 0);
    }
    return out;
  }

  const contentDaily = toSeries(contentAgg as any);
  const trafficDaily = toSeries(trafficAgg as any);

  return {
    usage: org.usage || {},
    kpi: org.kpi || {},
    recent,
    leadpilotIntents,
    leadpilotDaily,
    leadpilotTopTerms,
    trends: {
      contentDaily,
      trafficDaily,
    },
    period: {
      start: since,
      end: new Date(),
      plan,
    },
  };
}
