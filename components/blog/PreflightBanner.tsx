// components/blog/PreflightBanner.tsx
'use client'
import { useState } from 'react'

export default function PreflightBanner({ orgId, renderedPrompt, predictedWords }:{
  orgId: string
  renderedPrompt: string
  predictedWords: number
}) {
  const [res, setRes] = useState<any>(null)
  async function check() {
    const r = await fetch('/api/blog/preflight', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ orgId, renderedPrompt, predictedWords })
    }).then(r=>r.json())
    setRes(r)
  }
  return (
    <div className="space-y-2">
      <button onClick={check} className="border rounded-xl px-3 py-2">Check limits</button>
      {!!res && (
        res.limit?.ok
          ? <div className="border rounded-xl p-3">✅ Within plan.</div>
          : <div className="border border-red-600 rounded-xl p-3">
              ⚠️ Limit exceeded. {res.limit?.overUnits ? `Over by ~${res.limit.overUnits} words.` : null}
              <div className="text-sm opacity-70">Upgrade or accept overage at checkout.</div>
            </div>
      )}
    </div>
  )
}
