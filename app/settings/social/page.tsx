'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type Account = {
  platform:         'linkedin' | 'twitter'
  displayName:      string
  platformUsername: string
  connectedAt:      string
  expiresAt?:       string
}

const PLATFORMS = [
  {
    key:   'linkedin' as const,
    label: 'LinkedIn',
    color: 'bg-[#0A66C2]',
    icon:  (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    note: 'Posts as your personal LinkedIn profile. Requires a LinkedIn Developer App with w_member_social permission.',
  },
  {
    key:   'twitter' as const,
    label: 'X (Twitter)',
    color: 'bg-black',
    icon:  (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.734l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    note: 'Requires Twitter Developer App with OAuth 2.0 enabled and Basic tier access ($100/mo) for write permissions.',
  },
]

function SocialConnectionsPageInner() {
  const searchParams = useSearchParams()
  const [accounts,  setAccounts]  = useState<Account[]>([])
  const [loading,   setLoading]   = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const connected  = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/social/accounts')
      if (r.ok) setAccounts((await r.json()).accounts || [])
    } finally {
      setLoading(false)
    }
  }

  async function disconnect(platform: string) {
    if (!confirm(`Disconnect ${platform}? You can reconnect at any time.`)) return
    setDisconnecting(platform)
    await fetch('/api/social/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    })
    setAccounts(prev => prev.filter(a => a.platform !== platform))
    setDisconnecting(null)
  }

  function isConnected(platform: string) {
    return accounts.some(a => a.platform === platform)
  }

  function getAccount(platform: string) {
    return accounts.find(a => a.platform === platform)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      <div>
        <h1 className="text-2xl font-semibold">Social Connections</h1>
        <p className="text-brand-muted text-sm mt-1">
          Connect your social accounts to publish posts directly from PostPilot — no copy-pasting.
        </p>
      </div>

      {connected && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
          {connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully.
        </div>
      )}

      {errorParam && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          Connection failed: {decodeURIComponent(errorParam)}. Please try again.
        </div>
      )}

      <div className="space-y-4">
        {PLATFORMS.map(p => {
          const acc     = getAccount(p.key)
          const active  = isConnected(p.key)
          const busy    = disconnecting === p.key

          return (
            <div key={p.key} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${p.color}`}>
                    {p.icon}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {p.label}
                      {active && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Connected</span>
                      )}
                    </div>
                    {acc ? (
                      <div className="text-xs text-brand-muted mt-0.5">
                        {acc.displayName}
                        {acc.platformUsername && ` · @${acc.platformUsername}`}
                        <span className="ml-2 opacity-60">
                          since {new Date(acc.connectedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-brand-muted mt-0.5">{p.note}</div>
                    )}
                  </div>
                </div>

                {active ? (
                  <button
                    onClick={() => disconnect(p.key)}
                    disabled={busy}
                    className="text-xs px-3 py-1.5 rounded-lg border border-rose-500/25 text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50 flex-shrink-0"
                  >
                    {busy ? '…' : 'Disconnect'}
                  </button>
                ) : (
                  <a
                    href={`/api/social/connect/${p.key}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[color:var(--gold)]/30 text-[color:var(--gold)] hover:bg-[color:var(--gold)]/10 transition flex-shrink-0"
                  >
                    Connect →
                  </a>
                )}
              </div>

              {!active && (
                <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[11px] text-brand-muted leading-relaxed">
                  {p.key === 'linkedin' && (
                    <>Set <code className="bg-white/10 px-1 rounded">LINKEDIN_CLIENT_ID</code> and <code className="bg-white/10 px-1 rounded">LINKEDIN_CLIENT_SECRET</code> in your .env, then add <code className="bg-white/10 px-1 rounded">{`${typeof window !== 'undefined' ? window.location.origin : ''}/api/social/callback/linkedin`}</code> as an authorized redirect URL in your LinkedIn app.</>
                  )}
                  {p.key === 'twitter' && (
                    <>Set <code className="bg-white/10 px-1 rounded">TWITTER_CLIENT_ID</code> and <code className="bg-white/10 px-1 rounded">TWITTER_CLIENT_SECRET</code> in your .env. Twitter write access requires the Basic API plan ($100/mo). Add <code className="bg-white/10 px-1 rounded">{`${typeof window !== 'undefined' ? window.location.origin : ''}/api/social/callback/twitter`}</code> as a callback URL.</>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {loading && (
        <div className="text-center text-sm text-brand-muted py-4">Loading…</div>
      )}
    </div>
  )
}

export default function SocialConnectionsPage() {
  return <Suspense><SocialConnectionsPageInner /></Suspense>
}
