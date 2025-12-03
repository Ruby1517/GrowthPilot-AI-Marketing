export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';
import User from '@/models/User';
import { PLAN_LIMITS, type MeterKey } from '@/lib/limits';
import type { Plan } from '@/lib/modules';
import Link from 'next/link';
import React from 'react';

type OrgRow = {
  id: string;
  name: string;
  plan: Plan;
  overageEnabled: boolean;
  billingCustomerId?: string | null;
  memberCount: number;
  usage: Partial<Record<MeterKey, number>>;
};

type UserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  orgId?: string | null;
};

function usagePercent(plan: Plan, usage: Partial<Record<MeterKey, number>>, key: MeterKey) {
  const used = Number(usage?.[key] ?? 0);
  const limit = Number(PLAN_LIMITS[plan]?.[key] ?? 0);
  if (!limit) return { used, limit, pct: 0 };
  return { used, limit, pct: Math.min(100, Math.round((used / limit) * 100)) };
}

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user?.email) return <div className="p-6">Please sign in.</div>;

  await dbConnect();
  const me = await User.findOne({ email: session.user.email }).lean();
  const myRole = String((me as any)?.role || '');
  if (!['admin', 'owner'].includes(myRole)) {
    return <div className="p-6">Admins only.</div>;
  }

  const orgDocs = await Org.find({}, { name: 1, plan: 1, overageEnabled: 1, billingCustomerId: 1, subscription: 1, members: 1, usage: 1 }).lean();
  const orgs: OrgRow[] = orgDocs.map((o: any) => ({
    id: String(o._id),
    name: o.name || 'Org',
    plan: (o.plan as Plan) || 'Trial',
    overageEnabled: !!o.overageEnabled,
    billingCustomerId: o.billingCustomerId || o.subscription?.id || null,
    memberCount: Array.isArray(o.members) ? o.members.length : 0,
    usage: (o.usage as any) || {},
  }));

  const users: UserRow[] = (await User.find({}, { name: 1, email: 1, role: 1, orgId: 1 }).lean()).map((u: any) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role || 'member',
    orgId: u.orgId ? String(u.orgId) : null,
  }));

  return (
    <section className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <div className="text-sm text-brand-muted">Org + user overview with usage vs limits across all modules.</div>
        </div>
        <Link href="/dashboard/analytics" className="btn-ghost">Org Analytics</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total orgs" value={orgs.length} />
        <StatCard label="Total users" value={users.length} />
        <StatCard label="Overages enabled" value={orgs.filter(o => o.overageEnabled).length} />
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-brand-muted">Organizations</div>
            <div className="text-lg font-semibold">Plans & Usage</div>
          </div>
          <Link href="/billing" className="btn-ghost text-sm">Billing</Link>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-brand-muted">
              <tr>
                <th className="py-2 pr-4">Org</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Members</th>
                <th className="py-2 pr-4">Billing</th>
                <th className="py-2 pr-4">PostPilot</th>
                <th className="py-2 pr-4">BlogPilot</th>
                <th className="py-2 pr-4">AdPilot</th>
                <th className="py-2 pr-4">MailPilot</th>
                <th className="py-2 pr-4">ClipPilot</th>
                <th className="py-2 pr-4">LeadPilot</th>
                <th className="py-2 pr-4">BrandPilot</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const pp = usagePercent(o.plan, o.usage, 'postpilot_generated');
                const bp = usagePercent(o.plan, o.usage, 'blogpilot_words');
                const ad = usagePercent(o.plan, o.usage, 'adpilot_variants');
                const ml = usagePercent(o.plan, o.usage, 'mailpilot_emails');
                const cp = usagePercent(o.plan, o.usage, 'clippilot_exports' as MeterKey);
                const lp = usagePercent(o.plan, o.usage, 'leadpilot_convos');
                const br = usagePercent(o.plan, o.usage, 'brandpilot_assets');
                return (
                  <tr key={o.id} className="border-t border-white/10">
                    <td className="py-2 pr-4">{o.name}</td>
                    <td className="py-2 pr-4">
                      <span className="badge capitalize">{o.plan}</span>
                      {o.overageEnabled && <span className="badge ml-1">Overage</span>}
                    </td>
                    <td className="py-2 pr-4">{o.memberCount}</td>
                    <td className="py-2 pr-4">{o.billingCustomerId ? 'Active' : 'None'}</td>
                    <td className="py-2 pr-4">{pp.used}/{pp.limit} ({pp.pct}%)</td>
                    <td className="py-2 pr-4">{bp.used}/{bp.limit} ({bp.pct}%)</td>
                    <td className="py-2 pr-4">{ad.used}/{ad.limit} ({ad.pct}%)</td>
                    <td className="py-2 pr-4">{ml.used}/{ml.limit} ({ml.pct}%)</td>
                    <td className="py-2 pr-4">{cp.used}/{cp.limit} ({cp.pct}%)</td>
                    <td className="py-2 pr-4">{lp.used}/{lp.limit} ({lp.pct}%)</td>
                    <td className="py-2 pr-4">{br.used}/{br.limit} ({br.pct}%)</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-brand-muted">Org Analytics</div>
            <div className="text-lg font-semibold">Usage vs limits</div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {orgs.map((o) => (
            <div key={o.id} className="border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">{o.name}</div>
                  <div className="text-xs text-brand-muted capitalize">{o.plan} • Members {o.memberCount}</div>
                </div>
                <div className="flex gap-2">
                  <Link href="/billing" className="btn-ghost text-xs">Manage</Link>
                  <Link href={`/dashboard/analytics?orgId=${o.id}`} className="btn-ghost text-xs">Org Analytics</Link>
                </div>
              </div>
              <UsageBar label="PostPilot" {...usagePercent(o.plan, o.usage, 'postpilot_generated')} />
              <UsageBar label="BlogPilot" {...usagePercent(o.plan, o.usage, 'blogpilot_words')} />
              <UsageBar label="AdPilot" {...usagePercent(o.plan, o.usage, 'adpilot_variants')} />
              <UsageBar label="MailPilot" {...usagePercent(o.plan, o.usage, 'mailpilot_emails')} />
              <UsageBar label="ClipPilot" {...usagePercent(o.plan, o.usage, 'clippilot_exports' as MeterKey)} />
              <UsageBar label="LeadPilot" {...usagePercent(o.plan, o.usage, 'leadpilot_convos')} />
              <UsageBar label="BrandPilot" {...usagePercent(o.plan, o.usage, 'brandpilot_assets')} />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-brand-muted">Users</div>
            <div className="text-lg font-semibold">Roles & Plans</div>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-brand-muted">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Org Plan</th>
                <th className="py-2 pr-4">Org</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const org = orgs.find((o) => o.id === u.orgId);
                return (
                  <tr key={u.id} className="border-t border-white/10">
                    <td className="py-2 pr-4">{u.name || '—'}</td>
                    <td className="py-2 pr-4">{u.email || '—'}</td>
                    <td className="py-2 pr-4">{u.role}</td>
                    <td className="py-2 pr-4">{org?.plan || '—'}</td>
                    <td className="py-2 pr-4">{org?.name || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-brand-muted">{label}</div>
      <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}

function UsageBar({ label, used, limit, pct }: { label: string; used: number; limit: number; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-brand-muted">{used.toLocaleString()} / {limit.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-[color:var(--gold,theme(colors.brand.gold))]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
