export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Autopilot from '@/models/Autopilot'
import User from '@/models/User'
import { firstRunDate } from '@/lib/agent/autopilot'
import type { Cadence } from '@/models/Autopilot'

const CreateBody = z.object({
  name:     z.string().min(1).max(120),
  brief:    z.string().min(10).max(2000),
  company:  z.string().max(200).optional(),
  audience: z.string().max(500).optional(),
  cadence:  z.enum(['daily','weekly','biweekly','monthly']),
  hour:     z.number().int().min(0).max(23).default(9),
})

// ── GET — list org's autopilots ───────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await dbConnect()
  const me = await User.findOne({ email: session.user.email }).lean<{ orgId?: any }>()
  if (!me?.orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const docs = await Autopilot.find({ orgId: me.orgId }).sort({ createdAt: -1 }).lean()
  return NextResponse.json({ items: docs.map(d => ({
    id:         (d._id as any).toString(),
    name:       d.name,
    brief:      d.brief,
    company:    d.company,
    audience:   d.audience,
    cadence:    d.cadence,
    hour:       d.hour,
    status:     d.status,
    nextRunAt:  d.nextRunAt,
    lastRunAt:  d.lastRunAt,
    lastJobId:  d.lastJobId,
    runCount:   d.runCount,
    createdAt:  d.createdAt,
  })) })
}

// ── POST — create autopilot ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CreateBody.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })

  await dbConnect()
  const me = await User.findOne({ email: session.user.email }).lean<{ _id: any; orgId?: any }>()
  if (!me?.orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const { name, brief, company, audience, cadence, hour } = parsed.data

  const doc = await Autopilot.create({
    orgId:     me.orgId,
    userId:    me._id,
    name,
    brief,
    company,
    audience,
    cadence:   cadence as Cadence,
    hour,
    status:    'active',
    nextRunAt: firstRunDate(hour),
    runCount:  0,
  })

  return NextResponse.json({ id: (doc._id as any).toString() }, { status: 201 })
}
