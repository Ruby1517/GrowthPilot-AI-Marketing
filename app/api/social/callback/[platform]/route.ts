export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import SocialAccount from '@/models/SocialAccount'
import User from '@/models/User'
import { encrypt } from '@/lib/social/encrypt'
import { linkedinGetUser } from '@/lib/social/linkedin'
import { twitterGetUser } from '@/lib/social/twitter'
import mongoose from 'mongoose'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

function callbackUrl(platform: string) {
  return `${APP_URL}/api/social/callback/${platform}`
}

function getCookies(req: NextRequest): Record<string, string> {
  const raw = req.headers.get('cookie') || ''
  return Object.fromEntries(raw.split(';').map(c => {
    const [k, ...v] = c.trim().split('=')
    return [k.trim(), v.join('=')]
  }))
}

async function exchangeLinkedIn(code: string): Promise<{ access_token: string; expires_in?: number; refresh_token?: string }> {
  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  callbackUrl('linkedin'),
    client_id:     process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  })
  const r = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params,
  })
  if (!r.ok) throw new Error(`LinkedIn token exchange failed: ${await r.text()}`)
  return r.json()
}

async function exchangeTwitter(code: string, verifier: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number; scope?: string }> {
  const creds = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')
  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  callbackUrl('twitter'),
    code_verifier: verifier,
  })
  const r = await fetch('https://api.twitter.com/2/oauth2/token', {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  if (!r.ok) throw new Error(`Twitter token exchange failed: ${await r.text()}`)
  return r.json()
}

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { platform } = params
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.redirect(`${APP_URL}/auth/signin`)
  }

  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(`${APP_URL}/settings/social?error=oauth_denied`)
  }

  const cookies = getCookies(req)
  if (cookies['gp_oauth_state'] !== state) {
    return NextResponse.redirect(`${APP_URL}/settings/social?error=invalid_state`)
  }

  try {
    let accessToken: string
    let refreshToken: string | undefined
    let expiresAt: Date | undefined
    let scope = ''
    let platformUser: { id: string; name: string; username: string }

    if (platform === 'linkedin') {
      const tokens = await exchangeLinkedIn(code)
      accessToken  = tokens.access_token
      refreshToken = tokens.refresh_token
      expiresAt    = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined
      platformUser = await linkedinGetUser(accessToken)
      scope        = 'openid profile w_member_social'
    } else if (platform === 'twitter') {
      const verifier = cookies[`gp_pkce_${state}`]
      if (!verifier) return NextResponse.redirect(`${APP_URL}/settings/social?error=missing_pkce`)
      const tokens = await exchangeTwitter(code, verifier)
      accessToken  = tokens.access_token
      refreshToken = tokens.refresh_token
      expiresAt    = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined
      scope        = tokens.scope || ''
      platformUser = await twitterGetUser(accessToken)
    } else {
      return NextResponse.redirect(`${APP_URL}/settings/social?error=unknown_platform`)
    }

    await dbConnect()
    const me = await User.findOne({ email: session.user.email }).lean<{ _id: any; orgId?: any }>()
    if (!me?.orgId) return NextResponse.redirect(`${APP_URL}/settings/social?error=no_org`)

    const orgId  = new mongoose.Types.ObjectId(String(me.orgId))
    const userId = new mongoose.Types.ObjectId(String(me._id))

    await SocialAccount.findOneAndUpdate(
      { orgId, platform },
      {
        $set: {
          orgId,
          userId,
          platform,
          platformUserId:   platformUser.id,
          platformUsername: platformUser.username,
          displayName:      platformUser.name,
          accessToken:      encrypt(accessToken),
          refreshToken:     refreshToken ? encrypt(refreshToken) : undefined,
          expiresAt,
          scope,
          connectedAt:      new Date(),
        },
      },
      { upsert: true, new: true }
    )

    const res = NextResponse.redirect(`${APP_URL}/settings/social?connected=${platform}`)
    // Clear OAuth cookies
    res.headers.append('Set-Cookie', `gp_oauth_state=; HttpOnly; Path=/; Max-Age=0`)
    res.headers.append('Set-Cookie', `gp_pkce_${state}=; HttpOnly; Path=/; Max-Age=0`)
    return res

  } catch (e: any) {
    console.error(`[social/callback/${platform}]`, e?.message)
    return NextResponse.redirect(`${APP_URL}/settings/social?error=${encodeURIComponent(e?.message || 'unknown')}`)
  }
}
