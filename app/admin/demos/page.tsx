"use client";
import { useEffect, useMemo, useState } from 'react'
import Uploader from '@/components/Uploader'
import { moduleLabels } from '@/lib/modules'

type Row = { module: string; key: string; url?: string; updatedAt?: string }

export default function AdminDemosPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [sel, setSel] = useState<string>('postpilot')
  const [saving, setSaving] = useState(false)

  async function load() {
    const r = await fetch('/api/modules/demo', { cache: 'no-store' })
    const j = await r.json().catch(() => ({ items: [] }))
    setRows(Array.isArray(j.items) ? j.items : [])
  }
  useEffect(() => { load() }, [])

  const current = useMemo(() => rows.find(r => r.module === sel), [rows, sel])

  async function onUploaded(v: { key: string; url?: string }) {
    setSaving(true)
    await fetch('/api/modules/demo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ module: sel, key: v.key, url: v.url })
    })
    setSaving(false)
    await load()
  }

  return (
    <section className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Module Demo Videos</h1>
        <p className="text-brand-muted text-sm mt-1">Admins can upload demo videos per module.</p>
      </div>

      <div className="card p-6 max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm">Module</label>
          <select
            value={sel}
            onChange={(e)=>setSel(e.target.value)}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm bg-black text-white"
          >
            {Object.keys(moduleLabels).map((k) => (
              <option key={k} value={k}>{moduleLabels[k as keyof typeof moduleLabels]} ({k})</option>
            ))}
          </select>
          {current?.key && <a className="btn-ghost ml-auto" href={`/api/assets/view?key=${encodeURIComponent(current.key)}`} target="_blank">View current</a>}
        </div>

        <Uploader onComplete={onUploaded} />
        {saving && <div className="text-sm text-brand-muted">Saving…</div>}

        <div className="mt-4">
          <div className="text-sm text-brand-muted mb-2">Existing</div>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.module} className="text-sm flex items-center gap-2">
                <span className="min-w-28">{moduleLabels[r.module as keyof typeof moduleLabels] || r.module}</span>
                <a className="underline" href={`/api/assets/view?key=${encodeURIComponent(r.key)}`} target="_blank">{r.key}</a>
                <span className="text-xs text-brand-muted ml-auto">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
