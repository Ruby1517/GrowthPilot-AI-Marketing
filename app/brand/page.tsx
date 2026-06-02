'use client'

import { useEffect, useState } from 'react'

type BrandVoice = {
  companyName?:        string
  productDescription?: string
  targetAudience?:     string
  toneOfVoice?: string
  brandKeywords?: string[]
  bannedWords?: string[]
  contentGoals?: string[]
  writingStyle?: string
  competitors?: string[]
}

const TONES = ['Professional', 'Casual', 'Playful', 'Authoritative', 'Empathetic', 'Witty']

const GOALS = [
  { value: 'seo',       label: 'SEO & organic traffic' },
  { value: 'leads',     label: 'Lead generation' },
  { value: 'awareness', label: 'Brand awareness' },
  { value: 'sales',     label: 'Direct sales' },
  { value: 'retention', label: 'Customer retention' },
  { value: 'thought',   label: 'Thought leadership' },
]

function TagInput({
  label, values, onChange, placeholder,
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const trimmed = input.trim()
    if (!trimmed || values.includes(trimmed)) { setInput(''); return }
    onChange([...values, trimmed])
    setInput('')
  }

  function remove(v: string) {
    onChange(values.filter(x => x !== v))
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-brand-muted block">{label}</label>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <button type="button" onClick={add}
          className="px-3 py-2 rounded-xl border border-white/15 text-sm hover:bg-white/5 transition">
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map(v => (
            <span key={v} className="flex items-center gap-1 text-xs bg-white/10 px-2.5 py-1 rounded-full">
              {v}
              <button type="button" onClick={() => remove(v)} className="opacity-50 hover:opacity-100 transition ml-0.5">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
        strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
    </svg>
  )
}

export default function BrandVoicePage() {
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [companyName,        setCompanyName]        = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [targetAudience,     setTargetAudience]     = useState('')
  const [toneOfVoice,        setToneOfVoice]        = useState('')
  const [writingStyle,       setWritingStyle]       = useState('')
  const [brandKeywords,      setBrandKeywords]      = useState<string[]>([])
  const [bannedWords,        setBannedWords]        = useState<string[]>([])
  const [contentGoals,       setContentGoals]       = useState<string[]>([])
  const [competitors,        setCompetitors]        = useState<string[]>([])

  useEffect(() => {
    fetch('/api/brand')
      .then(r => r.json())
      .then(({ brandVoice: bv }: { brandVoice: BrandVoice }) => {
        if (!bv) return
        setCompanyName(bv.companyName ?? '')
        setProductDescription(bv.productDescription ?? '')
        setTargetAudience(bv.targetAudience ?? '')
        setToneOfVoice(bv.toneOfVoice ?? '')
        setWritingStyle(bv.writingStyle ?? '')
        setBrandKeywords(bv.brandKeywords ?? [])
        setBannedWords(bv.bannedWords ?? [])
        setContentGoals(bv.contentGoals ?? [])
        setCompetitors(bv.competitors ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggleGoal(v: string) {
    setContentGoals(prev =>
      prev.includes(v) ? prev.filter(g => g !== v) : [...prev, v]
    )
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    try {
      const r = await fetch('/api/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName:        companyName.trim() || undefined,
          productDescription: productDescription.trim() || undefined,
          targetAudience:     targetAudience.trim() || undefined,
          toneOfVoice:        toneOfVoice || undefined,
          writingStyle:       writingStyle.trim() || undefined,
          brandKeywords:      brandKeywords.length ? brandKeywords : undefined,
          bannedWords:        bannedWords.length   ? bannedWords   : undefined,
          contentGoals:       contentGoals.length  ? contentGoals  : undefined,
          competitors:        competitors.length   ? competitors   : undefined,
        }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed to save') }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const isEmpty = !companyName && !productDescription && !targetAudience && !toneOfVoice

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Brand Voice</h1>
        <p className="text-brand-muted text-sm mt-1">
          Define your brand once. Every piece of content — blogs, social posts, ads, emails — will automatically follow these guidelines.
        </p>
      </div>

      {isEmpty && (
        <div className="rounded-2xl border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5 px-5 py-4 text-sm text-brand-muted">
          <span className="text-white font-medium">Start here.</span> Fill in as much as you know — even just company name and tone will meaningfully improve every generation.
        </div>
      )}

      <form onSubmit={save} className="space-y-6">

        {/* Identity */}
        <div className="card p-6 space-y-5">
          <div className="text-xs uppercase tracking-widest text-brand-muted">Identity</div>

          <div>
            <label className="text-xs text-brand-muted block mb-1.5">Company / product name</label>
            <input
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
              placeholder="e.g. Acme AI"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-xs text-brand-muted block mb-1.5">What you do <span className="opacity-60">(product/service description)</span></label>
            <textarea
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)] leading-relaxed"
              rows={3}
              placeholder="e.g. We build AI-powered marketing tools that help B2B startups generate content and capture leads automatically."
              value={productDescription}
              onChange={e => setProductDescription(e.target.value)}
              maxLength={1000}
            />
            <div className="text-right text-[10px] text-brand-muted mt-0.5">{productDescription.length}/1000</div>
          </div>

          <div>
            <label className="text-xs text-brand-muted block mb-1.5">Target audience</label>
            <textarea
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)] leading-relaxed"
              rows={2}
              placeholder="e.g. B2B SaaS founders and marketing teams at early-stage startups (5–50 employees)"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        {/* Tone */}
        <div className="card p-6 space-y-5">
          <div className="text-xs uppercase tracking-widest text-brand-muted">Tone of voice</div>

          <div className="grid grid-cols-3 gap-2">
            {TONES.map(t => (
              <button key={t} type="button" onClick={() => setToneOfVoice(toneOfVoice === t ? '' : t)}
                className={`rounded-xl border px-3 py-2.5 text-sm text-left transition ${toneOfVoice === t ? 'border-[color:var(--gold)]/50 bg-[color:var(--gold)]/10 text-[color:var(--gold)]' : 'border-white/10 hover:border-white/20'}`}>
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-brand-muted block mb-1.5">Writing style notes <span className="opacity-60">(optional)</span></label>
            <textarea
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)] leading-relaxed"
              rows={2}
              placeholder="e.g. Short sentences. No jargon. Always use active voice. Lead with the benefit."
              value={writingStyle}
              onChange={e => setWritingStyle(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        {/* Keywords & bans */}
        <div className="card p-6 space-y-5">
          <div className="text-xs uppercase tracking-widest text-brand-muted">Keywords & guardrails</div>

          <TagInput
            label="Brand keywords / phrases to always use"
            values={brandKeywords}
            onChange={setBrandKeywords}
            placeholder='e.g. "AI-powered", "effortless growth"  → press Enter'
          />

          <TagInput
            label="Banned words / phrases to never use"
            values={bannedWords}
            onChange={setBannedWords}
            placeholder='e.g. "cheap", "disruptive"  → press Enter'
          />

          <TagInput
            label="Competitors to never mention or praise"
            values={competitors}
            onChange={setCompetitors}
            placeholder='e.g. "HubSpot", "Mailchimp"  → press Enter'
          />
        </div>

        {/* Goals */}
        <div className="card p-6 space-y-4">
          <div className="text-xs uppercase tracking-widest text-brand-muted">Content goals</div>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map(g => (
              <button key={g.value} type="button" onClick={() => toggleGoal(g.value)}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm text-left transition ${contentGoals.includes(g.value) ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-white/10 hover:border-white/20'}`}>
                <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${contentGoals.includes(g.value) ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'}`}>
                  {contentGoals.includes(g.value) && (
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-white">
                      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  )}
                </span>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="btn-gold flex items-center gap-2 px-6 py-2.5 disabled:opacity-50">
            {saving ? <><Spinner />Saving…</> : 'Save brand voice'}
          </button>
          {saved && (
            <span className="text-sm text-emerald-400 flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              Saved — all new content will use these settings
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
