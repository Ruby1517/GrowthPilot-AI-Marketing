import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import { getOrgAnalytics } from './load';
import Recent from './Recent';
import AnalyticsCards from './AnalyticsCards';
import LeadIntent from './LeadIntent';
import LeadDaily from './LeadDaily';
import SeedPricingButton from './seed-pricing-button';

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.email) return <div className="p-6">Please sign in.</div>;

  await dbConnect();
  const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean();
  if (!me) return <div className="p-6">User not found.</div>;

  const org = me.orgId ? await Org.findById(me.orgId).lean() : null;
  if (!org) return <div className="p-6">Org not found.</div>;

  const data = await getOrgAnalytics(String(org._id));
  const isAdmin = ['admin','owner'].includes(String((me as any).role || ''));

  return (
    <section className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      {isAdmin && <SeedPricingButton visible />}
      {/* Meters/KPIs */}
      <AnalyticsCards initial={data} />
      {/* Recent activity (7 days) */}
      <Recent recent={data.recent} />
      {/* LeadPilot intents breakdown */}
      <LeadIntent data={(data as any).leadpilotIntents?.map((x:any)=>({ _id: x._id, count: x.count }))} />
      {/* LeadPilot chats per day */}
      <LeadDaily data={(data as any).leadpilotDaily?.map((x:any)=>({ _id: x._id, count: x.count }))} />
    </section>
  );
}
export const dynamic = 'force-dynamic';
