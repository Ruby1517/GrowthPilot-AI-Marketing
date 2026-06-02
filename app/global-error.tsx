'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global error]', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#060c1a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Application error
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              A critical error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            {error.digest && (
              <p style={{ color: '#475569', fontSize: '0.7rem', fontFamily: 'monospace', marginBottom: '1rem' }}>
                {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                background: '#D4AF37', color: '#000', border: 'none',
                padding: '0.625rem 1.5rem', borderRadius: '0.75rem',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
