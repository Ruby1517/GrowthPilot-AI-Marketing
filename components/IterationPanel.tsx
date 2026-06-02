'use client'

import { useState, useRef, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Module = 'postpilot' | 'blogpilot' | 'adpilot' | 'mailpilot' | 'leadpilot'

type HistoryEntry = {
  content: any
  feedback: string
  explanation: string
}

type Props = {
  module: Module
  content: any             // current generated content to refine
  onUpdate: (newContent: any, explanation: string) => void
  brief?: string           // original brief for context
  className?: string
  label?: string           // override label shown above input
}

// ── Suggestion chips per module ───────────────────────────────────────────────

const SUGGESTIONS: Record<Module, string[]> = {
  postpilot: [
    'Make it shorter',
    'Add more urgency',
    'More conversational tone',
    'Stronger hook in the first line',
    'Change the CTA',
    'Make it more professional',
  ],
  blogpilot: [
    'Make the intro punchier',
    'Shorten to ~600 words',
    'Add more real-world examples',
    'Strengthen the conclusion with a CTA',
    'More authoritative tone',
    'Add a FAQ section at the end',
  ],
  adpilot: [
    'Focus on the pain point angle',
    'Make the hooks more aggressive',
    'Shorter primary text',
    'Stronger CTAs',
    'More benefit-focused headlines',
    'Add social proof angle',
  ],
  mailpilot: [
    'Make it more conversational',
    'Shorten all emails by 30%',
    'Stronger subject lines',
    'Add more urgency to email 1',
    'Change the CTA to Start free trial',
    'More personal, less salesy',
  ],
  leadpilot: [
    'Friendlier opening',
    'Shorter qualifying questions',
    'More direct CTA',
    'Add a social proof question',
    'Reduce to 2 questions max',
  ],
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
        strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IterationPanel({
  module,
  content,
  onUpdate,
  brief,
  className = '',
  label,
}: Props) {
  const [feedback,     setFeedback]     = useState('')
  const [isLoading,    setIsLoading]    = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [history,      setHistory]      = useState<HistoryEntry[]>([])
  const [explanation,  setExplanation]  = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const suggestions = SUGGESTIONS[module] || []

  const submit = useCallback(async (feedbackText: string) => {
    const text = feedbackText.trim()
    if (!text || isLoading) return

    setIsLoading(true)
    setError(null)
    setExplanation(null)

    try {
      const r = await fetch('/api/agent/iterate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, content, feedback: text, brief }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error || 'Iteration failed')
        return
      }

      // Push current version to history before updating
      setHistory(prev => [...prev, { content, feedback: text, explanation: data.explanation }])
      setExplanation(data.explanation)
      onUpdate(data.content, data.explanation)
      setFeedback('')
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [content, module, brief, isLoading, onUpdate])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(feedback)
    }
  }

  const handleUndo = () => {
    if (!history.length) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setExplanation(null)
    onUpdate(prev.content, '')
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[color:var(--gold,theme(colors.brand.gold))]">
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          <span className="text-sm font-medium">
            {label || 'Refine with AI'}
          </span>
          {history.length > 0 && (
            <span className="text-[10px] text-brand-muted bg-white/10 px-1.5 py-0.5 rounded-full">
              v{history.length + 1}
            </span>
          )}
        </div>
        {history.length > 0 && (
          <button
            onClick={handleUndo}
            className="text-xs text-brand-muted hover:text-white flex items-center gap-1 transition"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
              <path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
            </svg>
            Undo
          </button>
        )}
      </div>

      {/* Explanation of last change */}
      {explanation && (
        <div className="px-4 py-2 text-xs text-emerald-400 bg-emerald-500/5 border-b border-white/10 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
          {explanation}
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              disabled={isLoading}
              className="text-xs px-2.5 py-1 rounded-full border border-white/15 hover:border-white/30 hover:bg-white/5 transition disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Free-form input */}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)] placeholder:text-brand-muted/60"
            rows={2}
            placeholder="Describe what to change… (Enter to apply)"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            maxLength={1000}
          />
          <button
            type="button"
            onClick={() => submit(feedback)}
            disabled={isLoading || !feedback.trim()}
            className="btn-gold px-4 py-2 flex items-center gap-1.5 disabled:opacity-40 flex-shrink-0"
          >
            {isLoading ? <><Spinner /> Refining…</> : <>Apply</>}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* History trail */}
        {history.length > 0 && (
          <div className="text-[10px] text-brand-muted space-y-0.5 pt-1 border-t border-white/10">
            <div className="font-medium mb-1">History</div>
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-1.5 opacity-70">
                <span className="flex-shrink-0 mt-0.5">v{i + 1}→</span>
                <span className="italic">&ldquo;{h.feedback}&rdquo;</span>
                <span className="mx-1">·</span>
                <span>{h.explanation}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
