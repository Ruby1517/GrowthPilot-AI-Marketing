// app/billing/page.tsx (client)
'use client'
import { useState } from 'react'

const plans = [
  { key:'starter',  price:'$19',  features:['Basic modules','Limited usage'] },
  { key:'pro',      price:'$49',  features:['All modules','Higher limits','Priority queue'] },
  { key:'business', price:'$149', features:['All modules','Team seats','SLA','API'] },
]

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
              <div className="text-sm text-brand-muted capitalize">{p.key}</div>
              <div className="mt-1 text-3xl font-semibold">{p.price}<span className="text-base text-brand-muted">/mo</span></div>
              <ul className="mt-4 space-y-2 text-sm text-brand-muted">
                {p.features.map((f,i)=>(<li key={i}>• {f}</li>))}
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
