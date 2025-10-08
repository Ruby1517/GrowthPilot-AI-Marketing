'use client'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string|null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const res = await fetch('/api/auth/request-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email })
    })
    if (res.ok) setSent(true)
    else setErr(await res.text())
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold text-center">Forgot password</h1>
        <p className="mt-1 text-sm text-brand-muted text-center">
          Enter your email and we’ll send a reset link.
        </p>
        {!sent ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 outline-none placeholder:text-brand-muted"
            />
            {err && <p className="text-sm text-red-400">{err}</p>}
            <button className="btn-gold w-full">Send reset link</button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-brand-muted text-center">
            If an account exists for <b>{email}</b>, you’ll get an email with a reset link shortly.
          </p>
        )}
      </div>
    </div>
  )
}
