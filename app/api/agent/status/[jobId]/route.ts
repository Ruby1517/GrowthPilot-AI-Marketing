export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import AgentJob from '@/models/AgentJob'
import User from '@/models/User'

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await dbConnect()

  const me = await User.findOne({ email: session.user.email }).lean<{ orgId?: any }>()
  if (!me?.orgId) {
    return NextResponse.json({ error: 'No org' }, { status: 400 })
  }

  const job = await AgentJob.findOne({
    _id:   params.jobId,
    orgId: me.orgId,
  }).lean()

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    id:       job._id.toString(),
    status:   job.status,
    brief:    job.brief,
    company:  job.company,
    audience: job.audience,
    steps:    job.steps,
    summary:  job.summary,
    error:    job.error,
    createdAt: job.createdAt,
  })
}
