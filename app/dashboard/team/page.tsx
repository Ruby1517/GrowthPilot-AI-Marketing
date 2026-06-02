'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type OrgRole = 'owner' | 'manager' | 'editor' | 'viewer'

type Member = {
  userId:   string
  role:     OrgRole
  name:     string | null
  email:    string | null
  image:    string | null
  isMe:     boolean
  joinedAt: string | null
}

type PendingInvite = {
  id:        string
  email:     string
  role:      OrgRole
  token:     string
  expiresAt: string
}

type TeamData = {
  orgName:        string
  plan:           string
  seatLimit:      number
  myRole:         OrgRole
  members:        Member[]
  pendingInvites: PendingInvite[]
}

type InviteRole = 'editor' | 'manager' | 'viewer'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<OrgRole, string> = {
  owner:   'bg-[color:var(--gold)]/15 text-[color:var(--gold)]',
  manager: 'bg-violet-500/15 text-violet-400',
  editor:  'bg-emerald-500/15 text-emerald-400',
  viewer:  'bg-white/10 text-brand-muted',
}

const ROLE_PERMS: { label: string; owner: boolean; manager: boolean; editor: boolean; viewer: boolean }[] = [
  { label: 'Generate & publish content', owner: true,  manager: true,  editor: true,  viewer: false },
  { label: 'View all content & results', owner: true,  manager: true,  editor: true,  viewer: true  },
  { label: 'Manage team members',        owner: true,  manager: true,  editor: false, viewer: false },
  { label: 'Brand voice & settings',     owner: true,  manager: true,  editor: false, viewer: false },
  { label: 'Billing & subscription',     owner: true,  manager: false, editor: false, viewer: false },
]

const INVITE_ROLE_OPTS: { value: InviteRole; label: string; desc: string }[] = [
  { value: 'editor',  label: 'Editor',  desc: 'Can generate and publish content' },
  { value: 'manager', label: 'Manager', desc: 'Team management + all modules, no billing' },
  { value: 'viewer',  label: 'Viewer',  desc: 'Read-only access to results' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string | null, email: string | null) {
  const src = name || email || '?'
  return src.slice(0, 2).toUpperCase()
}

function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

function Check({ ok }: { ok: boolean }) {
  return ok
    ? <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
    : <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, email, image, size = 9 }: { name: string | null; email: string | null; image: string | null; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold`
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className={`${cls} object-cover`} />
  }
  return (
    <div className={cls} style={{ background: 'linear-gradient(135deg,#14B8A6,#D4AF37)' }}>
      <span className="text-black">{initials(name, email)}</span>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
    </svg>
  )
}

// ── Member card ───────────────────────────────────────────────────────────────

function MemberCard({
  m, myRole, onRefresh,
}: {
  m: Member
  myRole: OrgRole
  onRefresh: () => void
}) {
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const canEdit   = myRole === 'owner' || (myRole === 'manager' && (m.role === 'editor' || m.role === 'viewer'))
  const canSetMgr = myRole === 'owner' && m.role !== 'owner'
  const canRemove = !m.isMe && ((myRole === 'owner' && m.role !== 'owner') || (myRole === 'manager' && (m.role === 'editor' || m.role === 'viewer')))

  async function changeRole(role: string) {
    setSaving(true)
    const r = await fetch('/api/team/member/update-role', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: m.userId, role }),
    })
    setSaving(false)
    if (!r.ok) { const j = await r.json(); alert(j?.error || 'Failed'); return }
    onRefresh(); router.refresh()
  }

  async function remove() {
    if (!confirm(`Remove ${m.name || m.email}?`)) return
    setSaving(true)
    const r = await fetch('/api/team/member/remove', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: m.userId }),
    })
    setSaving(false)
    if (!r.ok) { const j = await r.json(); alert(j?.error || 'Failed'); return }
    onRefresh()
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={m.name} email={m.email} image={m.image} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{m.name || m.email || m.userId}</span>
            {m.isMe && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-brand-muted">You</span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[m.role]}`}>{m.role}</span>
          </div>
          {m.name && m.email && <div className="text-xs text-brand-muted truncate">{m.email}</div>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {saving && <Spinner className="w-3.5 h-3.5 text-brand-muted" />}
        {!m.isMe && canEdit && (
          <select
            className="text-xs bg-transparent border border-white/15 rounded-lg px-2 py-1.5 focus:outline-none focus:border-white/30 transition cursor-pointer"
            value={m.role}
            onChange={e => changeRole(e.target.value)}
            disabled={saving}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            {canSetMgr && <option value="manager">Manager</option>}
          </select>
        )}
        {canRemove && (
          <button
            onClick={remove}
            disabled={saving}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

// ── Invite row ────────────────────────────────────────────────────────────────

function InviteRow({ inv, onRefresh }: { inv: PendingInvite; onRefresh: () => void }) {
  const [busy,   setBusy]   = useState(false)
  const [copied, setCopied] = useState(false)
  const days = daysUntil(inv.expiresAt)

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/invite?token=${inv.token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function revoke() {
    if (!confirm(`Revoke invite for ${inv.email}?`)) return
    setBusy(true)
    await fetch('/api/invites/revoke', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inv.id }),
    })
    setBusy(false)
    onRefresh()
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-dashed border-white/15 bg-white/[0.01]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/30">
            <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-brand-muted">{inv.email}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[inv.role]}`}>{inv.role}</span>
          </div>
          <div className={`text-xs mt-0.5 ${days <= 1 ? 'text-amber-400' : 'text-brand-muted'}`}>
            {days === 0 ? 'Expires today' : `Expires in ${days}d`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={copyLink}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 transition flex items-center gap-1.5">
          {copied
            ? <><svg viewBox="0 0 24 24" className="w-3 h-3 text-emerald-400"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>Copied</>
            : 'Copy link'
          }
        </button>
        <button onClick={revoke} disabled={busy}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50">
          Revoke
        </button>
      </div>
    </div>
  )
}

// ── Invite form ───────────────────────────────────────────────────────────────

function InviteForm({ myRole, onRefresh, onClose }: { myRole: OrgRole; onRefresh: () => void; onClose: () => void }) {
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState<InviteRole>('editor')
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState<string | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null); setToken(null)
    try {
      const r = await fetch('/api/invites/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Failed')
      setToken(j.token)
      setEmail('')
      onRefresh()
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function copyInvite() {
    if (!token) return
    await navigator.clipboard.writeText(`${window.location.origin}/invite?token=${token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Invite a team member</div>
        <button onClick={onClose} className="text-brand-muted hover:text-white transition text-lg leading-none">✕</button>
      </div>

      {token ? (
        <div className="space-y-3">
          <div className="text-sm text-emerald-400 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            Invite created — share this link
          </div>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2 break-all text-brand-muted">
              {`${typeof window !== 'undefined' ? window.location.origin : ''}/invite?token=${token}`}
            </code>
            <button onClick={copyInvite}
              className="text-xs px-3 py-2 rounded-xl border border-white/15 hover:bg-white/5 transition flex-shrink-0">
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setToken(null)} className="btn-ghost text-xs">Invite another</button>
            <button onClick={onClose} className="btn-gold text-xs px-4">Done</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-brand-muted block mb-1.5">Email address</label>
            <input
              type="email" required
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
              placeholder="colleague@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-brand-muted block mb-2">Role</label>
            <div className="space-y-2">
              {INVITE_ROLE_OPTS.filter(o => o.value !== 'manager' || myRole === 'owner').map(o => (
                <button key={o.value} type="button" onClick={() => setRole(o.value)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${role === o.value ? 'border-[color:var(--gold)]/40 bg-[color:var(--gold)]/8' : 'border-white/10 hover:border-white/20'}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${role === o.value ? 'bg-[color:var(--gold)]' : 'border border-white/30'}`} />
                  <div>
                    <div className="text-sm font-medium">{o.label}</div>
                    <div className="text-[11px] text-brand-muted">{o.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {err && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-400">{err}</div>}

          <button type="submit" disabled={loading || !email}
            className="btn-gold text-sm px-5 py-2.5 disabled:opacity-50 flex items-center gap-2">
            {loading ? <><Spinner />Sending…</> : 'Send invite'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Permissions table ─────────────────────────────────────────────────────────

function PermissionsTable() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium hover:bg-white/3 transition">
        <span>Role permissions</span>
        <svg viewBox="0 0 24 24" className={`w-4 h-4 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 overflow-x-auto">
          <table className="w-full text-xs min-w-[400px]">
            <thead>
              <tr className="text-brand-muted">
                <th className="text-left py-2 font-normal w-1/2">Permission</th>
                {(['Owner','Manager','Editor','Viewer'] as const).map(r => (
                  <th key={r} className="text-center py-2 font-medium">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ROLE_PERMS.map(p => (
                <tr key={p.label}>
                  <td className="py-2 text-brand-muted">{p.label}</td>
                  <td className="py-2 text-center"><Check ok={p.owner}   /></td>
                  <td className="py-2 text-center"><Check ok={p.manager} /></td>
                  <td className="py-2 text-center"><Check ok={p.editor}  /></td>
                  <td className="py-2 text-center"><Check ok={p.viewer}  /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 rounded-2xl bg-white/5" />
      <div className="space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-white/5" />)}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [data,        setData]        = useState<TeamData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [showInvite,  setShowInvite]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/team/members', { cache: 'no-store' })
      if (!r.ok) { setError('Failed to load team'); return }
      setData(await r.json())
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8"><Skeleton /></div>
  if (error)   return <div className="max-w-3xl mx-auto px-4 py-8 text-rose-400">{error}</div>
  if (!data)   return null

  const { orgName, plan, seatLimit, myRole, members, pendingInvites } = data
  const usedSeats   = members.length
  const seatPct     = Math.min(100, Math.round((usedSeats / seatLimit) * 100))
  const atSeatLimit = usedSeats >= seatLimit
  const canManage   = myRole === 'owner' || myRole === 'manager'
  const canInvite   = canManage && !atSeatLimit

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-brand-muted text-sm mt-1">{orgName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1.5 rounded-full capitalize font-medium ${ROLE_BADGE[myRole]}`}>
            You are {myRole === 'owner' ? 'the ' : 'a '}{myRole}
          </span>
          {canInvite && (
            <button onClick={() => setShowInvite(v => !v)}
              className="btn-gold text-sm flex items-center gap-1.5">
              {showInvite ? '✕ Cancel' : '+ Invite member'}
            </button>
          )}
          {canManage && atSeatLimit && (
            <Link href="/billing" className="btn-gold text-sm">Upgrade for more seats →</Link>
          )}
          {plan === 'Trial' && canManage && (
            <Link href="/billing" className="btn-gold text-sm">Upgrade to invite →</Link>
          )}
        </div>
      </div>

      {/* ── Seat usage ── */}
      <div className="card p-5 flex items-center gap-6">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Seat usage</span>
            <span className={`text-xs ${atSeatLimit ? 'text-amber-400 font-medium' : 'text-brand-muted'}`}>
              {usedSeats} / {seatLimit} seats
              {atSeatLimit && ' · at limit'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${seatPct >= 100 ? 'bg-amber-400' : 'bg-[color:var(--gold)]'}`}
              style={{ width: `${seatPct}%` }}
            />
          </div>
          <div className="text-xs text-brand-muted">
            {plan} plan · {pendingInvites.length > 0 ? `${pendingInvites.length} pending invite${pendingInvites.length !== 1 ? 's' : ''}` : 'No pending invites'}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href="/billing"        className="btn-ghost text-xs">Manage plan</Link>
          <Link href="/dashboard/analytics" className="btn-ghost text-xs">View usage</Link>
        </div>
      </div>

      {/* ── Role permissions ── */}
      <PermissionsTable />

      {/* ── Invite form ── */}
      {showInvite && (
        <InviteForm myRole={myRole} onRefresh={load} onClose={() => setShowInvite(false)} />
      )}

      {/* ── Members ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-brand-muted">
            Members ({members.length})
          </div>
        </div>
        <div className="space-y-2">
          {members.map(m => (
            <MemberCard key={m.userId} m={m} myRole={myRole} onRefresh={load} />
          ))}
        </div>
      </div>

      {/* ── Pending invites ── */}
      {canManage && pendingInvites.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-brand-muted">
            Pending invites ({pendingInvites.length})
          </div>
          <div className="space-y-2">
            {pendingInvites.map(inv => (
              <InviteRow key={inv.id} inv={inv} onRefresh={load} />
            ))}
          </div>
        </div>
      )}

      {/* ── Trial / no-access notice ── */}
      {!canManage && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 text-sm text-brand-muted">
          Only owners and managers can invite or manage team members.
        </div>
      )}

    </div>
  )
}
