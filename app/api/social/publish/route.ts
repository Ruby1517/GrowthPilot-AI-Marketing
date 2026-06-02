export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import SocialAccount from '@/models/SocialAccount'
import User from '@/models/User'
import { decrypt } from '@/lib/social/encrypt'
import { linkedinPublish } from '@/lib/social/linkedin'
import { twitterPublish, buildTweetText } from '@/lib/social/twitter'
import mongoose from 'mongoose'

const Body = z.object({
  platform: z.enum(['linkedin', 'twitter']),
  caption:  z.string().min(1).max(3000),
  hashtags: z.array(z.string()).optional().default([]),
})

async function getOrgId(email: string) {
  const me = await User.findOne({ email }).lean<{ orgId?: any }>()
  return me?.orgId ? String(me.orgId) : null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { platform, caption, hashtags } = parsed.data

  await dbConnect()
  const orgId = await getOrgId(session.user.email)
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const account = await SocialAccount.findOne({
    orgId: new mongoose.Types.ObjectId(orgId),
    platform,
  })

  if (!account) {
    return NextResponse.json({ error: `${platform} not connected` }, { status: 400 })
  }

  let accessToken: string
  try {
    accessToken = decrypt(account.accessToken)
  } catch {
    return NextResponse.json({ error: 'Token decryption failed — please reconnect your account' }, { status: 400 })
  }

  try {
    if (platform === 'linkedin') {
      const authorUrn = `urn:li:person:${account.platformUserId}`
      const text = hashtags.length
        ? `${caption}\n\n${hashtags.slice(0, 5).map(h => `#${h}`).join(' ')}`
        : caption
      const result = await linkedinPublish(accessToken, authorUrn, text)
      return NextResponse.json({ ok: true, platform, postId: result.postId })
    }

    if (platform === 'twitter') {
      const text   = buildTweetText(caption, hashtags)
      const result = await twitterPublish(accessToken, text)
      return NextResponse.json({ ok: true, platform, tweetId: result.tweetId })
    }

    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
  } catch (e: any) {
    console.error(`[social/publish/${platform}]`, e?.message)
    return NextResponse.json({ error: e?.message || 'Publish failed' }, { status: 502 })
  }
}
