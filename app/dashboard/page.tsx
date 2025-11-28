'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { modulePlan, moduleLabels } from '@/lib/modules'
import Uploader from '@/components/Uploader'
import { canAccess } from '@/lib/access'

type Plan = 'Trial'|'Starter'|'Pro'|'Business'
type ModuleKey = Exclude<keyof typeof modulePlan, 'viralpilot'>

const moduleRoute: Record<ModuleKey, string> = {
  postpilot: '/postpilot',
  clippilot: '/clippilot',
  blogpilot: '/blogpilot',
  adpilot: '/adpilot',
  leadpilot: '/leadpilot',
  mailpilot: '/mailpilot',
  brandpilot: '/brandpilot',
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [plan, setPlan] = useState<Plan>('Trial')
  const [myRole, setMyRole] = useState<'owner'|'admin'|'member'|'viewer'|'unknown'>('unknown')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const r = await fetch('/api/org/settings', { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled) {
          const eff = (j.effectivePlan as Plan) || (j.plan as Plan) || 'Trial'
          setPlan(eff)
          setMyRole((j.myRole as any) || 'member')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (status === 'authenticated') load(); else setLoading(false)
    return () => { cancelled = true }
  }, [status])

  // Admins/owners get routed to the admin dashboard
  useEffect(() => {
    if (status !== 'authenticated') return
    if (myRole === 'admin' || myRole === 'owner') {
      router.replace('/admin/dashboard')
    }
  }, [status, myRole, router])

  const items = useMemo(() => {
    const rawRole = myRole || ((session?.user as any)?.role as string | undefined)
    const ignoreAdmin = process.env.NEXT_PUBLIC_DISABLE_ADMIN_GATE === 'true'
    const userRole = ignoreAdmin ? undefined : rawRole
    const isAuthed = Boolean(session?.user)
    const p: Plan | null = isAuthed ? plan : null
    const keys = (Object.keys(modulePlan) as Array<keyof typeof modulePlan>)
      .filter(k => k !== 'viralpilot') as ModuleKey[]
    return keys.map(k => {
      const access = canAccess({ userPlan: p as any, module: k, userRole })
      return {
        key: k,
        label: moduleLabels[k],
        href: moduleRoute[k],
        unlocked: access,
        required: modulePlan[k],
      }
    })
  }, [plan, myRole, session])

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-6">
        <div className="card p-6"><div className="h-6 w-40 bg-white/10 rounded" /></div>
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_,i)=> (
            <div key={i} className="card p-6"><div className="h-4 w-24 bg-white/10 rounded" /><div className="mt-2 h-6 w-40 bg-white/10 rounded" /></div>
          ))}
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="card p-6">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-brand-muted mt-1">Please sign in to view your modules.</p>
        <a className="mt-4 inline-block btn-gold" href="/api/auth/signin">Sign In</a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="text-brand-muted text-sm">Plan: <b>{plan}</b> {['owner','admin'].includes(String(myRole)) && <span className="ml-2 text-xs">• {myRole}</span>}</p>
          </div>
          <a href="/billing" className="btn-ghost">Manage Plan</a>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {items.map(it => (
          <div className="card p-6" key={it.key}>
            <div className="text-sm text-brand-muted">Module</div>
            <div className="text-lg font-medium">{it.label}</div>
            <div className="mt-3 flex items-center gap-2">
              {it.unlocked ? (
                <a className="btn-gold" href={it.href}>Open</a>
              ) : (
                <>
                  <span className="text-xs text-brand-muted">Requires {it.required}</span>
                  <a className="btn-ghost ml-auto" href="/billing">Upgrade</a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-brand-muted">Organization</div>
            <div className="text-lg font-medium">Team & Invites</div>
          </div>
          <a href="/dashboard/team" className="btn-gold">Manage Team</a>
        </div>
      </div>

      {['owner','admin'].includes(String(myRole)) && (
        <div className="card p-6">
          <AdminUploadDemo />
        </div>
      )}
    </div>
  )
}

function AdminUploadDemo() {
  const [moduleKey, setModuleKey] = useState<ModuleKey>('postpilot')
  const [saving, setSaving] = useState(false)
  async function onComplete(v: { key: string; url?: string }) {
    setSaving(true)
    try {
      await fetch('/api/modules/demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ module: moduleKey, key: v.key, url: v.url })
      })
      alert('Demo video saved for ' + (moduleLabels as any)[moduleKey])
    } catch (e) {
      alert('Failed to save demo: ' + (e as any)?.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-brand-muted">Admin</div>
          <div className="text-lg font-medium">Upload Module Demo Video</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm">Module</label>
        <select
          value={moduleKey}
          onChange={(e)=>setModuleKey(e.target.value as ModuleKey)}
          className="rounded-xl px-3 py-2 text-sm bg-black text-white border transition-colors border-[color:var(--card-stroke,rgba(255,255,255,0.12))] hover:border-[color:var(--goldLight,theme(colors.brand.goldLight))] focus:outline-none focus:ring-1 focus:ring-[color:var(--goldLight,theme(colors.brand.goldLight))]"
        >
          {(Object.keys(moduleLabels) as ModuleKey[]).map(k => (
            <option key={k} value={k}>{moduleLabels[k]}</option>
          ))}
        </select>
      </div>
      <div className="mt-4">
        <Uploader onComplete={onComplete} />
        {saving && <div className="text-sm text-brand-muted mt-2">Saving…</div>}
      </div>
    </div>
  )
}
