'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (p1 !== p2) { setError('Passwords do not match.'); return }
    if (p1.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({ email, password: p1 }),
    })

    if (res.ok) {
      // Auto sign in
      const s = await signIn('credentials', { redirect: false, email, password: p1, callbackUrl: '/dashboard' })
      setLoading(false)
      if (s?.ok) window.location.href = s.url || '/dashboard'
      else setError('Account created, but sign-in failed. Try logging in.')
    } else {
      setLoading(false)
      setError(res.status === 409 ? 'Account already exists. Try signing in.' : (await res.text() || 'Sign up failed'))
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="card w-full max-w-md p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 rounded-xl bg-[linear-gradient(135deg,#D4AF37,#E7D292)]" />
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-brand-muted">Email + strong password</p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 outline-none placeholder:text-brand-muted"
            required
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={p1}
            onChange={e=>setP1(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 outline-none placeholder:text-brand-muted"
            minLength={8}
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={p2}
            onChange={e=>setP2(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 outline-none placeholder:text-brand-muted"
            minLength={8}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button disabled={loading} className="btn-gold w-full">
            {loading ? 'Creating…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-muted">
          Already have an account?{' '}
          <Link href="/auth/signin" className="underline hover:text-white">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
