import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

// Use the edge-compatible auth config (no DB, no Node.js APIs).
// Route protection logic lives in authConfig.callbacks.authorized.
export default NextAuth(authConfig).auth

export const config = {
  matcher: [
    // Run on all routes except static assets, Next.js internals, and API routes.
    // API routes self-protect with their own auth() checks.
    '/((?!_next/static|_next/image|favicon|robots|sitemap|manifest|icons|images|api/).*)',
  ],
}
