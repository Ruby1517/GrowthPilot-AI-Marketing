export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Autopilot from '@/models/Autopilot'
import User from '@/models/User'
import { firstRunDate } from '@/lib/agent/autopilot'

const PatchBody = z.object({
  name:     z.string().min(1).max(120).optional(),
  brief:    z.string().min(10).max(2000).optional(),
  company:  z.string().max(200).optional(),
  audience: z.string().max(500).optional(),
  cadence:  z.enum(['daily','weekly','biweekly','monthly']).optional(),
  hour:     z.number().int().min(0).max(23).optional(),
  status:   z.enum(['active','paused']).optional(),
})

async function getOrgId(email: string): Promise<string | null> {
  const me = await User.findOne({ email }).lean<{ orgId?: any }>()
  return me?.orgId ? String(me.orgId) : null
}

// ── PATCH — update or pause/resume ───────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = PatchBody.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  await dbConnect()
  const orgId = await getOrgId(session.user.email)
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const update: Record<string, any> = { ...parsed.data }

  // Reactivating: reset nextRunAt so it runs on schedule again
  if (parsed.data.status === 'active') {
    const doc = await Autopilot.findOne({ _id: params.id, orgId }).lean()
    if (doc) update.nextRunAt = firstRunDate(parsed.data.hour ?? doc.hour)
  }

  // Cadence or hour changed: recalculate next run
  if ((parsed.data.cadence || parsed.data.hour !== undefined) && !update.nextRunAt) {
    const doc = await Autopilot.findOne({ _id: params.id, orgId }).lean()
    if (doc) {
      update.nextRunAt = firstRunDate(parsed.data.hour ?? doc.hour)
    }
  }

  const doc = await Autopilot.findOneAndUpdate(
    { _id: params.id, orgId },
    { $set: update },
    { new: true }
  )

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

// ── DELETE — remove autopilot ─────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await dbConnect()
  const orgId = await getOrgId(session.user.email)
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  await Autopilot.deleteOne({ _id: params.id, orgId })
  return NextResponse.json({ ok: true })
}
