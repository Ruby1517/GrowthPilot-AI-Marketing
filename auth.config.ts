// Edge-compatible auth config — no DB imports, no Node.js APIs.
// Used exclusively by middleware.ts which runs on the Edge Runtime.
// The full auth config (with DB, OAuth providers) lives in lib/auth.ts.

import type { NextAuthConfig } from 'next-auth'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/agent',
  '/postpilot',
  '/blogpilot',
  '/adpilot',
  '/leadpilot',
  '/mailpilot',
  '/autopilot',
  '/brand',
  '/settings',
  '/profile',
  '/billing',
  '/assets',
  '/jobs',
  '/invite',
  '/upload',
  '/onboarding',
]

const PUBLIC_EXCEPTIONS = [
  '/leadpilot/embed',
]

export const authConfig: NextAuthConfig = {
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt' },
  providers: [], // providers handled in lib/auth.ts, not needed here
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const path      = nextUrl.pathname
      const isLoggedIn = !!auth?.user

      // Always allow public exceptions
      if (PUBLIC_EXCEPTIONS.some(e => path === e || path.startsWith(e + '/'))) {
        return true
      }

      const isProtected = PROTECTED_PREFIXES.some(
        p => path === p || path.startsWith(p + '/')
      )

      // Not a protected route — allow through
      if (!isProtected) return true

      // Protected and logged in — allow through
      if (isLoggedIn) return true

      // Protected and NOT logged in — redirect to sign-in
      const signIn = new URL('/auth/signin', nextUrl)
      signIn.searchParams.set('callbackUrl', path)
      return Response.redirect(signIn)
    },
  },
}
