import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import { getOrgAnalytics } from './load';
import Recent from './Recent';
import AnalyticsCards from './AnalyticsCards';
import LeadIntent from './LeadIntent';
import LeadDaily from './LeadDaily';
import SeedPricingButton from './seed-pricing-button';
import UserAnalytics from './UserAnalytics';
import type { Plan } from '@/lib/modules';
import { moduleLabels } from '@/lib/modules';
import mongoose from 'mongoose';

type Search = { searchParams?: Record<string, string | string[] | undefined> };

export default async function AnalyticsPage({ searchParams }: Search) {
  const session = await auth();
  if (!session?.user?.email) return <div className="p-6">Please sign in.</div>;

  await dbConnect();
  const me = await (await import('@/models/User')).default.findOne({ email: session.user.email }).lean<{ _id: mongoose.Types.ObjectId; orgId?: mongoose.Types.ObjectId; role?: string }>();
  if (!me) return <div className="p-6">User not found.</div>;

  const role = String((me as any).role || 'member');
  const isAdmin = ['admin','owner'].includes(role);

  const requestedOrgIdRaw = searchParams?.orgId;
  const requestedOrgId = typeof requestedOrgIdRaw === 'string' ? requestedOrgIdRaw : Array.isArray(requestedOrgIdRaw) ? requestedOrgIdRaw[0] : undefined;

  const myOrg = me.orgId ? await Org.findById(me.orgId).lean<{ _id: mongoose.Types.ObjectId; name?: string; plan?: string; members?: any[] }>() : null;
  if (!myOrg) return <div className="p-6">Org not found.</div>;

  let targetOrg = myOrg;
  if (requestedOrgId && isAdmin && String(requestedOrgId) !== String(myOrg._id)) {
    const other = await Org.findById(requestedOrgId).lean<{ _id: mongoose.Types.ObjectId; name?: string; plan?: string; members?: any[] }>();
    if (other) targetOrg = other;
  } else if (requestedOrgId && !isAdmin && String(requestedOrgId) !== String(myOrg._id)) {
    return <div className="p-6">Unauthorized for this org.</div>;
  }

  const data = await getOrgAnalytics(String(targetOrg._id));
  const plan = String((targetOrg as any).plan || 'Trial') as Plan;
  const periodStart = (data as any)?.period?.start ? new Date((data as any).period.start) : null;
  const periodEnd = (data as any)?.period?.end ? new Date((data as any).period.end) : null;
  const fmt = (d: Date | null) => d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-';
  const postpilotInferred = Boolean((data as any)?.postpilotInferred);

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
              {isAdmin && targetOrg?._id && (
                <span className="ml-3 text-xs text-brand-muted">
                  Org: <b>{targetOrg.name}</b>
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-brand-muted">
              {Object.values(moduleLabels).map((label) => (
                <span key={label} className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5">
                  {label}
                </span>
              ))}
            </div>
          </div>
          {isAdmin && <SeedPricingButton visible />}
        </div>
      </div>

      {isAdmin && postpilotInferred && (
        <div className="card p-4 text-sm bg-amber-50/20 border border-amber-200/60 text-amber-900 dark:text-amber-100 dark:border-amber-500/60">
          PostPilot usage was inferred from saved posts because no meter data was found for this org. The counts shown below reflect stored posts, not Stripe metering.
        </div>
      )}

      {/* Admins see org-wide analytics; members see personal usage view */}
      {isAdmin ? (
        <div className="space-y-6">
          <AnalyticsCards initial={data} />
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
          <Recent recent={data.recent || []} />
        </div>
      ) : (
        <div className="space-y-6">
          <UserAnalytics initial={data} plan={plan} role={role} />
          <Recent recent={data.recent || []} />
        </div>
      )}
    </section>
  );
}
export const dynamic = 'force-dynamic';
