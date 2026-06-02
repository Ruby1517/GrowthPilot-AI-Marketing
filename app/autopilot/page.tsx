'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly'

type AutopilotItem = {
  id:        string
  name:      string
  brief:     string
  company?:  string
  audience?: string
  cadence:   Cadence
  hour:      number
  status:    'active' | 'paused'
  nextRunAt: string
  lastRunAt?: string
  lastJobId?: string
  runCount:  number
  createdAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CADENCES: { value: Cadence; label: string; desc: string }[] = [
  { value: 'daily',    label: 'Daily',     desc: 'Runs every day at your chosen hour' },
  { value: 'weekly',   label: 'Weekly',    desc: 'Runs every 7 days' },
  { value: 'biweekly', label: 'Bi-weekly', desc: 'Runs every 14 days' },
  { value: 'monthly',  label: 'Monthly',   desc: 'Runs once a month' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2,'0')}:00 UTC`,
}))

const CADENCE_BADGE: Record<Cadence, string> = {
  daily:    'bg-violet-500/15 text-violet-400',
  weekly:   'bg-[color:var(--gold)]/15 text-[color:var(--gold)]',
  biweekly: 'bg-sky-500/15 text-sky-400',
  monthly:  'bg-emerald-500/15 text-emerald-400',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeUntil(d?: string) {
  if (!d) return ''
  const ms = new Date(d).getTime() - Date.now()
  if (ms <= 0) return 'due now'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0)  return `in ${h}h ${m}m`
  return `in ${m}m`
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
        strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
    </svg>
  )
}

// ── Create form ───────────────────────────────────────────────────────────────

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [name,     setName]     = useState('')
  const [brief,    setBrief]    = useState('')
  const [company,  setCompany]  = useState('')
  const [audience, setAudience] = useState('')
  const [cadence,  setCadence]  = useState<Cadence>('weekly')
  const [hour,     setHour]     = useState(9)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !brief.trim()) { setError('Name and brief are required.'); return }
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), brief: brief.trim(), company: company.trim() || undefined, audience: audience.trim() || undefined, cadence, hour }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to create')
      onCreated()
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-5">
      <div className="font-semibold">New Autopilot</div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-xs text-brand-muted block mb-1.5">Autopilot name *</label>
          <input
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
            placeholder="e.g. Weekly startup blog + social"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={120}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-brand-muted block mb-1.5">Campaign brief *</label>
          <textarea
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)] leading-relaxed"
            rows={3}
            placeholder="Describe the campaign that should run automatically. Be specific about tone, topic areas, and goals."
            value={brief}
            onChange={e => setBrief(e.target.value)}
            maxLength={2000}
            required
          />
          <div className="text-right text-[10px] text-brand-muted mt-0.5">{brief.length}/2000</div>
        </div>

        <div>
          <label className="text-xs text-brand-muted block mb-1.5">Company <span className="opacity-60">(optional)</span></label>
          <input
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm focus:outline-none"
            placeholder="Acme Inc"
            value={company}
            onChange={e => setCompany(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-brand-muted block mb-1.5">Target audience <span className="opacity-60">(optional)</span></label>
          <input
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm focus:outline-none"
            placeholder="Startup founders, B2B marketers"
            value={audience}
            onChange={e => setAudience(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-brand-muted block mb-1.5">Cadence</label>
          <div className="grid gap-2">
            {CADENCES.map(c => (
              <button key={c.value} type="button"
                onClick={() => setCadence(c.value)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${cadence === c.value ? 'border-[color:var(--gold)]/40 bg-[color:var(--gold)]/8' : 'border-white/10 hover:border-white/20'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cadence === c.value ? 'bg-[color:var(--gold)]' : 'border border-white/30'}`} />
                <div>
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-[10px] text-brand-muted">{c.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-brand-muted block mb-1.5">Run time (UTC)</label>
          <select
            value={hour}
            onChange={e => setHour(Number(e.target.value))}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm focus:outline-none"
          >
            {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>
          <p className="text-[10px] text-brand-muted mt-1.5">
            The agent runs at this hour UTC every {cadence === 'biweekly' ? '2 weeks' : cadence === 'monthly' ? 'month' : cadence === 'daily' ? 'day' : 'week'}.
          </p>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-brand-muted">Each run generates</div>
            {['📝 SEO blog draft', '📱 Social posts', '🎯 Ad copy', '📧 Email sequence', '💬 Lead chatbot config'].map(s => (
              <div key={s} className="text-xs text-brand-muted flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-emerald-400 flex-shrink-0">
                  <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">{error}</div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="btn-gold flex items-center gap-2 disabled:opacity-50 text-sm px-5 py-2.5">
          {loading ? <><Spinner />Creating…</> : '⏰ Create Autopilot'}
        </button>
      </div>
    </form>
  )
}

// ── Autopilot card ────────────────────────────────────────────────────────────

function AutopilotCard({
  item, onToggle, onDelete, onEdit,
}: {
  item: AutopilotItem
  onToggle: (id: string, status: 'active' | 'paused') => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEdit: (id: string, patch: Partial<AutopilotItem>) => Promise<void>
}) {
  const [busy,     setBusy]     = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [name,     setName]     = useState(item.name)
  const [brief,    setBrief]    = useState(item.brief)
  const [company,  setCompany]  = useState(item.company ?? '')
  const [audience, setAudience] = useState(item.audience ?? '')
  const [cadence,  setCadence]  = useState<Cadence>(item.cadence)
  const [hour,     setHour]     = useState(item.hour)
  const [editErr,  setEditErr]  = useState<string | null>(null)

  async function toggle() {
    setBusy(true)
    const next = item.status === 'active' ? 'paused' : 'active'
    await onToggle(item.id, next)
    setBusy(false)
  }

  async function del() {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    setBusy(true)
    await onDelete(item.id)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !brief.trim()) { setEditErr('Name and brief are required.'); return }
    setBusy(true); setEditErr(null)
    try {
      await onEdit(item.id, {
        name:     name.trim(),
        brief:    brief.trim(),
        company:  company.trim() || undefined,
        audience: audience.trim() || undefined,
        cadence,
        hour,
      })
      setEditing(false)
    } catch (e: any) {
      setEditErr(e?.message || 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  function cancelEdit() {
    setName(item.name); setBrief(item.brief)
    setCompany(item.company ?? ''); setAudience(item.audience ?? '')
    setCadence(item.cadence); setHour(item.hour)
    setEditErr(null); setEditing(false)
  }

  const isActive = item.status === 'active'

  return (
    <div className={`card p-5 space-y-4 ${isActive ? '' : 'opacity-60'}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{item.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${CADENCE_BADGE[item.cadence]}`}>
              {item.cadence}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-brand-muted'}`}>
              {isActive ? '● Active' : '○ Paused'}
            </span>
          </div>
          <p className="text-xs text-brand-muted line-clamp-2 leading-relaxed">{item.brief}</p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setEditing(v => !v)} disabled={busy}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/70 hover:bg-white/10 transition disabled:opacity-50">
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={toggle} disabled={busy}
            className={`text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${isActive ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
            {busy ? '…' : isActive ? 'Pause' : 'Resume'}
          </button>
          <button onClick={del} disabled={busy}
            className="text-xs px-3 py-1.5 rounded-lg border border-rose-500/25 text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50">
            Delete
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {editing && (
        <form onSubmit={saveEdit} className="border-t border-white/10 pt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs text-brand-muted block mb-1">Name *</label>
              <input
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
                value={name} onChange={e => setName(e.target.value)} maxLength={120} required
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-brand-muted block mb-1">Campaign brief *</label>
              <textarea
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)] leading-relaxed"
                rows={3} value={brief} onChange={e => setBrief(e.target.value)} maxLength={2000} required
              />
              <div className="text-right text-[10px] text-brand-muted mt-0.5">{brief.length}/2000</div>
            </div>
            <div>
              <label className="text-xs text-brand-muted block mb-1">Company</label>
              <input
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none"
                value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Inc"
              />
            </div>
            <div>
              <label className="text-xs text-brand-muted block mb-1">Target audience</label>
              <input
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none"
                value={audience} onChange={e => setAudience(e.target.value)} placeholder="Startup founders"
              />
            </div>
            <div>
              <label className="text-xs text-brand-muted block mb-1">Cadence</label>
              <div className="grid gap-1.5">
                {CADENCES.map(c => (
                  <button key={c.value} type="button" onClick={() => setCadence(c.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs transition ${cadence === c.value ? 'border-[color:var(--gold)]/40 bg-[color:var(--gold)]/8' : 'border-white/10 hover:border-white/20'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cadence === c.value ? 'bg-[color:var(--gold)]' : 'border border-white/30'}`} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-brand-muted block mb-1">Run time (UTC)</label>
              <select
                value={hour} onChange={e => setHour(Number(e.target.value))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none"
              >
                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
          </div>

          {editErr && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-400">{editErr}</div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={busy}
              className="btn-gold text-xs px-4 py-2 disabled:opacity-50 flex items-center gap-1.5">
              {busy ? <><Spinner />Saving…</> : 'Save changes'}
            </button>
            <button type="button" onClick={cancelEdit}
              className="text-xs px-4 py-2 rounded-lg border border-white/15 hover:bg-white/5 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Stats row */}
      {!editing && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 space-y-0.5">
            <div className="text-[10px] text-brand-muted uppercase tracking-widest">Next run</div>
            <div className="text-xs font-medium">{fmtDate(item.nextRunAt)}</div>
            <div className="text-[10px] text-[color:var(--gold)]">{timeUntil(item.nextRunAt)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 space-y-0.5">
            <div className="text-[10px] text-brand-muted uppercase tracking-widest">Last run</div>
            <div className="text-xs font-medium">{fmtDate(item.lastRunAt)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 space-y-0.5">
            <div className="text-[10px] text-brand-muted uppercase tracking-widest">Total runs</div>
            <div className="text-2xl font-semibold">{item.runCount}</div>
          </div>
        </div>
      )}

      {/* Last campaign result */}
      {!editing && item.lastJobId && (
        <Link href={`/agent?jobId=${item.lastJobId}`}
          className="flex items-center gap-2 text-xs text-brand-muted hover:text-white transition">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
            <path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1 14H9V8h2Zm4 0h-2V8h2Z"/>
          </svg>
          View last campaign results →
        </Link>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AutopilotPage() {
  const [items,      setItems]      = useState<AutopilotItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/autopilot', { cache: 'no-store' })
      if (r.ok) setItems((await r.json()).items)
    } finally {
      setLoading(false)
    }
  }

  async function toggle(id: string, status: 'active' | 'paused') {
    await fetch(`/api/autopilot/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  async function edit(id: string, patch: Partial<AutopilotItem>) {
    const r = await fetch(`/api/autopilot/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed to save') }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  async function del(id: string) {
    await fetch(`/api/autopilot/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Autopilot</h1>
          <p className="text-brand-muted text-sm mt-1">
            Set up campaigns that run automatically on a schedule. The Campaign Agent runs your brief every day, week, or month — no manual trigger needed.
          </p>
        </div>
        <button onClick={() => setShowCreate(v => !v)}
          className="btn-gold text-sm flex-shrink-0 flex items-center gap-1.5">
          {showCreate ? '✕ Cancel' : '+ New'}
        </button>
      </div>

      {/* How it works */}
      {items.length === 0 && !showCreate && !loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
          <div className="text-sm font-medium">How Autopilot works</div>
          <div className="grid gap-4 md:grid-cols-3 text-center text-xs">
            {[
              { icon: '✍️', step: '1', title: 'Write a brief', sub: 'Describe your recurring campaign — topic, tone, and goals' },
              { icon: '⏰', step: '2', title: 'Set a schedule', sub: 'Choose daily, weekly, bi-weekly, or monthly' },
              { icon: '✨', step: '3', title: 'Runs automatically', sub: 'Campaign Agent generates blog, social, ads, email, and chatbot on schedule' },
            ].map(s => (
              <div key={s.step} className="space-y-2">
                <div className="text-2xl">{s.icon}</div>
                <div className="font-medium">{s.title}</div>
                <div className="text-brand-muted leading-snug">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5 p-3 text-xs text-brand-muted">
            <strong className="text-white">Requires the Autopilot worker to be running.</strong>
            {' '}Start it with: <code className="bg-white/10 px-1.5 py-0.5 rounded">npm run worker:autopilot</code>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <CreateForm onCreated={() => { setShowCreate(false); load() }} />
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="card h-40 animate-pulse" />)}
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-widest text-brand-muted">
            {items.length} autopilot{items.length !== 1 ? 's' : ''}
          </div>
          {items.map(item => (
            <AutopilotCard key={item.id} item={item} onToggle={toggle} onDelete={del} onEdit={edit} />
          ))}
        </div>
      ) : !showCreate ? (
        <div className="text-center py-8 space-y-3">
          <div className="text-4xl">⏰</div>
          <div className="font-medium">No autopilots yet</div>
          <p className="text-sm text-brand-muted max-w-sm mx-auto">
            Create your first autopilot and GrowthPilot will generate a full campaign for you on a regular schedule.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-gold text-sm">
            Create first autopilot
          </button>
        </div>
      ) : null}

      {/* Worker note for existing autopilots */}
      {items.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-brand-muted flex items-start gap-2">
          <span className="text-amber-400 flex-shrink-0 mt-0.5">ℹ</span>
          <span>
            Autopilots run via a background worker. Start it with{' '}
            <code className="bg-white/10 px-1.5 py-0.5 rounded">npm run worker:autopilot</code>
            {' '}or{' '}
            <code className="bg-white/10 px-1.5 py-0.5 rounded">npm run workers</code>
            {' '}(all workers).
          </span>
        </div>
      )}
    </div>
  )
}
