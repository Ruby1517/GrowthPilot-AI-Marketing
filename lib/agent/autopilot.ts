import type { Cadence } from '@/models/Autopilot'

// ── Schedule computation ──────────────────────────────────────────────────────

/**
 * Given a cadence and a base date, return the next Date the autopilot should run.
 * The hour is always set to the stored UTC hour.
 */
export function computeNextRun(cadence: Cadence, from: Date = new Date(), hour = 9): Date {
  const d = new Date(from)
  d.setUTCHours(hour, 0, 0, 0)

  switch (cadence) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + 1)
      break
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7)
      break
    case 'biweekly':
      d.setUTCDate(d.getUTCDate() + 14)
      break
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + 1)
      break
  }

  return d
}

/**
 * First run time: today at the given hour, or tomorrow if that hour already passed.
 */
export function firstRunDate(hour = 9): Date {
  const now = new Date()
  const d   = new Date(now)
  d.setUTCHours(hour, 0, 0, 0)
  if (d <= now) d.setUTCDate(d.getUTCDate() + 1)
  return d
}

// ── Run due autopilots ────────────────────────────────────────────────────────

/**
 * Called by the worker every 15 minutes.
 * Finds all active autopilots whose nextRunAt has passed and runs the Campaign Agent for each.
 */
export async function runDueAutopilots(): Promise<{ ran: number; errors: number }> {
  const { dbConnect }  = await import('@/lib/db')
  const { default: Autopilot } = await import('@/models/Autopilot')
  const { default: AgentJob }  = await import('@/models/AgentJob')
  const { runAgentLoop }       = await import('@/lib/agent/loop')

  await dbConnect()

  const now = new Date()
  const due = await Autopilot.find({ status: 'active', nextRunAt: { $lte: now } }).limit(20)

  let ran = 0, errors = 0

  for (const ap of due) {
    // Lock it immediately to avoid duplicate runs if the worker fires twice
    const locked = await Autopilot.findOneAndUpdate(
      { _id: ap._id, nextRunAt: { $lte: now }, status: 'active' },
      { $set: { nextRunAt: computeNextRun(ap.cadence, now, ap.hour) } },
      { new: false }
    )
    if (!locked) continue   // another worker beat us to it

    try {
      console.log(`[autopilot] running ${ap._id} (${ap.name})`)

      // Create AgentJob record
      const job = await AgentJob.create({
        orgId:    ap.orgId,
        userId:   ap.userId,
        brief:    ap.brief,
        company:  ap.company,
        audience: ap.audience,
        status:   'running',
        steps:    [],
      })

      const jobId = (job._id as any).toString() as string

      // Run the Campaign Agent
      const result = await runAgentLoop(ap.brief, {
        company:  ap.company,
        audience: ap.audience,
        onStep: async (step) => {
          if (step.status === 'running') {
            await AgentJob.findByIdAndUpdate(jobId, {
              $push: { steps: { ...step, startedAt: new Date() } },
            })
          } else {
            await AgentJob.updateOne(
              { _id: jobId, 'steps.tool': step.tool },
              { $set: {
                'steps.$.status':      step.status,
                'steps.$.output':      step.output,
                'steps.$.error':       step.error,
                'steps.$.completedAt': new Date(),
              }}
            )
          }
        },
      })

      await AgentJob.findByIdAndUpdate(jobId, {
        status:  'done',
        summary: result.summary,
      })

      await Autopilot.findByIdAndUpdate(ap._id, {
        lastRunAt: now,
        lastJobId: jobId,
        $inc: { runCount: 1 },
      })

      console.log(`[autopilot] done ${ap._id}, next: ${computeNextRun(ap.cadence, now, ap.hour).toISOString()}`)
      ran++
    } catch (e: any) {
      console.error(`[autopilot] error ${ap._id}:`, e?.message)
      await Autopilot.findByIdAndUpdate(ap._id, { status: 'paused' })
      errors++
    }
  }

  return { ran, errors }
}
