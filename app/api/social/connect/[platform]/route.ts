export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { randomBytes, createHash } from 'crypto'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

function callbackUrl(platform: string) {
  return `${APP_URL}/api/social/callback/${platform}`
}

function linkedinAuthUrl(state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri:  callbackUrl('linkedin'),
    state,
    scope:         'openid profile w_member_social',
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}

function twitterAuthUrl(state: string, codeChallenge: string) {
  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             process.env.TWITTER_CLIENT_ID!,
    redirect_uri:          callbackUrl('twitter'),
    scope:                 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  })
  return `https://twitter.com/i/oauth2/authorize?${params}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { platform } = params
  if (platform !== 'linkedin' && platform !== 'twitter') {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  }

  const state = randomBytes(16).toString('hex')
  let authUrl: string
  let cookieExtra = ''

  if (platform === 'linkedin') {
    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
      return NextResponse.json({ error: 'LinkedIn app not configured' }, { status: 503 })
    }
    authUrl = linkedinAuthUrl(state)
  } else {
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Twitter app not configured' }, { status: 503 })
    }
    // PKCE
    const verifier  = randomBytes(32).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    cookieExtra     = `; gp_pkce_${state}=${verifier}`
    authUrl = twitterAuthUrl(state, challenge)
  }

  const res = NextResponse.redirect(authUrl)
  res.headers.append(
    'Set-Cookie',
    `gp_oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax${cookieExtra}`
  )
  if (cookieExtra) {
    const [, pkce] = cookieExtra.split('; ')
    res.headers.append('Set-Cookie', `${pkce}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`)
  }
  return res
}
