'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error tracking (Sentry picks this up automatically if configured)
    console.error('[page error]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-5xl select-none">⚠️</div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-brand-muted text-sm">
            An unexpected error occurred. We&apos;ve been notified and are looking into it.
          </p>
          {error.digest && (
            <p className="text-[11px] text-brand-muted font-mono opacity-50">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-gold text-sm px-5 py-2.5">
            Try again
          </button>
          <a href="/dashboard" className="btn-ghost text-sm px-5 py-2.5">
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
