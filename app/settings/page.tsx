'use client'
import { useEffect, useState } from 'react'

type Org = { id: string; name: string; plan: 'Trial'|'Starter'|'Pro'|'Business'; overageEnabled: boolean; billingCustomerId: string | null }

export default function SettingsPage() {
  const [org, setOrg] = useState<Org | null>(null)
  const [name, setName] = useState('')
  const [overage, setOverage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  async function load() {
    const r = await fetch('/api/org/settings', { cache: 'no-store' })
    if (!r.ok) return
    const j = await r.json()
    setOrg(j)
    setName(j.name || '')
    setOverage(!!j.overageEnabled)
    // plan is display-only; upgrading handled via billing page
  }
  useEffect(()=>{ load() },[])

  async function save() {
    setSaving(true)
    const payload: any = { overageEnabled: overage }
    const trimmed = (name || '').trim()
    if (trimmed.length > 0) payload.name = trimmed
    const r = await fetch('/api/org/settings', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
    setSaving(false)
    if (!r.ok) { alert(await r.text()); return }
    setSavedAt(Date.now())
    await load()
  }

  return (
    <section className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Organization Settings</h1>
        <p className="text-brand-muted text-sm mt-1">Manage your org name and billing preferences.</p>
      </div>

      <div className="card p-6 max-w-2xl">
        <div className="grid gap-4">
          <label className="block">
            <div className="text-sm text-brand-muted mb-1">Organization name</div>
            <input
              className="w-full rounded-xl border border-[color:var(--card-stroke,rgba(255,255,255,0.08))] bg-transparent px-3 py-2 outline-none"
              value={name}
              onChange={e=>setName(e.target.value)}
              placeholder="Your Company"
            />
          </label>
          <div className="flex items-center gap-2">
            <input id="ovg" type="checkbox" checked={overage} onChange={e=>setOverage(e.target.checked)} />
            <label htmlFor="ovg" className="text-sm">Enable overage billing when usage exceeds plan limits</label>
          </div>
          <div className="text-sm text-brand-muted">
            Plan: <b>{org?.plan || '-'}</b>
            {org?.billingCustomerId && <span className="ml-2">• Customer: {org.billingCustomerId}</span>}
          </div>
          <div className="mt-2">
            <a className="btn-ghost" href="/billing">Upgrade Plan</a>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
          {savedAt && <div className="text-xs text-brand-muted">Saved</div>}
        </div>
      </div>

      <div className="card p-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-brand-muted">Subscription</div>
            <div className="text-lg font-medium">Manage billing</div>
          </div>
          <form action="/api/billing/create-portal" method="post">
            <button className="btn-ghost" type="submit">Open Customer Portal</button>
          </form>
        </div>
      </div>
    </section>
  )
}
