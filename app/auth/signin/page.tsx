'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: '/dashboard',
      })
      if (res?.ok) {
        window.location.href = res.url || '/dashboard'
        return
      }
      setError('Invalid email or password. If you don’t have an account, create one below.')
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="card w-full max-w-md p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 rounded-xl bg-[linear-gradient(135deg,#D4AF37,#E7D292)]" />
          <h1 className="text-2xl font-semibold">Welcome</h1>
          <p className="mt-1 text-sm text-brand-muted">Sign in to your account</p>
        </div>

        <form onSubmit={handleCredentials} className="mt-6 space-y-3">
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
            value={password}
            onChange={e=>setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 outline-none placeholder:text-brand-muted"
            required
            minLength={8}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button disabled={loading} className="btn-gold w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link className="underline text-brand-muted hover:text-white" href="/auth/forgot-password">
            Forgot password?
          </Link>
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
            className="btn-ghost w-full"
          >
            Continue with GitHub
          </button>
          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="btn-ghost w-full"
          >
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-brand-muted">
          Don’t have an account?{' '}
          <Link href="/auth/signup" className="underline hover:text-white">Create one</Link>
        </p>

        <p className="mt-3 text-center text-xs text-brand-muted">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
