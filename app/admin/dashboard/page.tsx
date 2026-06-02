export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import User from '@/models/User';
import Event from '@/models/Event';
import { PLAN_LIMITS, type MeterKey } from '@/lib/limits';
import type { Plan } from '@/lib/modules';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

type OrgRow = {
  id: string; name: string; plan: Plan;
  overageEnabled: boolean; billingCustomerId?: string | null;
  memberCount: number; usage: Partial<Record<MeterKey, number>>;
};
type UserRow = {
  id: string; name?: string | null; email?: string | null; role: string; orgName?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(plan: Plan, usage: Partial<Record<MeterKey, number>>, key: MeterKey) {
  const used  = Number(usage?.[key] ?? 0);
  const limit = Number(PLAN_LIMITS[plan]?.[key] ?? 0);
  return { used, limit, pct: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0 };
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

const PLAN_PRICES: Record<Plan, number> = { Trial: 0, Starter: 49, Pro: 149, Business: 399 };
const PLAN_COLOR: Record<Plan, string> = {
  Trial: 'bg-white/10 text-white/60',
  Starter: 'bg-sky-500/15 text-sky-400',
  Pro: 'bg-[color:var(--gold)]/15 text-[color:var(--gold)]',
  Business: 'bg-violet-500/15 text-violet-400',
};

// ── Components ────────────────────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5 space-y-1">
      <div className="text-xs text-brand-muted uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-semibold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div className="text-xs text-brand-muted">{sub}</div>}
    </div>
  );
}

function MiniBar({ used, limit, pct: p }: { used: number; limit: number; pct: number }) {
  const color = p >= 90 ? 'bg-rose-500' : p >= 70 ? 'bg-amber-400' : 'bg-[color:var(--gold)]';
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] text-brand-muted">{fmt(used)}/{fmt(limit)}</div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden w-16">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user?.email) return <div className="p-6">Please sign in.</div>;

  await dbConnect();
  const me = await User.findOne({ email: session.user.email }).lean();
  const myRole = String((me as any)?.role || '');
  if (myRole !== 'superadmin') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
        <div className="text-3xl">🔒</div>
        <div className="font-semibold">Admin access required</div>
        <p className="text-sm text-brand-muted">This page is for admins and owners only.</p>
        <Link href="/dashboard" className="btn-ghost text-sm">← Back to dashboard</Link>
      </div>
    );
  }

  // Fetch all data in parallel
  const since7  = new Date(Date.now() - 7  * 86400_000);
  const since30 = new Date(Date.now() - 30 * 86400_000);

  const [orgDocs, userDocs, logins7, logins30, recentEvents] = await Promise.all([
    Org.find({}, { name:1, plan:1, overageEnabled:1, billingCustomerId:1, subscription:1, members:1, usage:1 }).lean(),
    User.find({}, { name:1, email:1, role:1, orgId:1 }).lean(),
    Event.countDocuments({ type: 'auth.login', at: { $gte: since7 } }),
    Event.countDocuments({ type: 'auth.login', at: { $gte: since30 } }),
    Event.find({ type: { $ne: 'auth.login' } }).sort({ at: -1 }).limit(10).lean(),
  ]);

  const orgs: OrgRow[] = orgDocs.map((o: any) => ({
    id: String(o._id), name: o.name || 'Unnamed',
    plan: (o.plan as Plan) || 'Trial',
    overageEnabled: !!o.overageEnabled,
    billingCustomerId: o.billingCustomerId || o.subscription?.id || null,
    memberCount: Array.isArray(o.members) ? o.members.length : 0,
    usage: (o.usage as any) || {},
  }));

  const orgMap = new Map(orgs.map(o => [o.id, o]));

  const users: UserRow[] = (userDocs as any[]).map(u => ({
    id: String(u._id), name: u.name, email: u.email, role: u.role || 'member',
    orgName: orgMap.get(String(u.orgId))?.name,
  }));

  // Metrics
  const planDist = orgs.reduce((acc, o) => { acc[o.plan] = (acc[o.plan] || 0) + 1; return acc; }, {} as Record<string, number>);
  const mrr = orgs.reduce((s, o) => s + (PLAN_PRICES[o.plan] || 0), 0);
  const paidOrgs = orgs.filter(o => o.plan !== 'Trial').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-brand-muted text-sm mt-1">Platform overview — all orgs, users, and usage</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/analytics" className="btn-ghost text-sm">Analytics</Link>
          <Link href="/admin/queues" className="btn-ghost text-sm">Queue status</Link>
        </div>
      </div>

      {/* ── Top metrics ── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Stat label="Total orgs"      value={orgs.length}   sub={`${paidOrgs} paying`} />
        <Stat label="Total users"     value={users.length} />
        <Stat label="Est. MRR"        value={`$${mrr.toLocaleString()}`} sub="based on plan prices" />
        <Stat label="Logins (7d)"     value={logins7} sub={`${logins30} last 30d`} />
      </div>

      {/* ── Plan distribution ── */}
      <div className="card p-5 space-y-4">
        <div className="font-semibold">Plan distribution</div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {(['Trial','Starter','Pro','Business'] as Plan[]).map(p => {
            const count = planDist[p] || 0;
            const share = orgs.length > 0 ? Math.round((count / orgs.length) * 100) : 0;
            return (
              <div key={p} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full inline-block ${PLAN_COLOR[p]}`}>{p}</div>
                <div className="text-2xl font-semibold">{count}</div>
                <div className="text-xs text-brand-muted">{share}% of orgs</div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-[color:var(--gold)]" style={{ width: `${share}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Orgs & usage table ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="font-semibold">Organizations</div>
          <span className="text-xs text-brand-muted">{orgs.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 text-xs text-brand-muted">
                <th className="px-5 py-3 text-left">Org</th>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-left">Members</th>
                <th className="px-5 py-3 text-left">Billing</th>
                <th className="px-4 py-3 text-left">Posts</th>
                <th className="px-4 py-3 text-left">Words</th>
                <th className="px-4 py-3 text-left">Ads</th>
                <th className="px-4 py-3 text-left">Emails</th>
                <th className="px-4 py-3 text-left">Leads</th>
                <th className="px-5 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o, i) => {
                const pp = pct(o.plan, o.usage, 'postpilot_generated');
                const bp = pct(o.plan, o.usage, 'blogpilot_words');
                const ad = pct(o.plan, o.usage, 'adpilot_variants');
                const ml = pct(o.plan, o.usage, 'mailpilot_emails');
                const lp = pct(o.plan, o.usage, 'leadpilot_convos');
                return (
                  <tr key={o.id} className={`border-b border-white/8 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="px-5 py-3 font-medium">{o.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${PLAN_COLOR[o.plan]}`}>{o.plan}</span>
                        {o.overageEnabled && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-brand-muted">+OVR</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{o.memberCount}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs ${o.billingCustomerId ? 'text-emerald-400' : 'text-brand-muted'}`}>
                        {o.billingCustomerId ? '● Active' : '○ None'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><MiniBar {...pp} /></td>
                    <td className="px-4 py-3"><MiniBar {...bp} /></td>
                    <td className="px-4 py-3"><MiniBar {...ad} /></td>
                    <td className="px-4 py-3"><MiniBar {...ml} /></td>
                    <td className="px-4 py-3"><MiniBar {...lp} /></td>
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/analytics?orgId=${o.id}`}
                        className="text-xs text-brand-muted hover:text-white transition whitespace-nowrap">
                        Analytics →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Users table ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="font-semibold">Users</div>
          <span className="text-xs text-brand-muted">{users.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10 text-xs text-brand-muted">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Org</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-white/8 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                  <td className="px-5 py-3 font-medium">{u.name || '—'}</td>
                  <td className="px-5 py-3 text-brand-muted">{u.email || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      u.role === 'superadmin' ? 'bg-rose-500/15 text-rose-400' :
                                              'bg-white/8 text-brand-muted'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3 text-brand-muted">{u.orgName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent events ── */}
      {recentEvents.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 font-semibold">Recent activity</div>
          <div className="divide-y divide-white/8">
            {(recentEvents as any[]).map((e, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-brand-muted capitalize flex-shrink-0">
                    {String(e.module || 'system')}
                  </span>
                  <span className="text-brand-muted truncate">{String(e.type || '').replace(/_/g, ' ')}</span>
                </div>
                <span className="text-xs text-brand-muted flex-shrink-0">
                  {new Date(e.at || e.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
