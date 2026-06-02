'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { modulePlan, moduleLabels } from '@/lib/modules'
import { PLAN_LIMITS, type MeterKey, type PlanKey } from '@/lib/limits'
import { canAccess } from '@/lib/access'

// ── Types ─────────────────────────────────────────────────────────────────────

type Plan = 'Trial' | 'Starter' | 'Pro' | 'Business'
type Role = 'owner' | 'manager' | 'editor' | 'viewer' | 'unknown'
type ModuleKey = keyof typeof modulePlan
type UsageMap = Partial<Record<MeterKey, number>>

const MODULE_META: Record<ModuleKey, { meter: MeterKey; unit: string }> = {
  postpilot: { meter: 'postpilot_generated', unit: 'posts' },
  blogpilot: { meter: 'blogpilot_words',     unit: 'words' },
  adpilot:   { meter: 'adpilot_variants',    unit: 'ads' },
  leadpilot: { meter: 'leadpilot_convos',    unit: 'convos' },
  mailpilot: { meter: 'mailpilot_emails',    unit: 'emails' },
}

function ModuleIcon({ k, className = 'w-5 h-5' }: { k: string; className?: string }) {
  const cls = `${className} flex-shrink-0`
  switch (k) {
    case 'postpilot': return <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
    case 'blogpilot': return <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
    case 'adpilot':   return <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.66 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg>
    case 'leadpilot': return <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
    case 'mailpilot': return <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
    default: return null
  }
}

const AGENTS = [
  { icon: '✨', label: 'Campaign Agent',  desc: 'Full campaign from one brief', href: '/agent',          color: 'gold' },
  { icon: '✏️', label: 'Iteration Agent', desc: 'Refine any content',           href: '/agent/iterate',  color: 'emerald' },
  { icon: '🔍', label: 'Research Agent',  desc: 'Keywords, gaps & brief',       href: '/agent/research', color: 'violet' },
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting(name?: string | null) {
  const h = new Date().getHours()
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${time}, ${name.split(' ')[0]}` : time
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toLocaleString()
}

function barColor(pct: number) {
  if (pct >= 90) return 'bg-rose-500'
  if (pct >= 70) return 'bg-amber-400'
  return 'bg-[color:var(--gold,theme(colors.brand.gold))]'
}

// ── Usage bar ────────────────────────────────────────────────────────────────

function UsageRow({ label, moduleKey, used, limit, unit }: {
  label: string; moduleKey: string; used: number; limit: number; unit: string
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const near = pct >= 80

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5">
          <ModuleIcon k={moduleKey} className="w-4 h-4 text-[color:var(--gold)]" />
          <span className="font-medium">{label}</span>
        </span>
        <span className={`text-xs ${near ? 'text-amber-400 font-medium' : 'text-brand-muted'}`}>
          {fmt(used)} / {fmt(limit)} {unit}
          {near && ' · near limit'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="card p-6 h-28" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => <div key={i} className="card h-24" />)}
      </div>
      <div className="card p-6 h-48" />
    </div>
  )
}

// ── Main dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [plan,   setPlan]   = useState<Plan>('Trial')
  const [role,   setRole]   = useState<Role>('unknown')
  const [usage,  setUsage]  = useState<UsageMap>({})
  const [limits, setLimits] = useState<Partial<Record<MeterKey, number>>>({})
  const [orgName, setOrgName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/api/auth/signin'); return }
    if (status !== 'authenticated') return
    let cancelled = false

    async function load() {
      try {
        const r = await fetch('/api/org/settings', { cache: 'no-store' })
        if (!r.ok) { setLoading(false); return }
        const j = await r.json()
        if (cancelled) return

        const eff = (j.effectivePlan as Plan) || (j.plan as Plan) || 'Trial'
        const myRole = (j.myRole as Role) || 'editor'

        // Redirect platform superadmins — keep loading=true so skeleton stays
        // visible the whole time; user dashboard content never flashes.
        if (j.platformRole === 'superadmin') {
          router.replace('/admin/dashboard')
          return
        }

        setPlan(eff)
        setRole(myRole)
        setOrgName(j.name || '')

        if (j.id) {
          const ur = await fetch(`/api/org/usage?orgId=${j.id}`)
          if (!ur.ok || cancelled) { setLoading(false); return }
          const ud = await ur.json()
          const planKey = (ud.plan as PlanKey) || eff
          const planLimits = (PLAN_LIMITS[planKey] || {}) as unknown as Partial<Record<MeterKey, number>>
          setLimits(planLimits)
          setUsage((ud.usage || {}) as UsageMap)
        }

        setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [status, router])

  const modules = useMemo(() => {
    return (Object.keys(modulePlan) as ModuleKey[]).map(k => {
      const meta = MODULE_META[k]
      const used  = Number(usage?.[meta.meter]  ?? 0)
      const limit = Number(limits?.[meta.meter] ?? 0)
      const pct   = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
      const unlocked = canAccess({ userPlan: plan as any, module: k, userRole: role })
      return { key: k, label: moduleLabels[k], ...meta, used, limit, pct, unlocked }
    })
  }, [plan, role, usage, limits])

  const isViewer = role === 'viewer'
  const totalUsed  = modules.reduce((s, m) => s + m.used, 0)
  const atRiskMods = modules.filter(m => m.pct >= 80 && m.limit > 0)
  const userName   = session?.user?.name

  if (status === 'loading' || loading) return <Skeleton />

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{greeting(userName)}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-brand-muted">
            <span className="capitalize">{plan} plan</span>
            {orgName && <><span>·</span><span>{orgName}</span></>}
            {isViewer && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/15">View only</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/analytics" className="btn-ghost text-sm">Analytics</Link>
          <Link href="/billing" className="btn-gold text-sm">
            {plan === 'Trial' ? 'Upgrade plan' : 'Manage plan'}
          </Link>
        </div>
      </div>

      {/* ── Upgrade prompt for Trial ── */}
      {plan === 'Trial' && (
        <div className="rounded-xl border border-[color:var(--gold)]/25 bg-[color:var(--gold)]/5 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">You&apos;re on the Free plan</div>
            <p className="text-xs text-brand-muted mt-0.5">
              Upgrade to Starter for 200 posts, 50k blog words, 50 emails, and no watermark.
            </p>
          </div>
          <Link href="/billing" className="btn-gold text-sm flex-shrink-0">See plans →</Link>
        </div>
      )}

      {/* ── Near-limit warning ── */}
      {atRiskMods.length > 0 && plan !== 'Trial' && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-3 flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <div className="text-sm">
            <span className="font-medium">Approaching limits: </span>
            <span className="text-brand-muted">{atRiskMods.map(m => m.label).join(', ')}</span>
            {' '}— <Link href="/billing" className="underline hover:text-white">upgrade or enable overage</Link>
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-muted mb-3">Quick start</div>
        <div className="grid gap-2 md:grid-cols-3">
          {AGENTS.map(a => {
            const colorCls = a.color === 'gold'
              ? 'border-[color:var(--gold)]/25 hover:bg-[color:var(--gold)]/5 hover:border-[color:var(--gold)]/40'
              : a.color === 'emerald'
              ? 'border-emerald-500/20 hover:bg-emerald-500/5 hover:border-emerald-500/35'
              : 'border-violet-500/20 hover:bg-violet-500/5 hover:border-violet-500/35'
            const textCls = a.color === 'gold' ? 'text-[color:var(--gold)]'
              : a.color === 'emerald' ? 'text-emerald-400'
              : 'text-violet-400'
            return (
              <Link key={a.href} href={isViewer ? '#' : a.href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${colorCls} ${isViewer ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="text-xl flex-shrink-0">{a.icon}</span>
                <div className="min-w-0">
                  <div className={`text-sm font-medium ${textCls}`}>{a.label}</div>
                  <div className="text-xs text-brand-muted truncate">{a.desc}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Module grid ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-widest text-brand-muted">Your modules</div>
          <span className="text-xs text-brand-muted">{totalUsed.toLocaleString()} total uses this month</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(m => (
            <div key={m.key} className={`card p-4 flex flex-col gap-3 ${!m.unlocked ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ModuleIcon k={m.key} className="w-5 h-5 text-[color:var(--gold)]" />
                  <span className="text-sm font-medium">{m.label}</span>
                </div>
                {m.unlocked
                  ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Live</span>
                  : <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-brand-muted">Locked</span>
                }
              </div>

              {m.limit > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-brand-muted">
                    <span>{fmt(m.used)} used</span>
                    <span>{fmt(m.limit)} {m.unit}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor(m.pct)}`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-brand-muted">No cap on this plan</div>
              )}

              {m.unlocked && !isViewer ? (
                <Link href={m.key === 'postpilot' ? '/postpilot'
                  : m.key === 'blogpilot' ? '/blogpilot'
                  : m.key === 'adpilot' ? '/adpilot'
                  : m.key === 'leadpilot' ? '/leadpilot'
                  : '/mailpilot'}
                  className="btn-gold text-xs py-1.5 text-center">
                  Open {m.label}
                </Link>
              ) : !m.unlocked ? (
                <Link href="/billing" className="text-xs text-brand-muted hover:text-white transition text-center py-1.5">
                  Upgrade to unlock →
                </Link>
              ) : (
                <div className="text-xs text-brand-muted text-center py-1.5">View only</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan summary ── */}
      <div className="card p-5 grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-brand-muted">This month&apos;s usage</div>
          {modules.filter(m => m.limit > 0).map(m => (
            <UsageRow key={m.key} label={m.label} moduleKey={m.key}
              used={m.used} limit={m.limit} unit={m.unit} />
          ))}
        </div>
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-widest text-brand-muted">Your plan</div>
          <div>
            <div className="text-2xl font-semibold">{plan}</div>
            <div className="text-sm text-brand-muted mt-1">
              {plan === 'Trial'    && 'Free forever · Limited usage'}
              {plan === 'Starter'  && '$49/month · 1 seat'}
              {plan === 'Pro'      && '$149/month · 3 seats · Priority AI'}
              {plan === 'Business' && '$399/month · 10 seats · API access'}
            </div>
          </div>
          <div className="space-y-2">
            <Link href="/billing" className="block w-full btn-gold text-sm text-center py-2">
              {plan === 'Trial' ? 'Upgrade plan' : 'Manage subscription'}
            </Link>
            <Link href="/dashboard/analytics" className="block w-full btn-ghost text-sm text-center py-2">
              View detailed analytics
            </Link>
            {!isViewer && (
              <Link href="/dashboard/team" className="block w-full btn-ghost text-sm text-center py-2">
                Team & invites
              </Link>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
