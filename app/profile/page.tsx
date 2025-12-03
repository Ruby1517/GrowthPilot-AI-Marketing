'use client'
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'

type Me = { id: string; name: string; email: string; image: string; role: string; orgId: string | null }
type OrgSettings = {
  id: string;
  plan: 'Trial'|'Starter'|'Pro'|'Business';
  subscription: { id?: string } | null;
  usagePeriodStart?: string | null;
  usagePeriodEnd?: string | null;
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null)
  const [name, setName] = useState('')
  const [image, setImage] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [org, setOrg] = useState<OrgSettings | null>(null)

  async function load() {
    const r = await fetch('/api/me', { cache: 'no-store' })
    if (!r.ok) return
    const j = await r.json()
    setMe(j)
    setName(j.name || '')
    setImage(j.image || '')
  }
  useEffect(()=>{ load() },[])

  useEffect(() => {
    let cancelled = false
    async function loadOrg() {
      try {
        const r = await fetch('/api/org/settings', { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled) setOrg({
          id: j.id,
          plan: j.plan,
          subscription: j.subscription || null,
          usagePeriodStart: j.usagePeriodStart || null,
          usagePeriodEnd: j.usagePeriodEnd || null,
        })
      } catch {}
    }
    loadOrg()
    return () => { cancelled = true }
  }, [])

  async function save() {
    setSaving(true)
    const r = await fetch('/api/me', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, image })
    })
    setSaving(false)
    if (!r.ok) { alert(await r.text()); return }
    setSavedAt(Date.now())
    await load()
  }

  return (
    <section className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="text-brand-muted text-sm mt-1">Manage your personal details.</p>
      </div>

      <div className="card p-6 max-w-2xl">
        <div className="grid gap-4">
          <label className="block">
            <div className="text-sm text-brand-muted mb-1">Name</div>
            <input
              className="w-full rounded-xl border border-[color:var(--card-stroke,rgba(255,255,255,0.08))] bg-transparent px-3 py-2 outline-none"
              value={name}
              onChange={e=>setName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label className="block">
            <div className="text-sm text-brand-muted mb-1">Email</div>
            <input disabled value={me?.email || ''}
              className="w-full rounded-xl border bg-black/20 px-3 py-2 text-brand-muted" />
          </label>
          <label className="block">
            <div className="text-sm text-brand-muted mb-1">Photo URL</div>
            <input
              className="w-full rounded-xl border border-[color:var(--card-stroke,rgba(255,255,255,0.08))] bg-transparent px-3 py-2 outline-none"
              value={image}
              onChange={e=>setImage(e.target.value)}
              placeholder="https://.../avatar.jpg"
            />
            {image && (
              <div className="mt-3 flex items-center gap-3">
                <img src={image} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
                <div className="text-xs text-brand-muted">Preview</div>
              </div>
            )}
          </label>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          {savedAt && <div className="text-xs text-brand-muted">Saved</div>}
        </div>
      </div>

      <div className="card p-6 max-w-2xl">
        <div className="text-lg font-medium">Subscription</div>
        <div className="mt-2 text-sm text-brand-muted">Plan: <b>{org?.plan || '-'}</b></div>
        {org?.subscription?.id && (
          <div className="mt-1 text-sm text-brand-muted">Subscription ID: <span className="opacity-80">{org.subscription.id}</span></div>
        )}
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div>
            <div className="text-xs text-brand-muted">Current period start</div>
            <div className="text-sm">{org?.usagePeriodStart ? new Date(org.usagePeriodStart).toLocaleString() : '-'}</div>
          </div>
          <div>
            <div className="text-xs text-brand-muted">Current period end</div>
            <div className="text-sm">{org?.usagePeriodEnd ? new Date(org.usagePeriodEnd).toLocaleString() : '-'}</div>
          </div>
        </div>
        <div className="mt-3">
          <a className="btn-ghost" href="/billing">Manage Plan</a>
        </div>
      </div>
    </section>
  )
}
