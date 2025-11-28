// app/auth/reset/page.tsx
'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useMemo, Suspense } from 'react'

function ResetPasswordInner() {
  const sp = useSearchParams()
  const router = useRouter()
  const token = useMemo(() => sp.get('token') || '', [sp])
  const email = useMemo(() => sp.get('email') || '', [sp])

  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string|null>(null)
  const [err, setErr] = useState<string|null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setMsg(null); setLoading(true)
    if (p1 !== p2) { setErr('Passwords do not match.'); setLoading(false); return }
    const res = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, token, password: p1 })
    })
    setLoading(false)
    if (res.ok) {
      setMsg('Password updated. You can now sign in.')
      setTimeout(()=> router.push('/auth/signin'), 1200)
    } else {
      setErr(await res.text() || 'Reset failed.')
    }
  }

  const invalidLink = !email || !token

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold text-center">Reset password</h1>
        {invalidLink ? (
          <p className="mt-4 text-center text-sm text-brand-muted">
            Invalid reset link. Request a new one on the{' '}
            <a className="underline" href="/auth/forgot-password">Forgot password</a> page.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              type="password" placeholder="New password (min 8 chars)"
              value={p1} onChange={e=>setP1(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 outline-none placeholder:text-brand-muted"
              minLength={8} required
            />
            <input
              type="password" placeholder="Confirm password"
              value={p2} onChange={e=>setP2(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 outline-none placeholder:text-brand-muted"
              minLength={8} required
            />
            {err && <p className="text-sm text-red-400">{err}</p>}
            {msg && <p className="text-sm text-emerald-400">{msg}</p>}
            <button disabled={loading} className="btn-gold w-full">
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  )
}
