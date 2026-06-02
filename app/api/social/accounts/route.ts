export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import SocialAccount from '@/models/SocialAccount'
import User from '@/models/User'
import mongoose from 'mongoose'

async function getOrgId(email: string) {
  const me = await User.findOne({ email }).lean<{ orgId?: any }>()
  return me?.orgId ? String(me.orgId) : null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await dbConnect()
  const orgId = await getOrgId(session.user.email)
  if (!orgId) return NextResponse.json({ accounts: [] })

  const accounts = await SocialAccount.find({ orgId: new mongoose.Types.ObjectId(orgId) })
    .lean()
    .select('-accessToken -refreshToken')

  return NextResponse.json({
    accounts: accounts.map(a => ({
      platform:         a.platform,
      displayName:      a.displayName,
      platformUsername: a.platformUsername,
      connectedAt:      a.connectedAt,
      expiresAt:        a.expiresAt,
    })),
  })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform } = await req.json()
  if (!platform) return NextResponse.json({ error: 'platform required' }, { status: 400 })

  await dbConnect()
  const orgId = await getOrgId(session.user.email)
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  await SocialAccount.deleteOne({ orgId: new mongoose.Types.ObjectId(orgId), platform })
  return NextResponse.json({ ok: true })
}
