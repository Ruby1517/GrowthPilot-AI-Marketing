// app/billing/page.tsx (client)
'use client'
import { useState } from 'react'
import { modulePlan, moduleLabels } from '@/lib/modules'

const plans = [
  { key:'starter',  price:'$19',  features:['Basic modules','Limited usage'] },
  { key:'pro',      price:'$49',  features:['More modules','Higher limits','Priority queue'] },
  { key:'business', price:'$149', features:['All modules','Team seats','SLA','API'] },
] as const

type PlanName = 'Starter'|'Pro'|'Business'
const PLAN_ORDER: Record<PlanName, number> = { Starter: 1, Pro: 2, Business: 3 }

function includedModules(plan: PlanName) {
  const maxRank = PLAN_ORDER[plan]
  return (Object.keys(modulePlan) as Array<keyof typeof modulePlan>)
    .filter((m) => PLAN_ORDER[modulePlan[m] as PlanName] <= maxRank)
    .map(m => ({ key: m, label: moduleLabels[m] }))
}

export default function BillingPage() {
  const [loading, setLoading] = useState<string|null>(null)
  async function go(plan: 'starter'|'pro'|'business') {
    setLoading(plan)
    const res = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ plan }) // ✅ not priceId / not prod_…
    })
    if (!res.ok) {
      const text = await res.text()
      alert(`Checkout failed: ${text}`)
      setLoading(null)
      return
    }
    const { url } = await res.json()
    window.location.href = url
  }
  async function portal() {
    const res = await fetch('/api/billing/create-portal', { method: 'POST' })
    const { url } = await res.json()
    window.location.href = url
  }
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold">Choose a Plan</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {plans.map(p => (
            <div key={p.key} className="card p-6">
              <div className="text-sm dark:text-brand-muted text-black/80 capitalize">{p.key}</div>
              <div className="mt-1 text-3xl font-semibold">{p.price}<span className="text-base dark:text-brand-muted text-black/70">/mo</span></div>
              <ul className="mt-4 space-y-2 text-sm dark:text-brand-muted text-black/80">
                {p.features.map((f,i)=>(<li key={i}>• {f}</li>))}
              </ul>
              <div className="mt-4 text-sm dark:text-brand-muted text-black/80">Includes modules</div>
              <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                {includedModules(p.key === 'starter' ? 'Starter' : p.key === 'pro' ? 'Pro' : 'Business').map(m => (
                  <li key={String(m.key)} className="px-2 py-1 rounded-md dark:bg-white/5 dark:text-white/90 bg-black/5 text-black/90">{m.label}</li>
                ))}
              </ul>
              <button onClick={()=>go(p.key as any)} className="mt-5 w-full btn-gold">
                {loading===p.key ? '…' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <button onClick={portal} className="btn-ghost">Manage Subscription</button>
        </div>
      </div>
    </div>
  )
}
