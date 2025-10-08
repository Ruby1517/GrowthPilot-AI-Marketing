'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function UserMenu() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  if (status === 'loading') {
    return <div className="h-9 w-28 rounded-xl bg-white/5 animate-pulse" />
  }

  if (!session) {
    return (
      <Link href="/auth/signin" className="btn-ghost">
        Sign in
      </Link>
    )
  }

  const email = session.user?.email || 'Account'
  const avatar = session.user?.image

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 hover:bg-white/5"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatar ? (
          <img src={avatar} alt="avatar" className="h-6 w-6 rounded-full" />
        ) : (
          <div className="h-6 w-6 rounded-full bg-white/10" />
        )}
        <span className="text-sm">{email}</span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M5.25 7.5 10 12.25 14.75 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 z-50 w-56 rounded-2xl border border-white/10 bg-[color:var(--card-bg,rgba(255,255,255,0.04))] backdrop-blur-md shadow-glow p-1"
        >
          <div className="px-3 py-2 text-xs text-brand-muted truncate">
            {session.user?.name || email}
          </div>
          <Link href="/dashboard" className="block px-3 py-2 text-sm hover:bg-white/5 rounded-lg">
            Dashboard
          </Link>
          <Link href="/profile" className="block px-3 py-2 text-sm hover:bg-white/5 rounded-lg">
            Profile
          </Link>
          <Link href="/billing" className="block px-3 py-2 text-sm hover:bg-white/5 rounded-lg">
            Billing
          </Link>
          <Link href="/settings" className="block px-3 py-2 text-sm hover:bg-white/5 rounded-lg">
            Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 rounded-lg"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
