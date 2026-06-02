'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

type StepStatus = 'running' | 'done' | 'failed'

type Step = {
  tool: string
  label: string
  status: StepStatus
  input: Record<string, any>
  output?: any
  error?: string
  startedAt: string
  completedAt?: string
}

type JobState = {
  id: string
  status: 'queued' | 'running' | 'done' | 'failed'
  brief: string
  company?: string
  audience?: string
  steps: Step[]
  summary?: string
  error?: string
  createdAt: string
}

const TOOL_ICON: Record<string, string> = {
  generate_blog:          '📝',
  generate_social_posts:  '📱',
  generate_ads:           '🎯',
  generate_email:         '📧',
  configure_lead_chatbot: '💬',
}

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({ step }: { step: Step }) {
  const [expanded, setExpanded] = useState(false)
  const icon = TOOL_ICON[step.tool] || '⚙️'

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        onClick={() => step.status === 'done' && setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        disabled={step.status !== 'done'}
      >
        {/* status indicator */}
        <span className="text-lg flex-shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-medium">{step.label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          step.status === 'done'    ? 'bg-emerald-500/20 text-emerald-400' :
          step.status === 'failed'  ? 'bg-rose-500/20 text-rose-400' :
                                      'bg-amber-500/20 text-amber-400'
        }`}>
          {step.status === 'running' ? 'generating…' : step.status}
        </span>
        {step.status === 'done' && (
          <svg viewBox="0 0 24 24" className={`w-4 h-4 opacity-50 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <path fill="currentColor" d="m6 9 6 6 6-6H6Z"/>
          </svg>
        )}
      </button>

      {/* Expanded output */}
      {expanded && step.status === 'done' && step.output && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-4 text-sm">
          <StepOutput tool={step.tool} output={step.output} />
        </div>
      )}

      {step.status === 'failed' && step.error && (
        <div className="border-t border-white/10 px-4 pb-3 pt-2 text-xs text-rose-400">
          {step.error}
        </div>
      )}
    </div>
  )
}

// ── Per-tool output renderers ─────────────────────────────────────────────────

function StepOutput({ tool, output }: { tool: string; output: any }) {
  switch (tool) {
    case 'generate_blog':
      return <BlogOutput data={output} />
    case 'generate_social_posts':
      return <SocialOutput data={output} />
    case 'generate_ads':
      return <AdOutput data={output} />
    case 'generate_email':
      return <EmailOutput data={output} />
    case 'configure_lead_chatbot':
      return <ChatbotOutput data={output} />
    default:
      return <pre className="text-xs opacity-60 whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
  }
}

function BlogOutput({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.title && <div className="font-semibold text-base">{data.title}</div>}
      {data.metaDescription && (
        <div className="text-xs text-brand-muted">Meta: {data.metaDescription}</div>
      )}
      {data.outline?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Outline</div>
          <ol className="list-decimal pl-4 space-y-0.5 text-xs opacity-80">
            {data.outline.map((h: string, i: number) => <li key={i}>{h}</li>)}
          </ol>
        </div>
      )}
      {data.draft && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-brand-muted hover:text-white">View full draft</summary>
          <div className="mt-2 text-xs opacity-80 whitespace-pre-wrap leading-relaxed border-l-2 border-white/10 pl-3">
            {data.draft}
          </div>
        </details>
      )}
    </div>
  )
}

function SocialOutput({ data }: { data: any }) {
  const posts = data.posts || []
  return (
    <div className="space-y-3">
      {posts.map((p: any, i: number) => (
        <div key={i} className="rounded-lg border border-white/10 p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs text-brand-muted">
            <span className="capitalize font-medium text-white">{p.platform}</span>
            {p.variant > 1 && <span>· v{p.variant}</span>}
          </div>
          {p.headline && <div className="font-medium">{p.headline}</div>}
          <div className="text-xs opacity-80 whitespace-pre-wrap">{p.caption}</div>
          {p.hashtags?.length > 0 && (
            <div className="text-xs text-brand-muted">
              {p.hashtags.map((h: string) => `#${h}`).join(' ')}
            </div>
          )}
          {p.visualIdeas?.length > 0 && (
            <div className="text-xs text-brand-muted">
              Visual: {p.visualIdeas[0]}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function AdOutput({ data }: { data: any }) {
  const ads = data.ads || []
  return (
    <div className="space-y-3">
      {ads.map((ad: any, i: number) => (
        <div key={i} className="rounded-lg border border-white/10 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white capitalize">{ad.platform}</span>
          </div>
          {ad.hook && <div className="text-xs font-semibold text-amber-400">Hook: {ad.hook}</div>}
          {ad.headline && <div className="font-medium">{ad.headline}</div>}
          <div className="text-xs opacity-80">{ad.body}</div>
          {ad.cta && <div className="text-xs text-brand-muted">CTA: {ad.cta}</div>}
          {ad.audience && <div className="text-xs text-brand-muted">Audience: {ad.audience}</div>}
        </div>
      ))}
    </div>
  )
}

function EmailOutput({ data }: { data: any }) {
  const emails = data.emails || []
  return (
    <div className="space-y-3">
      {emails.map((e: any, i: number) => (
        <details key={i} className="rounded-lg border border-white/10 overflow-hidden">
          <summary className="cursor-pointer px-3 py-2 flex items-center gap-2 text-sm">
            <span className="text-xs text-brand-muted">Email {e.step ?? i + 1}</span>
            <span className="font-medium">{e.subject}</span>
          </summary>
          <div className="border-t border-white/10 px-3 py-2 space-y-1">
            {e.preheader && <div className="text-xs text-brand-muted">{e.preheader}</div>}
            <div className="text-xs opacity-80 whitespace-pre-wrap leading-relaxed">{e.body}</div>
          </div>
        </details>
      ))}
    </div>
  )
}

function ChatbotOutput({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.greeting && (
        <div>
          <div className="text-xs text-brand-muted mb-1">Opening message</div>
          <div className="text-sm italic">&ldquo;{data.greeting}&rdquo;</div>
        </div>
      )}
      {data.questions?.length > 0 && (
        <div>
          <div className="text-xs text-brand-muted mb-1">Qualifying questions</div>
          <ol className="list-decimal pl-4 space-y-0.5 text-xs opacity-80">
            {data.questions.map((q: string, i: number) => <li key={i}>{q}</li>)}
          </ol>
        </div>
      )}
      {data.cta && (
        <div>
          <div className="text-xs text-brand-muted mb-1">CTA</div>
          <div className="text-sm">{data.cta}</div>
        </div>
      )}
      {data.systemPrompt && (
        <details>
          <summary className="cursor-pointer text-xs text-brand-muted">View system prompt</summary>
          <div className="mt-2 text-xs opacity-80 whitespace-pre-wrap border-l-2 border-white/10 pl-3">
            {data.systemPrompt}
          </div>
        </details>
      )}
      {data.embedInstructions && (
        <div className="text-xs text-brand-muted">💡 {data.embedInstructions}</div>
      )}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
    </svg>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function AgentPageInner() {
  const searchParams = useSearchParams()
  const [brief,    setBrief]    = useState('')
  const [company,  setCompany]  = useState('')
  const [audience, setAudience] = useState('')
  const [jobId,    setJobId]    = useState<string | null>(searchParams.get('jobId'))
  const [job,      setJob]      = useState<JobState | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll for job status
  useEffect(() => {
    if (!jobId) return
    const tick = async () => {
      try {
        const r = await fetch(`/api/agent/status/${jobId}`, { cache: 'no-store' })
        if (!r.ok) return
        const data: JobState = await r.json()
        setJob(data)
        if (data.status === 'done' || data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {}
    }
    tick()
    pollRef.current = setInterval(tick, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId])

  const submit = async () => {
    if (!brief.trim() || loading) return
    setLoading(true)
    setError(null)
    setJob(null)
    setJobId(null)
    try {
      const r = await fetch('/api/agent/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brief: brief.trim(), company: company.trim() || undefined, audience: audience.trim() || undefined }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Failed to start agent'); return }
      setJobId(data.jobId)
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setJobId(null)
    setJob(null)
    setError(null)
  }

  const isRunning  = job?.status === 'queued' || job?.status === 'running'
  const isDone     = job?.status === 'done'
  const isFailed   = job?.status === 'failed'

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Campaign Agent</h1>
        <p className="text-brand-muted mt-1 text-sm">
          Describe your campaign. The agent plans which content to create and runs all the tools for you.
        </p>
      </div>

      {/* Form — hide once a job is running */}
      {!jobId && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Campaign Brief *</label>
            <textarea
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
              rows={4}
              placeholder="e.g. Launch our new AI writing tool to startup founders. We want to drive signups, build SEO presence, and retarget visitors who don't convert."
              value={brief}
              onChange={e => setBrief(e.target.value)}
              maxLength={2000}
            />
            <div className="text-xs text-brand-muted text-right mt-0.5">{brief.length}/2000</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Company / Product <span className="text-brand-muted font-normal">(optional)</span></label>
              <input
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
                placeholder="Acme AI"
                value={company}
                onChange={e => setCompany(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Target Audience <span className="text-brand-muted font-normal">(optional)</span></label>
              <input
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]"
                placeholder="Startup founders, B2B SaaS"
                value={audience}
                onChange={e => setAudience(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading || brief.trim().length < 10}
            className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <><Spinner /> Starting agent…</> : <>✨ Run Campaign Agent</>}
          </button>

          <p className="text-xs text-center text-brand-muted">
            The agent reads your brief, decides what to create, and runs the tools — blog, social, ads, email, or chatbot.
          </p>
        </div>
      )}

      {/* Live status */}
      {jobId && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isRunning && <Spinner />}
              {isDone    && <span className="text-emerald-400">✓</span>}
              {isFailed  && <span className="text-rose-400">✗</span>}
              <span className="text-sm font-medium">
                {isRunning ? 'Agent is working…'  : ''}
                {isDone    ? 'Campaign complete'   : ''}
                {isFailed  ? 'Agent failed'        : ''}
                {!job      ? 'Waiting to start…'  : ''}
              </span>
            </div>
            <button onClick={reset} className="btn-ghost text-xs">New campaign</button>
          </div>

          {/* Brief recap */}
          {job && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-muted">
              <span className="text-white font-medium">{job.brief.slice(0, 120)}{job.brief.length > 120 ? '…' : ''}</span>
              {job.company  && <span className="ml-2">· {job.company}</span>}
              {job.audience && <span className="ml-2">· {job.audience}</span>}
            </div>
          )}

          {/* Steps */}
          {job?.steps && job.steps.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-brand-muted">Generated content</div>
              {job.steps.map((step, i) => (
                <StepCard key={`${step.tool}-${i}`} step={step} />
              ))}
            </div>
          )}

          {/* Queued / no steps yet */}
          {job && job.steps.length === 0 && isRunning && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-brand-muted">
              <Spinner />
              <div className="mt-2">Agent is planning your campaign…</div>
            </div>
          )}

          {/* Summary */}
          {isDone && job?.summary && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 space-y-1">
              <div className="text-xs uppercase tracking-wide text-emerald-400 font-medium">Agent summary</div>
              <div className="text-sm leading-relaxed">{job.summary}</div>
            </div>
          )}

          {/* Error */}
          {isFailed && job?.error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
              {job.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentPage() {
  return <Suspense><AgentPageInner /></Suspense>
}
