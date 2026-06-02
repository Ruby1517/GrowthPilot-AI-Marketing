export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import { agentQueue } from '@/lib/queue'
import AgentJob from '@/models/AgentJob'
import User from '@/models/User'
import { safeLimitPerOrg } from '@/lib/ratelimit'

const Body = z.object({
  brief:    z.string().min(10).max(2000),
  company:  z.string().max(200).optional(),
  audience: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  await dbConnect()

  const me = await User.findOne({ email: session.user.email }).lean<{ _id: any; orgId?: any }>()
  if (!me?.orgId) {
    return NextResponse.json({ error: 'No org found — complete onboarding first.' }, { status: 400 })
  }

  const orgId = String(me.orgId)
  const rl = await safeLimitPerOrg(orgId)
  if (!rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) },
    })
  }

  const { brief, company, audience } = parsed.data

  const job = await AgentJob.create({
    orgId:    me.orgId,
    userId:   me._id,
    brief,
    company,
    audience,
    status:   'queued',
    steps:    [],
  })

  const jobId = (job._id as any).toString() as string

  if (agentQueue) {
    await agentQueue.add(
      'run',
      { jobId },
      { attempts: 1, removeOnComplete: 100, removeOnFail: 50 }
    )
  } else {
    // No Redis — run inline (dev fallback, blocks the request ~30s)
    const { runAgentLoop } = await import('@/lib/agent/loop')
    await AgentJob.findByIdAndUpdate(jobId, { status: 'running' })
    try {
      const result = await runAgentLoop(brief, {
        company,
        audience,
        onStep: async (step) => {
          if (step.status === 'running') {
            await AgentJob.findByIdAndUpdate(jobId, {
              $push: { steps: { ...step, startedAt: new Date() } },
            })
          } else {
            await AgentJob.updateOne(
              { _id: jobId, 'steps.tool': step.tool },
              { $set: { 'steps.$.status': step.status, 'steps.$.output': step.output, 'steps.$.error': step.error, 'steps.$.completedAt': new Date() } }
            )
          }
        },
      })
      await AgentJob.findByIdAndUpdate(jobId, { status: 'done', summary: result.summary })
    } catch (e: any) {
      await AgentJob.findByIdAndUpdate(jobId, { status: 'failed', error: (e as any)?.message })
    }
  }

  return NextResponse.json({ jobId })
}
