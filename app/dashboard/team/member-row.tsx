'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Member = { userId: string; role: 'owner'|'admin'|'member'|'viewer'; name?: string; email?: string; image?: string }

export default function MemberRow({ m, meRole, onChanged }: { m: Member; meRole: Member['role']; onChanged?: ()=>void }) {
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const canEdit = meRole === 'owner' || (meRole === 'admin' && (m.role === 'member' || m.role === 'viewer'))
  const canPromoteAdmin = meRole === 'owner'
  const canRemove = (meRole === 'owner' && m.role !== 'owner') || (meRole === 'admin' && (m.role === 'member' || m.role === 'viewer'))

  async function updateRole(role: 'admin'|'member'|'viewer') {
    setSaving(true)
    try {
      const r = await fetch('/api/team/member/update-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: m.userId, role }) })
      if (!r.ok) alert(await r.text())
      else { onChanged?.(); router.refresh() }
    } finally { setSaving(false) }
  }
  async function remove() {
    if (!confirm('Remove this member from the org?')) return
    setSaving(true)
    try {
      const r = await fetch('/api/team/member/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: m.userId }) })
      if (!r.ok) alert(await r.text())
      else { onChanged?.(); router.refresh() }
    } finally { setSaving(false) }
  }

  return (
    <div className="flex items-center justify-between border border-white/10 rounded-lg px-3 py-2">
      <div className="flex items-center gap-3">
        {m.image ? (
          <img src={m.image} alt="avatar" className="h-8 w-8 rounded-full" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-white/10" />
        )}
        <div className="flex flex-col">
          <span className="text-sm">{m.name || m.email || m.userId}</span>
          {m.email && <span className="text-xs text-brand-muted">{m.email}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-brand-muted">{m.role}</span>
        {canEdit && (
          <div className="ml-2 flex items-center gap-2">
            <select
              className="text-sm bg-transparent border rounded px-2 py-1"
              value={m.role}
              onChange={(e)=> updateRole(e.target.value as any)}
              disabled={saving}
            >
              <option value="member">member</option>
              <option value="viewer">viewer</option>
              {canPromoteAdmin && <option value="admin">admin</option>}
            </select>
            {canRemove && (
              <button className="btn-ghost text-red-500" onClick={remove} disabled={saving}>Remove</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
