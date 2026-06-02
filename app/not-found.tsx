import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-bold text-[color:var(--gold)] opacity-30 select-none">404</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="text-brand-muted text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-gold text-sm px-5 py-2.5">
            Go to dashboard
          </Link>
          <Link href="/" className="btn-ghost text-sm px-5 py-2.5">
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
