'use client'
import { signIn, signOut, useSession } from 'next-auth/react'

export default function AuthButton() {
  const { data: session } = useSession()
  if (!session) return <button onClick={() => signIn()} className="btn-ghost">Sign In</button>
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-brand-muted">Hi {session.user?.name}</span>
      <button onClick={() => signOut()} className="btn-ghost">Sign Out</button>
    </div>
  )
}
