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
  const plan = String((org as any).plan || 'Trial');
  const periodStart = (data as any)?.period?.start ? new Date((data as any).period.start) : null;
  const periodEnd = (data as any)?.period?.end ? new Date((data as any).period.end) : null;
  const fmt = (d: Date | null) => d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-';

  return (
    <section className="p-6 space-y-6">
      {/* Overview header */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Analytics</h1>
              <span className="badge capitalize">{plan}</span>
            </div>
            <div className="mt-1 text-sm dark:text-brand-muted text-black/70">
              Period: <b>{fmt(periodStart)}</b> – <b>{fmt(periodEnd)}</b>
            </div>
          </div>
          {isAdmin && <SeedPricingButton visible />}
        </div>
      </div>

      {/* Layout: metrics left, insights right */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <AnalyticsCards initial={data} />
          <Recent recent={data.recent} />
          {/* Simple trends (preview) */}
          {/* Trends removed per request */}
        </div>
        <div className="space-y-6">
          {plan !== 'Trial' ? (
            <>
              <LeadIntent data={(data as any).leadpilotIntents?.map((x:any)=>({ _id: x._id, count: x.count }))} />
              <LeadDaily data={(data as any).leadpilotDaily?.map((x:any)=>({ _id: x._id, count: x.count }))} />
            </>
          ) : (
            <div className="card p-4 text-sm dark:text-brand-muted text-black/70">
              Unlock LeadPilot insights with <b>Pro</b> or <b>Business</b>.
              <div className="mt-3"><a href="/billing" className="btn-ghost">View Plans</a></div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
export const dynamic = 'force-dynamic';
