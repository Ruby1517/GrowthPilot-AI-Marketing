'use client'

import { useState } from 'react'
import IterationPanel from '@/components/IterationPanel'

// ── Sample content per module ─────────────────────────────────────────────────

type ModuleOption = {
  key: 'postpilot' | 'blogpilot' | 'adpilot' | 'mailpilot'
  label: string
  icon: string
  desc: string
  sample: any
  brief: string
  renderContent: (content: any) => React.ReactNode
}

const MODULES: ModuleOption[] = [
  {
    key: 'postpilot',
    label: 'PostPilot',
    icon: '📱',
    desc: 'Social post',
    brief: 'AI writing tool for startup founders',
    sample: {
      platform: 'linkedin',
      headline: 'Stop wasting hours on content that nobody reads',
      caption: "Every marketing team I talk to has the same problem: they spend 3 hours writing a LinkedIn post, publish it, get 12 likes from their own colleagues, and wonder why.\n\nThe issue isn't effort. It's approach.\n\nWe built GrowthPilot to flip the script. Brief once, generate everywhere. Your social, blog, ads, and email stay in sync automatically.\n\nThe result? Teams that used to spend a week on a campaign now ship in a day.\n\nIf you're still doing it the old way, I'd love to show you the new one.",
      hashtags: ['marketing', 'ai', 'contentmarketing', 'startup'],
      altText: 'A marketing team collaborating around a laptop, campaign assets flowing across channels.',
      visualIdeas: ['Split screen: old messy workflow vs. clean GrowthPilot dashboard', 'Time-lapse of a campaign being built in minutes'],
    },
    renderContent: (c: any) => (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--gold)] bg-[color:var(--gold)]/10 px-2 py-0.5 rounded-full">{c.platform}</span>
        </div>
        {c.headline && <div className="text-base font-semibold leading-tight">{c.headline}</div>}
        <div className="text-sm text-brand-muted whitespace-pre-line leading-relaxed">{c.caption}</div>
        {c.hashtags?.length > 0 && (
          <div className="text-xs text-brand-muted/70">{c.hashtags.map((h: string) => `#${h}`).join(' ')}</div>
        )}
        {c.visualIdeas?.length > 0 && (
          <div className="text-xs text-brand-muted border-t border-white/10 pt-2">
            Visual: {c.visualIdeas[0]}
          </div>
        )}
      </div>
    ),
  },
  {
    key: 'blogpilot',
    label: 'BlogPilot',
    icon: '📝',
    desc: 'Blog post draft',
    brief: 'AI content tools for marketing teams',
    sample: {
      title: '5 Ways AI Is Changing How Marketing Teams Create Content in 2025',
      metaDescription: 'Discover how AI tools are helping marketing teams create more content, faster — without sacrificing quality or brand voice.',
      outline: [
        'Introduction: The content bottleneck',
        'AI as a writing collaborator, not a replacement',
        'From brief to publish in hours, not weeks',
        'Keeping your brand voice consistent at scale',
        'The teams winning with AI content today',
        'Getting started: a practical playbook',
      ],
      draft: `# 5 Ways AI Is Changing How Marketing Teams Create Content in 2025

Marketing teams are under more pressure than ever. More channels, smaller teams, higher expectations — and the same 40-hour week.

AI is changing the equation. Not by replacing writers, but by removing the parts that don't require creativity: research, formatting, the blank-page paralysis of starting from scratch.

## 1. AI as a writing collaborator

The best AI content tools work like a first-draft machine. You provide the brief, the tone, the audience. The AI produces a working draft. You edit, refine, approve.

Teams that work this way ship 3x more content with the same headcount — not because the AI is doing their job, but because it's eliminated the slow parts.

## 2. From brief to publish in hours

The old workflow: brief → research → outline → draft → review → revise → approve → format → publish. Each step a handoff. Each handoff a delay.

With AI, steps 2-4 collapse into one. You're reviewing and approving, not writing from scratch.`,
    },
    renderContent: (c: any) => (
      <div className="space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Title</div>
          <div className="font-semibold leading-snug">{c.title}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Meta description</div>
          <div className="text-sm text-brand-muted">{c.metaDescription}</div>
        </div>
        {c.outline?.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Outline</div>
            <ol className="space-y-1">
              {c.outline.map((h: string, i: number) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-brand-muted flex-shrink-0">{i + 1}.</span>
                  <span>{h}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {c.draft && (
          <div>
            <div className="text-xs uppercase tracking-wide text-brand-muted mb-1">Draft preview</div>
            <div className="text-sm text-brand-muted whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto rounded border border-white/10 p-3 bg-white/[0.02]">
              {c.draft.slice(0, 600)}…
            </div>
          </div>
        )}
      </div>
    ),
  },
  {
    key: 'adpilot',
    label: 'AdPilot',
    icon: '🎯',
    desc: 'Ad copy variants',
    brief: 'AI marketing tool — targeting startup founders',
    sample: {
      ads: [
        {
          platform: 'meta',
          headline: 'Your marketing team shouldn\'t work harder than your product',
          hook: 'Still spending 3 hours on a LinkedIn post?',
          body: 'GrowthPilot generates your entire campaign from a single brief. Social posts, blog drafts, ad copy, email sequences — done in minutes, not days.',
          cta: 'Start free',
          audience: 'Startup founders & heads of marketing, 28–45',
        },
        {
          platform: 'google',
          headline: 'AI Marketing Tool for Startups',
          hook: 'Brief once, generate everywhere',
          body: 'PostPilot, BlogPilot, AdPilot, MailPilot — all in one dashboard. Plans from $49/mo.',
          cta: 'Try free today',
          audience: 'Search: "ai marketing tool", "content marketing automation"',
        },
      ],
    },
    renderContent: (c: any) => (
      <div className="space-y-3">
        {(c.ads || []).map((ad: any, i: number) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--gold)] bg-[color:var(--gold)]/10 px-2 py-0.5 rounded-full capitalize">{ad.platform}</span>
            </div>
            {ad.hook && <div className="text-xs text-amber-400 font-medium">Hook: {ad.hook}</div>}
            <div className="font-medium">{ad.headline}</div>
            <div className="text-sm text-brand-muted">{ad.body}</div>
            <div className="text-xs text-brand-muted">CTA: <span className="text-white">{ad.cta}</span> · {ad.audience}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'mailpilot',
    label: 'MailPilot',
    icon: '📧',
    desc: 'Email sequence',
    brief: 'SaaS onboarding sequence for new signups',
    sample: {
      emails: [
        {
          step: 1,
          subject: 'Welcome to GrowthPilot — here\'s what to do first',
          preheader: 'Your AI marketing team is ready. Let\'s build your first campaign.',
          body: 'Hi {{first_name}},\n\nWelcome aboard.\n\nYou just joined 280+ teams who\'ve replaced five point solutions with one.\n\nHere\'s what I\'d do in your first 10 minutes:\n\n1. Head to PostPilot and drop in a product brief\n2. Watch it generate platform-specific posts in 2 seconds\n3. Export, schedule, or iterate with one click\n\nIf you want a guided walkthrough, reply to this email. Happy to jump on a call.\n\n— The GrowthPilot team',
        },
        {
          step: 2,
          subject: 'Did you know GrowthPilot can run your whole campaign?',
          preheader: 'Campaign Agent: brief once, get everything.',
          body: 'Hi {{first_name}},\n\nMost teams use GrowthPilot module by module. But the Campaign Agent changes the game.\n\nType one brief → it runs BlogPilot, PostPilot, AdPilot, and MailPilot in sequence → hands you a full campaign.\n\nTeams that use it ship campaigns in 40 minutes, not 4 days.\n\nGive it a try at growthpilot.ai/agent\n\n— The GrowthPilot team',
        },
      ],
    },
    renderContent: (c: any) => (
      <div className="space-y-3">
        {(c.emails || []).map((e: any, i: number) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 space-y-0.5">
              <div className="text-xs text-brand-muted">Email {e.step}</div>
              <div className="font-medium text-sm">{e.subject}</div>
              <div className="text-xs text-brand-muted">{e.preheader}</div>
            </div>
            <div className="px-4 py-3 text-sm text-brand-muted whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">{e.body}</div>
          </div>
        ))}
      </div>
    ),
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function IterateAgentPage() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [content, setContent] = useState<any>(MODULES[0].sample)

  const mod = MODULES[selectedIdx]

  const switchModule = (i: number) => {
    setSelectedIdx(i)
    setContent(MODULES[i].sample)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-400">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Iteration Agent</h1>
            <p className="text-brand-muted text-sm">Refine any generated content with plain-language feedback</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-brand-muted space-y-1">
          <div className="text-white font-medium">How it works</div>
          <div>1. Select a module below to load sample generated content</div>
          <div>2. Click a suggestion chip or type your own feedback</div>
          <div>3. Watch the AI refine the content while preserving its structure</div>
          <div className="pt-1 text-xs">The same panel appears <span className="text-white">inside every module</span> after you generate content — no need to come here for real campaigns.</div>
        </div>
      </div>

      {/* Module selector */}
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-muted mb-2">Choose a module to try</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MODULES.map((m, i) => (
            <button
              key={m.key}
              onClick={() => switchModule(i)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                selectedIdx === i
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-brand-muted hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <div className="text-lg">{m.icon}</div>
              <div className="text-sm font-medium mt-1">{m.label}</div>
              <div className="text-[10px] opacity-60">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content preview */}
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-muted mb-2">
          Current content — {mod.label} sample
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          {mod.renderContent(content)}
        </div>
      </div>

      {/* Iteration Panel */}
      <IterationPanel
        module={mod.key}
        content={content}
        brief={mod.brief}
        onUpdate={(updated) => setContent(updated)}
        label={`Refine this ${mod.desc}`}
      />
    </div>
  )
}
