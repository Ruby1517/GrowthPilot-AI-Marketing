import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that require authentication
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
]

// Sub-paths inside PROTECTED_PREFIXES that are publicly accessible
const PUBLIC_EXCEPTIONS = [
  '/leadpilot/embed',
]

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Allow public exceptions through unconditionally
  if (PUBLIC_EXCEPTIONS.some(e => path === e || path.startsWith(e + '?') || path.startsWith(e + '/'))) {
    return NextResponse.next()
  }

  const isProtected = PROTECTED_PREFIXES.some(p => path === p || path.startsWith(p + '/'))
  if (!isProtected) return NextResponse.next()

  // Read JWT directly from cookie — no DB call, fully Edge-compatible
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  const token = await getToken({ req, secret })
  const isLoggedIn = !!token

  if (!isLoggedIn) {
    const signIn = new URL('/auth/signin', req.nextUrl)
    signIn.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(signIn)
  }

  // Block /admin for non-superadmins (platformRole is embedded in JWT by the jwt callback)
  if (path.startsWith('/admin') && (token as any).platformRole !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip static assets, Next.js internals, and API routes (those self-protect)
    '/((?!_next/static|_next/image|favicon|robots|sitemap|manifest|icons|images|api/).*)',
  ],
}
