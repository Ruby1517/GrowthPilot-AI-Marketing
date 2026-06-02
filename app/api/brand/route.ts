export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import { Org } from '@/models/Org'
import User from '@/models/User'

const BrandVoiceSchema = z.object({
  companyName:        z.string().max(200).optional(),
  productDescription: z.string().max(1000).optional(),
  targetAudience:     z.string().max(500).optional(),
  toneOfVoice:        z.string().max(100).optional(),
  brandKeywords:      z.array(z.string().max(60)).max(20).optional(),
  bannedWords:        z.array(z.string().max(60)).max(20).optional(),
  contentGoals:       z.array(z.string().max(60)).max(10).optional(),
  writingStyle:       z.string().max(500).optional(),
  competitors:        z.array(z.string().max(100)).max(10).optional(),
})

async function getOrgId(email: string) {
  const me = await User.findOne({ email }).lean<{ orgId?: any }>()
  return me?.orgId ? String(me.orgId) : null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await dbConnect()
  const orgId = await getOrgId(session.user.email)
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const org = await Org.findById(orgId).lean<{ brandVoice?: any }>()
  return NextResponse.json({ brandVoice: org?.brandVoice ?? {} })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BrandVoiceSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  await dbConnect()
  const orgId = await getOrgId(session.user.email)
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  await Org.findByIdAndUpdate(orgId, { $set: { brandVoice: parsed.data } })
  return NextResponse.json({ ok: true })
}
