'use client'
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type OrgRole = 'owner' | 'manager' | 'editor' | 'viewer'
type Member  = { userId: string; role: OrgRole; name?: string; email?: string; image?: string }

const ROLE_BADGE: Record<OrgRole, string> = {
  owner:   'bg-[color:var(--gold)]/15 text-[color:var(--gold)]',
  manager: 'bg-violet-500/15 text-violet-400',
  editor:  'bg-emerald-500/15 text-emerald-400',
  viewer:  'bg-white/8 text-brand-muted',
}

export default function MemberRow({ m, meRole, onChanged }: { m: Member; meRole: OrgRole; onChanged?: () => void }) {
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const canEdit      = meRole === 'owner' || (meRole === 'manager' && (m.role === 'editor' || m.role === 'viewer'))
  const canSetManager = meRole === 'owner'
  const canRemove    = (meRole === 'owner' && m.role !== 'owner') || (meRole === 'manager' && (m.role === 'editor' || m.role === 'viewer'))

  async function updateRole(role: OrgRole) {
    setSaving(true)
    try {
      const r = await fetch('/api/team/member/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: m.userId, role }),
      })
      if (!r.ok) alert((await r.json())?.error || await r.text())
      else { onChanged?.(); router.refresh() }
    } finally { setSaving(false) }
  }

  async function remove() {
    if (!confirm('Remove this member from the org?')) return
    setSaving(true)
    try {
      const r = await fetch('/api/team/member/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: m.userId }),
      })
      if (!r.ok) alert((await r.json())?.error || await r.text())
      else { onChanged?.(); router.refresh() }
    } finally { setSaving(false) }
  }

  return (
    <div className="flex items-center justify-between border border-white/10 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        {m.image
          ? <img src={m.image} alt="avatar" className="h-8 w-8 rounded-full" />
          : <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">{(m.name || m.email || '?')[0].toUpperCase()}</div>
        }
        <div className="flex flex-col">
          <span className="text-sm font-medium">{m.name || m.email || m.userId}</span>
          {m.name && m.email && <span className="text-xs text-brand-muted">{m.email}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[m.role]}`}>{m.role}</span>

        {canEdit && (
          <>
            <select
              className="text-xs bg-transparent border border-white/15 rounded-lg px-2 py-1 focus:outline-none"
              value={m.role}
              onChange={e => updateRole(e.target.value as OrgRole)}
              disabled={saving}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              {canSetManager && <option value="manager">Manager</option>}
            </select>
            {canRemove && (
              <button
                className="text-xs px-2 py-1 rounded-lg border border-rose-500/25 text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50"
                onClick={remove}
                disabled={saving}
              >
                Remove
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
