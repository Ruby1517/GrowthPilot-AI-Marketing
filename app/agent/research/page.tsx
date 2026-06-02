'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ResearchResult } from '@/lib/agent/research'

// ── Helpers ───────────────────────────────────────────────────────────────────

function copy(text: string) { navigator.clipboard.writeText(text).catch(() => {}) }

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
        strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
    </svg>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ icon, title, children, onCopy }: {
  icon: string; title: string; children: React.ReactNode; onCopy?: () => void
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        {onCopy && (
          <button onClick={onCopy} className="btn-ghost text-xs">Copy</button>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

// ── Tag pill ─────────────────────────────────────────────────────────────────

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs border border-white/15 bg-white/5">
      {children}
    </span>
  )
}

// ── Module destination buttons ────────────────────────────────────────────────

const MODULES = [
  { key: 'blogpilot',  label: 'Write Blog',    href: '/blogpilot',  icon: '📝' },
  { key: 'postpilot',  label: 'Social Posts',  href: '/postpilot',  icon: '📱' },
  { key: 'adpilot',    label: 'Generate Ads',  href: '/adpilot',    icon: '🎯' },
  { key: 'mailpilot',  label: 'Write Email',   href: '/mailpilot',  icon: '📧' },
  { key: 'agent',      label: 'Full Campaign', href: '/agent',      icon: '✨' },
] as const

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResearchAgentPage() {
  const [topic,    setTopic]    = useState('')
  const [url,      setUrl]      = useState('')
  const [audience, setAudience] = useState('')
  const [module,   setModule]   = useState<'any'|'blogpilot'|'postpilot'|'adpilot'|'mailpilot'>('any')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [result,  setResult]  = useState<ResearchResult | null>(null)
  const [copied,  setCopied]  = useState<string | null>(null)

  function copyField(key: string, text: string) {
    copy(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function research(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) { setError('Enter a topic to research.'); return }
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await fetch('/api/agent/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          url: url.trim() || undefined,
          targetAudience: audience.trim() || undefined,
          module: module === 'any' ? undefined : module,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Research failed')
      setResult(data)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-violet-400">
              <path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5Z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Research Agent</h1>
            <p className="text-brand-muted text-sm">
              Enter a topic — get keywords, gaps, angles, and an enriched brief ready for any module.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        {[
          { icon: '🔍', label: 'Analyzes topic', sub: 'finds angles & gaps' },
          { icon: '🎯', label: 'Maps keywords', sub: '8-12 real search terms' },
          { icon: '📋', label: 'Enriched brief', sub: 'paste into any module' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 space-y-1">
            <div className="text-xl">{s.icon}</div>
            <div className="font-medium">{s.label}</div>
            <div className="text-brand-muted">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={research} className="card p-6 space-y-5">

        <div>
          <label className="text-sm font-medium block mb-1.5">Topic or keyword *</label>
          <textarea
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 placeholder:text-brand-muted/60 leading-relaxed"
            rows={2}
            placeholder="e.g. AI marketing tools for startups, or: how to reduce churn in SaaS"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            maxLength={500}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs text-brand-muted block mb-1.5">Reference URL <span className="opacity-60">(optional)</span></label>
            <input
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              placeholder="https://yoursite.com or a competitor URL"
              value={url}
              onChange={e => setUrl(e.target.value)}
              type="url"
            />
          </div>
          <div>
            <label className="text-xs text-brand-muted block mb-1.5">Target audience <span className="opacity-60">(optional)</span></label>
            <input
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              placeholder="e.g. startup founders, B2B marketers"
              value={audience}
              onChange={e => setAudience(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-brand-muted block mb-1.5">Optimise for</label>
          <div className="flex flex-wrap gap-2">
            {([
              { value: 'any',       label: 'All channels' },
              { value: 'blogpilot', label: '📝 Blog' },
              { value: 'postpilot', label: '📱 Social' },
              { value: 'adpilot',   label: '🎯 Ads' },
              { value: 'mailpilot', label: '📧 Email' },
            ] as const).map(m => (
              <button key={m.value} type="button"
                onClick={() => setModule(m.value as any)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${module === m.value ? 'border-violet-500/50 bg-violet-500/10 text-white' : 'border-white/10 text-brand-muted hover:border-white/20'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">{error}</div>
        )}

        <button type="submit" disabled={loading || !topic.trim()}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition">
          {loading ? <><Spinner />Researching…</> : '🔍 Research this topic'}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-4">

          {/* Header */}
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-4 space-y-1">
            <div className="text-xs uppercase tracking-widest text-violet-400">Research complete</div>
            <div className="font-semibold text-lg leading-snug">{result.suggestedTitle || result.topic}</div>
            {result.targetAudience && (
              <div className="text-sm text-brand-muted">For: {result.targetAudience}</div>
            )}
          </div>

          {/* Best angle */}
          <Section icon="🎯" title="Best angle">
            <p className="text-sm leading-relaxed">{result.angle}</p>
          </Section>

          {/* Enriched brief */}
          <Section
            icon="📋"
            title="Enriched brief — paste into any module"
            onCopy={() => copyField('brief', result.enrichedBrief)}
          >
            <p className={`text-sm leading-relaxed text-white/85 ${copied === 'brief' ? 'opacity-60' : ''}`}>
              {result.enrichedBrief}
            </p>
            {copied === 'brief' && (
              <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                Copied to clipboard
              </div>
            )}
          </Section>

          {/* Keywords */}
          {result.keywords.length > 0 && (
            <Section
              icon="🔑"
              title={`Keywords (${result.keywords.length})`}
              onCopy={() => copyField('keywords', result.keywords.join(', '))}
            >
              <div className="flex flex-wrap gap-1.5">
                {result.keywords.map((k, i) => <Tag key={i}>{k}</Tag>)}
              </div>
            </Section>
          )}

          {/* Questions */}
          {result.questions.length > 0 && (
            <Section
              icon="❓"
              title="Questions to answer"
              onCopy={() => copyField('questions', result.questions.map((q, i) => `${i+1}. ${q}`).join('\n'))}
            >
              <ol className="space-y-2">
                {result.questions.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-brand-muted flex-shrink-0">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* Gaps & competitor angles */}
          <div className="grid gap-4 md:grid-cols-2">
            {result.gaps.length > 0 && (
              <Section icon="🕳️" title="Content gaps">
                <ul className="space-y-1.5">
                  {result.gaps.map((g, i) => (
                    <li key={i} className="text-sm text-brand-muted flex gap-2">
                      <span className="text-emerald-400 flex-shrink-0">+</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {result.competitorAngles.length > 0 && (
              <Section icon="⚠️" title="Avoid these (overdone)">
                <ul className="space-y-1.5">
                  {result.competitorAngles.map((a, i) => (
                    <li key={i} className="text-sm text-brand-muted flex gap-2">
                      <span className="text-rose-400 flex-shrink-0">−</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          {/* Use in module */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-brand-muted">Use this research in</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {MODULES.map(m => (
                <Link
                  key={m.key}
                  href={m.href}
                  onClick={() => {
                    // Store the enriched brief in sessionStorage so the module can pick it up
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('gp_research_brief', result.enrichedBrief)
                      sessionStorage.setItem('gp_research_keywords', result.keywords.join(', '))
                      sessionStorage.setItem('gp_research_title', result.suggestedTitle || '')
                    }
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center hover:border-white/25 hover:bg-white/10 transition"
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-xs font-medium">{m.label}</span>
                </Link>
              ))}
            </div>
            <p className="text-xs text-brand-muted">
              Clicking will open the module. Paste the enriched brief into the form — or copy it above.
            </p>
          </div>

        </div>
      )}
    </div>
  )
}
